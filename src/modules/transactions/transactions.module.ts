import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionAnalyticsService } from './services/transaction-analytics.service';
import { TransactionFeeCalculatorService } from './services/transaction-fee-calculator.service';
import { TransactionAnalyticsRepository } from './transaction-analytics.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';
import { TransactionHistoryService } from './services/transaction-history.service';
import { TransactionHistoryRepository } from './transaction-history.repository';

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
    TransactionHistoryRepository,
    TransactionsService,
    TransactionAnalyticsService,
    TransactionHistoryService,
    TransactionFeeCalculatorService,
    JwtAuthGuard,
  ],

  exports: [
    TransactionsService,
    TransactionAnalyticsService,
    TransactionHistoryService,
    TransactionFeeCalculatorService,
  ],
})
export class TransactionsModule {}
