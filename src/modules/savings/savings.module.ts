import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { SavingsController } from './savings.controller';
import { SavingsRepository } from './savings.repository';
import { SavingsService } from './savings.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UsersModule],
  controllers: [SavingsController],
  providers: [SavingsRepository, SavingsService, JwtAuthGuard],
  exports: [SavingsService],
})
export class SavingsModule {}
