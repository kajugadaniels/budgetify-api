import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import {
  AvatarImageStorageService,
  AvatarUploadFile,
} from './services/avatar-image-storage.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

interface UpsertGoogleUserInput {
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
}

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

const ACCOUNT_DELETION_GRACE_DAYS = 30;
const ACCOUNT_DELETION_GRACE_MS =
  ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly avatarImageStorageService: AvatarImageStorageService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async findActiveByIdOrThrow(
    id: string,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id, db);
    const activeUser = user
      ? await this.applyAccountDeletionLifecycle(user, { db })
      : null;

    if (!activeUser) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    this.assertUserCanAuthenticate(activeUser);

    return activeUser;
  }

  async findActiveByEmail(
    email: string,
    db?: PrismaExecutor,
    options?: {
      cancelPendingDeletionOnActivity?: boolean;
    },
  ): Promise<User | null> {
    const user = await this.usersRepository.findByEmail(email, db);

    if (!user || user.deletedAt) {
      return null;
    }

    const activeUser = await this.applyAccountDeletionLifecycle(user, {
      db,
      cancelPendingDeletionOnActivity:
        options?.cancelPendingDeletionOnActivity ?? false,
    });

    if (!activeUser) {
      return null;
    }

    this.assertUserCanAuthenticate(activeUser);

    return activeUser;
  }

  async recordAuthenticatedActivityOrThrow(
    id: string,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id, db);
    const activeUser = user
      ? await this.applyAccountDeletionLifecycle(user, {
          db,
          cancelPendingDeletionOnActivity: true,
        })
      : null;

    if (!activeUser) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    this.assertUserCanAuthenticate(activeUser);

    return activeUser;
  }

  async createFromGoogleProfile(
    profile: UpsertGoogleUserInput,
    db?: PrismaExecutor,
  ): Promise<User> {
    return this.usersRepository.create(
      {
        email: profile.email.toLowerCase(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
        isEmailVerified: profile.isEmailVerified,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      db,
    );
  }

  /**
   * Creates a new active user from a successfully verified email OTP.
   * The email is marked as verified because the OTP proves ownership.
   * Called inside a Prisma transaction — do not call outside of one.
   */
  async createFromEmailVerification(
    email: string,
    db?: PrismaExecutor,
  ): Promise<User> {
    return this.usersRepository.create(
      {
        email: email.toLowerCase(),
        isEmailVerified: true,
        lastLoginAt: new Date(),
        status: UserStatus.ACTIVE,
      },
      db,
    );
  }

  async updateFromGoogleLogin(
    user: User,
    profile: UpsertGoogleUserInput,
    db?: PrismaExecutor,
  ): Promise<User> {
    this.assertUserCanAuthenticate(user);

    return this.usersRepository.update(
      user.id,
      {
        firstName: profile.firstName ?? user.firstName,
        lastName: profile.lastName ?? user.lastName,
        fullName: profile.fullName ?? user.fullName,
        avatarUrl: profile.avatarUrl ?? user.avatarUrl,
        isEmailVerified: user.isEmailVerified || profile.isEmailVerified,
        lastLoginAt: new Date(),
        accountDeletionRequestedAt: null,
        accountDeletionScheduledFor: null,
      },
      db,
    );
  }

  async updateProfileNames(
    userId: string,
    payload: UpdateUserProfileRequestDto,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    if (payload.firstName === undefined && payload.lastName === undefined) {
      throw new BadRequestException(
        'Provide at least one of firstName or lastName to update.',
      );
    }

    const user = await this.findActiveByIdOrThrow(userId);

    const nextFirstName = payload.firstName ?? user.firstName;
    const nextLastName = payload.lastName ?? user.lastName;

    return this.usersRepository.update(
      user.id,
      {
        firstName: nextFirstName,
        lastName: nextLastName,
        fullName: this.buildFullName(nextFirstName, nextLastName),
      },
      db,
    );
  }

  async updateProfileAvatar(
    userId: string,
    file: AvatarUploadFile | undefined,
    db?: PrismaExecutor,
  ): Promise<UserEntity> {
    if (!file) {
      throw new BadRequestException('Provide a profile image to update.');
    }

    const user = await this.findActiveByIdOrThrow(userId);
    const displayName = user.fullName ?? user.email;
    const uploadedAvatar = await this.avatarImageStorageService.uploadAvatar({
      userId: user.id,
      displayName,
      file,
    });

    return this.usersRepository.update(
      user.id,
      {
        avatarUrl: uploadedAvatar.imageUrl,
      },
      db,
    );
  }

  async requestAccountDeletion(userId: string): Promise<UserEntity> {
    const user = await this.findActiveByIdOrThrow(userId);
    const now = new Date();

    if (
      user.accountDeletionScheduledFor &&
      user.accountDeletionScheduledFor > now
    ) {
      return user;
    }

    const scheduledFor = new Date(now.getTime() + ACCOUNT_DELETION_GRACE_MS);
    const updatedUser = await this.usersRepository.update(user.id, {
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
    const dueIds = await this.usersRepository.findIdsDueForAccountDeletion(
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
    db?: PrismaExecutor,
  ): Promise<void> {
    const execute = async (executor: PrismaExecutor) => {
      const user = await this.usersRepository.findById(userId, executor);

      if (!user || user.deletedAt) {
        return;
      }

      await this.usersRepository.revokeSessionsByUserId(
        user.id,
        deletedAt,
        executor,
      );
      await this.usersRepository.revokePartnershipsByUserId(user.id, executor);
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

  private assertUserCanAuthenticate(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not allowed to sign in.');
    }
  }

  private async applyAccountDeletionLifecycle(
    user: User,
    options?: {
      db?: PrismaExecutor;
      cancelPendingDeletionOnActivity?: boolean;
    },
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
      await this.finalizeAccountDeletion(user.id, now, options?.db);
      return null;
    }

    if (!options?.cancelPendingDeletionOnActivity) {
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

  private buildFullName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
  ): string | null {
    const parts = [firstName, lastName].filter((value): value is string =>
      Boolean(value && value.trim().length > 0),
    );

    return parts.length === 0 ? null : parts.join(' ');
  }
}
