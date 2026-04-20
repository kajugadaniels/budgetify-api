import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrencyModule } from '../currency/currency.module';
import { PartnershipsModule } from '../partnerships/partnerships.module';
import { UsersModule } from '../users/users.module';
import { SavingsController } from './savings.controller';
import { SavingsRepository } from './savings.repository';
import { SavingsService } from './savings.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CurrencyModule,
    UsersModule,
    PartnershipsModule,
  ],
  controllers: [SavingsController],
  providers: [SavingsRepository, SavingsService, JwtAuthGuard],
  exports: [SavingsService],
})
export class SavingsModule {}
