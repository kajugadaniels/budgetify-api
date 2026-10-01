import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReceivedTransactionsController } from './received-transactions.controller';
import { ReceivedTransactionsService } from './received-transactions.service';
import { ReceivedTransactionReadRepository } from './repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from './repositories/received-transaction-write.repository';
import { ReceivedManualRecordingService } from './services/received-manual-recording.service';
import { ReceivedProviderSmsRecordingService } from './services/received-provider-sms-recording.service';
import { ReceivedTransactionClassificationService } from './services/received-transaction-classification.service';
import { ReceivedTransactionQueryService } from './services/received-transaction-query.service';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [ReceivedTransactionsController],

  providers: [
    ReceivedTransactionReadRepository,

    ReceivedTransactionWriteRepository,

    ReceivedTransactionQueryService,

    ReceivedTransactionClassificationService,

    ReceivedProviderSmsRecordingService,

    ReceivedManualRecordingService,

    ReceivedTransactionsService,

    JwtAuthGuard,
  ],

  exports: [ReceivedTransactionsService],
})
export class ReceivedTransactionsModule {}
