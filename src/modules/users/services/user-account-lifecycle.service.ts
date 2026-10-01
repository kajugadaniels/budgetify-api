import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { assertUserCanAuthenticate } from '../policies/user-authentication.policy';
import { UserAccountDeletionRepository } from '../repositories/user-account-deletion.repository';
import {
  UserAccountLifecycleOptions,
  UserPrismaExecutor,
} from '../types/user-service.types';
import { UsersRepository } from '../users.repository';

const ACCOUNT_DELETION_GRACE_DAYS = 30;

const ACCOUNT_DELETION_GRACE_MS =
  ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class UserAccountLifecycleService {
  private readonly logger = new Logger(UserAccountLifecycleService.name);

  constructor(
    private readonly usersRepository: UsersRepository,

    private readonly accountDeletionRepository: UserAccountDeletionRepository,

    private readonly prisma: PrismaService,

    private readonly emailService: EmailService,
  ) {}

  async resolve(
    user: User,
    options: UserAccountLifecycleOptions = {},
  ): Promise<User | null> {
    if (user.deletedAt) {
      return null;
    }

    const scheduledFor = user.accountDeletionScheduledFor;

    if (!scheduledFor) {
      return user;
    }

    const now = new Date();

    if (scheduledFor <= now) {
      await this.finalizeAccountDeletion(user.id, now, options.db);

      return null;
    }

    if (!options.cancelPendingDeletionOnActivity) {
      return user;
    }

    return this.usersRepository.update(
      user.id,
      {
        accountDeletionRequestedAt: null,

        accountDeletionScheduledFor: null,
      },
      options.db,
    );
  }

  async requestAccountDeletion(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);

    const activeUser = user ? await this.resolve(user) : null;

    if (!activeUser) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    assertUserCanAuthenticate(activeUser);

    const now = new Date();

    if (
      activeUser.accountDeletionScheduledFor &&
      activeUser.accountDeletionScheduledFor > now
    ) {
      return activeUser;
    }

    const scheduledFor = new Date(now.getTime() + ACCOUNT_DELETION_GRACE_MS);

    const updatedUser = await this.usersRepository.update(activeUser.id, {
      accountDeletionRequestedAt: now,

      accountDeletionScheduledFor: scheduledFor,
    });

    try {
      await this.emailService.sendAccountDeletionRequestEmail(
        updatedUser.email,
        updatedUser.firstName ?? updatedUser.fullName ?? null,
        scheduledFor,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send account deletion request email to ${updatedUser.email}: ${String(error)}`,
      );
    }

    return updatedUser;
  }

  async processDueAccountDeletionBatch(limit = 100): Promise<number> {
    const dueIds = await this.accountDeletionRepository.findIdsDueForDeletion(
      new Date(),
      limit,
    );

    for (const userId of dueIds) {
      await this.finalizeAccountDeletion(userId);
    }

    return dueIds.length;
  }

  async finalizeAccountDeletion(
    userId: string,
    deletedAt = new Date(),
    db?: UserPrismaExecutor,
  ): Promise<void> {
    const execute = async (executor: UserPrismaExecutor): Promise<void> => {
      const user = await this.usersRepository.findById(userId, executor);

      if (!user || user.deletedAt) {
        return;
      }

      await this.accountDeletionRepository.revokeSessions(
        user.id,
        deletedAt,
        executor,
      );

      await this.accountDeletionRepository.revokePartnerships(
        user.id,
        executor,
      );

      await this.usersRepository.update(
        user.id,
        {
          status: UserStatus.DISABLED,

          deletedAt,

          accountDeletionRequestedAt: null,

          accountDeletionScheduledFor: null,
        },
        executor,
      );
    };

    if (db) {
      await execute(db);

      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await execute(tx);
    });
  }
}
