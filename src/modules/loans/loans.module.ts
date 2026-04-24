import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrencyModule } from '../currency/currency.module';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { PartnershipsModule } from '../partnerships/partnerships.module';
import { UsersModule } from '../users/users.module';
import { LoansController } from './loans.controller';
import { LoansRepository } from './loans.repository';
import { LoansService } from './loans.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CurrencyModule,
    UsersModule,
    PartnershipsModule,
  ],
  controllers: [LoansController],
  providers: [LoansRepository, ExpensesRepository, LoansService, JwtAuthGuard],
  exports: [LoansService],
})
export class LoansModule {}
