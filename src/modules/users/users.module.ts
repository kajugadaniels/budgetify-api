import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { AccountDeletionLifecycleService } from './services/account-deletion-lifecycle.service';
import { AvatarImageStorageService } from './services/avatar-image-storage.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), EmailModule],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UsersService,
    AvatarImageStorageService,
    AccountDeletionLifecycleService,
    JwtAuthGuard,
  ],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
