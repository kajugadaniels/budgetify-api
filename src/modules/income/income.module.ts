import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrencyModule } from '../currency/currency.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { PartnershipsModule } from '../partnerships/partnerships.module';
import { SavingsModule } from '../savings/savings.module';
import { UsersModule } from '../users/users.module';
import { IncomeController } from './income.controller';
import { IncomeRepository } from './income.repository';
import { IncomeService } from './income.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CurrencyModule,
    forwardRef(() => ExpensesModule),
    UsersModule,
    PartnershipsModule,
    forwardRef(() => SavingsModule),
  ],
  controllers: [IncomeController],
  providers: [IncomeRepository, IncomeService, JwtAuthGuard],
  exports: [IncomeService],
})
export class IncomeModule {}
