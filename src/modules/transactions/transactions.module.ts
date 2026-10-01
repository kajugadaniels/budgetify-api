import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionEventRepository } from './repositories/transaction-event.repository';
import { TransactionReadRepository } from './repositories/transaction-read.repository';
import { TransactionWriteRepository } from './repositories/transaction-write.repository';
import { TransactionAnalyticsService } from './services/transaction-analytics.service';
import { TransactionCreationService } from './services/transaction-creation.service';
import { TransactionFeeCalculatorService } from './services/transaction-fee-calculator.service';
import { TransactionHistoryService } from './services/transaction-history.service';
import { TransactionManualResultService } from './services/transaction-manual-result.service';
import { TransactionProviderSmsResultService } from './services/transaction-provider-sms-result.service';
import { TransactionQueryService } from './services/transaction-query.service';
import { TransactionUssdService } from './services/transaction-ussd.service';
import { TransactionAnalyticsRepository } from './transaction-analytics.repository';
import { TransactionHistoryRepository } from './transaction-history.repository';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [TransactionsController],

  providers: [
    TransactionReadRepository,

    TransactionWriteRepository,

    TransactionEventRepository,

    TransactionAnalyticsRepository,

    TransactionHistoryRepository,

    TransactionQueryService,

    TransactionCreationService,

    TransactionUssdService,

    TransactionProviderSmsResultService,

    TransactionManualResultService,

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
