import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrencyModule } from '../currency/currency.module';
import { IncomeModule } from '../income/income.module';
import { PartnershipsModule } from '../partnerships/partnerships.module';
import { UsersModule } from '../users/users.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';
import { MobileMoneyTariffService } from './mobile-money-tariff.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    CurrencyModule,
    forwardRef(() => IncomeModule),
    UsersModule,
    PartnershipsModule,
  ],
  controllers: [ExpensesController],
  providers: [
    ExpensesRepository,
    ExpensesService,
    MobileMoneyTariffService,
    JwtAuthGuard,
  ],
  exports: [ExpensesService, ExpensesRepository],
})
export class ExpensesModule {}
