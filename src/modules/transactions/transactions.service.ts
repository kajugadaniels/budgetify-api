import { Injectable } from '@nestjs/common';
import { Transaction } from '@prisma/client';

import { CreateTransactionRequestDto } from './dto/create-transaction.request.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions.query.dto';
import { RecordManualResultRequestDto } from './dto/record-manual-result.request.dto';
import { RecordProviderSmsResultRequestDto } from './dto/record-provider-sms-result.request.dto';
import { RecordUssdOpenedRequestDto } from './dto/record-ussd-opened.request.dto';
import { TransactionQuoteRequestDto } from './dto/transaction-quote.request.dto';
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionCreationService } from './services/transaction-creation.service';
import { TransactionManualResultService } from './services/transaction-manual-result.service';
import { TransactionProviderSmsResultService } from './services/transaction-provider-sms-result.service';
import {
  TransactionDetailResult,
  TransactionListResult,
  TransactionQueryService,
} from './services/transaction-query.service';
import { TransactionUssdService } from './services/transaction-ussd.service';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly queryService: TransactionQueryService,

    private readonly creationService: TransactionCreationService,

    private readonly ussdService: TransactionUssdService,

    private readonly providerSmsResultService: TransactionProviderSmsResultService,

    private readonly manualResultService: TransactionManualResultService,
  ) {}

  list(
    userId: string,
    query: ListTransactionsQueryDto,
  ): Promise<TransactionListResult> {
    return this.queryService.list(userId, query);
  }

  getDetail(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetailResult> {
    return this.queryService.getDetail(userId, transactionId);
  }

  quote(body: TransactionQuoteRequestDto): TransactionQuoteResponseDto {
    return this.creationService.quote(body);
  }

  create(
    userId: string,
    body: CreateTransactionRequestDto,
  ): Promise<Transaction> {
    return this.creationService.create(userId, body);
  }

  recordUssdOpened(
    userId: string,
    transactionId: string,
    body: RecordUssdOpenedRequestDto,
  ): Promise<Transaction> {
    return this.ussdService.recordOpened(userId, transactionId, body);
  }

  recordProviderSmsResult(
    userId: string,
    transactionId: string,
    body: RecordProviderSmsResultRequestDto,
  ): Promise<Transaction> {
    return this.providerSmsResultService.record(userId, transactionId, body);
  }

  recordManualResult(
    userId: string,
    transactionId: string,
    body: RecordManualResultRequestDto,
  ): Promise<Transaction> {
    return this.manualResultService.record(userId, transactionId, body);
  }
}
