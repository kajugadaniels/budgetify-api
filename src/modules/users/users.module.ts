import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { UserAccountDeletionRepository } from './repositories/user-account-deletion.repository';
import { AccountDeletionLifecycleService } from './services/account-deletion-lifecycle.service';
import { UserAccountLifecycleService } from './services/user-account-lifecycle.service';
import { UserProfileService } from './services/user-profile.service';
import { UserProvisioningService } from './services/user-provisioning.service';
import { UserQueryService } from './services/user-query.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    EmailModule,
  ],

  controllers: [UsersController],

  providers: [
    UsersRepository,

    UserAccountDeletionRepository,

    UserAccountLifecycleService,

    UserQueryService,

    UserProvisioningService,

    UserProfileService,

    UsersService,

    AccountDeletionLifecycleService,

    JwtAuthGuard,
  ],

  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
