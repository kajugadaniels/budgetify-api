import { Injectable } from '@nestjs/common';
import { ReceivedTransaction } from '@prisma/client';

import { ListReceivedTransactionsQueryDto } from './dto/list-received-transactions.query.dto';
import { RecordReceivedManualRequestDto } from './dto/record-received-manual.request.dto';
import { RecordReceivedProviderSmsRequestDto } from './dto/record-received-provider-sms.request.dto';
import { UpdateReceivedTransactionClassificationRequestDto } from './dto/update-received-transaction-classification.request.dto';
import { ReceivedManualRecordingService } from './services/received-manual-recording.service';
import { ReceivedProviderSmsRecordingService } from './services/received-provider-sms-recording.service';
import { ReceivedTransactionClassificationService } from './services/received-transaction-classification.service';
import { ReceivedTransactionQueryService } from './services/received-transaction-query.service';
import { ReceivedTransactionListResult } from './types/received-transaction.types';

@Injectable()
export class ReceivedTransactionsService {
  constructor(
    private readonly queryService: ReceivedTransactionQueryService,

    private readonly classificationService: ReceivedTransactionClassificationService,

    private readonly providerSmsRecordingService: ReceivedProviderSmsRecordingService,

    private readonly manualRecordingService: ReceivedManualRecordingService,
  ) {}

  list(
    userId: string,
    query: ListReceivedTransactionsQueryDto,
  ): Promise<ReceivedTransactionListResult> {
    return this.queryService.list(userId, query);
  }

  getDetail(
    userId: string,
    receivedTransactionId: string,
  ): Promise<ReceivedTransaction> {
    return this.queryService.getDetail(userId, receivedTransactionId);
  }

  updateClassification(
    userId: string,
    receivedTransactionId: string,
    body: UpdateReceivedTransactionClassificationRequestDto,
  ): Promise<ReceivedTransaction> {
    return this.classificationService.update(
      userId,
      receivedTransactionId,
      body,
    );
  }

  recordProviderSms(
    userId: string,
    body: RecordReceivedProviderSmsRequestDto,
  ): Promise<ReceivedTransaction> {
    return this.providerSmsRecordingService.record(userId, body);
  }

  recordManual(
    userId: string,
    body: RecordReceivedManualRequestDto,
  ): Promise<ReceivedTransaction> {
    return this.manualRecordingService.record(userId, body);
  }
}
