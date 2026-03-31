import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AvatarImageStorageService } from './services/avatar-image-storage.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    UsersService,
    AvatarImageStorageService,
    JwtAuthGuard,
  ],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
