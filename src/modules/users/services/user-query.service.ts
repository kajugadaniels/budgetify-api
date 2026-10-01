import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { UserEntity } from '../entities/user.entity';
import { assertUserCanAuthenticate } from '../policies/user-authentication.policy';
import { UserPrismaExecutor } from '../types/user-service.types';
import { UsersRepository } from '../users.repository';
import { UserAccountLifecycleService } from './user-account-lifecycle.service';

@Injectable()
export class UserQueryService {
  constructor(
    private readonly usersRepository: UsersRepository,

    private readonly accountLifecycleService: UserAccountLifecycleService,
  ) {}

  async findActiveByIdOrThrow(
    id: string,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id, db);

    const activeUser = user
      ? await this.accountLifecycleService.resolve(user, {
          db,
        })
      : null;

    if (!activeUser) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    assertUserCanAuthenticate(activeUser);

    return activeUser;
  }

  async findActiveByEmail(
    email: string,
    db?: UserPrismaExecutor,
    options?: {
      cancelPendingDeletionOnActivity?: boolean;
    },
  ): Promise<User | null> {
    const user = await this.usersRepository.findByEmail(email, db);

    if (!user || user.deletedAt) {
      return null;
    }

    const activeUser = await this.accountLifecycleService.resolve(user, {
      db,

      cancelPendingDeletionOnActivity:
        options?.cancelPendingDeletionOnActivity ?? false,
    });

    if (!activeUser) {
      return null;
    }

    assertUserCanAuthenticate(activeUser);

    return activeUser;
  }

  async recordAuthenticatedActivityOrThrow(
    id: string,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id, db);

    const activeUser = user
      ? await this.accountLifecycleService.resolve(user, {
          db,

          cancelPendingDeletionOnActivity: true,
        })
      : null;

    if (!activeUser) {
      throw new NotFoundException('Authenticated user no longer exists.');
    }

    assertUserCanAuthenticate(activeUser);

    return activeUser;
  }
}
