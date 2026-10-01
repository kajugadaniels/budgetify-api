import { Injectable } from '@nestjs/common';
import { User, UserStatus } from '@prisma/client';

import { assertUserCanAuthenticate } from '../policies/user-authentication.policy';
import {
  UpsertGoogleUserInput,
  UserPrismaExecutor,
} from '../types/user-service.types';
import { UsersRepository } from '../users.repository';

@Injectable()
export class UserProvisioningService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createFromGoogleProfile(
    profile: UpsertGoogleUserInput,
    db?: UserPrismaExecutor,
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

  async createFromEmailVerification(
    email: string,
    db?: UserPrismaExecutor,
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
    db?: UserPrismaExecutor,
  ): Promise<User> {
    assertUserCanAuthenticate(user);

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
}
