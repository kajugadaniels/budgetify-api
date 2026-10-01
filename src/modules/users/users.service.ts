import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { UpdateUserProfileRequestDto } from './dto/update-user-profile.request.dto';
import { UserEntity } from './entities/user.entity';
import { UserAccountLifecycleService } from './services/user-account-lifecycle.service';
import { UserProfileService } from './services/user-profile.service';
import { UserProvisioningService } from './services/user-provisioning.service';
import { UserQueryService } from './services/user-query.service';
import {
  UpsertGoogleUserInput,
  UserPrismaExecutor,
} from './types/user-service.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly userQueryService: UserQueryService,

    private readonly userProvisioningService: UserProvisioningService,

    private readonly userProfileService: UserProfileService,

    private readonly accountLifecycleService: UserAccountLifecycleService,
  ) {}

  findActiveByIdOrThrow(
    id: string,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    return this.userQueryService.findActiveByIdOrThrow(id, db);
  }

  findActiveByEmail(
    email: string,
    db?: UserPrismaExecutor,
    options?: {
      cancelPendingDeletionOnActivity?: boolean;
    },
  ): Promise<User | null> {
    return this.userQueryService.findActiveByEmail(email, db, options);
  }

  recordAuthenticatedActivityOrThrow(
    id: string,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    return this.userQueryService.recordAuthenticatedActivityOrThrow(id, db);
  }

  createFromGoogleProfile(
    profile: UpsertGoogleUserInput,
    db?: UserPrismaExecutor,
  ): Promise<User> {
    return this.userProvisioningService.createFromGoogleProfile(profile, db);
  }

  createFromEmailVerification(
    email: string,
    db?: UserPrismaExecutor,
  ): Promise<User> {
    return this.userProvisioningService.createFromEmailVerification(email, db);
  }

  updateFromGoogleLogin(
    user: User,
    profile: UpsertGoogleUserInput,
    db?: UserPrismaExecutor,
  ): Promise<User> {
    return this.userProvisioningService.updateFromGoogleLogin(
      user,
      profile,
      db,
    );
  }

  updateProfileNames(
    userId: string,
    payload: UpdateUserProfileRequestDto,
    db?: UserPrismaExecutor,
  ): Promise<UserEntity> {
    return this.userProfileService.updateProfileNames(userId, payload, db);
  }

  requestAccountDeletion(userId: string): Promise<UserEntity> {
    return this.accountLifecycleService.requestAccountDeletion(userId);
  }

  processDueAccountDeletionBatch(limit = 100): Promise<number> {
    return this.accountLifecycleService.processDueAccountDeletionBatch(limit);
  }

  finalizeAccountDeletion(
    userId: string,
    deletedAt = new Date(),
    db?: UserPrismaExecutor,
  ): Promise<void> {
    return this.accountLifecycleService.finalizeAccountDeletion(
      userId,
      deletedAt,
      db,
    );
  }
}
