import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionAnalyticsService } from './services/transaction-analytics.service';
import { TransactionFeeCalculatorService } from './services/transaction-fee-calculator.service';
import { TransactionAnalyticsRepository } from './transaction-analytics.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [TransactionsController],

  providers: [
    TransactionsRepository,
    TransactionAnalyticsRepository,
    TransactionsService,
    TransactionAnalyticsService,
    TransactionFeeCalculatorService,
    JwtAuthGuard,
  ],

  exports: [
    TransactionsService,
    TransactionAnalyticsService,
    TransactionFeeCalculatorService,
  ],
})
export class TransactionsModule {}
