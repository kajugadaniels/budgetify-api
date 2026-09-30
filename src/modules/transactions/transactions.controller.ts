import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionRequestDto } from './dto/create-transaction.request.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions.query.dto';
import { RecordManualResultRequestDto } from './dto/record-manual-result.request.dto';
import { RecordProviderSmsResultRequestDto } from './dto/record-provider-sms-result.request.dto';
import { RecordUssdOpenedRequestDto } from './dto/record-ussd-opened.request.dto';
import { TransactionAnalyticsQueryDto } from './dto/transaction-analytics.query.dto';
import { TransactionAnalyticsResponseDto } from './dto/transaction-analytics.response.dto';
import { TransactionDetailResponseDto } from './dto/transaction-detail.response.dto';
import { TransactionListResponseDto } from './dto/transaction-list.response.dto';
import { TransactionQuoteRequestDto } from './dto/transaction-quote.request.dto';
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import { TransactionAnalyticsService } from './services/transaction-analytics.service';
import { TransactionsMapper } from './transactions.mapper';
import { TRANSACTIONS_ROUTES } from './transactions.routes';
import { TransactionsService } from './transactions.service';
import {
  ApiCreateTransactionEndpoint,
  ApiGetTransactionAnalyticsEndpoint,
  ApiGetTransactionEndpoint,
  ApiListTransactionsEndpoint,
  ApiQuoteTransactionEndpoint,
  ApiRecordManualResultEndpoint,
  ApiRecordProviderSmsResultEndpoint,
  ApiRecordUssdOpenedEndpoint,
} from './transactions.swagger';

@ApiTags('Transactions')
@Controller(TRANSACTIONS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,

    private readonly analyticsService: TransactionAnalyticsService,
  ) {}

  @Get()
  @ApiListTransactionsEndpoint()
  async list(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Query()
    query: ListTransactionsQueryDto,
  ): Promise<TransactionListResponseDto> {
    const result = await this.transactionsService.list(user.userId, query);

    return {
      items: result.items.map((transaction) =>
        TransactionsMapper.toResponse(transaction),
      ),

      pagination: result.pagination,
    };
  }

  @Get(TRANSACTIONS_ROUTES.analytics)
  @ApiGetTransactionAnalyticsEndpoint()
  async getAnalytics(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Query()
    query: TransactionAnalyticsQueryDto,
  ): Promise<TransactionAnalyticsResponseDto> {
    return this.analyticsService.getAnalytics(user.userId, query);
  }

  @Get(TRANSACTIONS_ROUTES.detail)
  @ApiGetTransactionEndpoint()
  async getDetail(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('transactionId', new ParseUUIDPipe())
    transactionId: string,
  ): Promise<TransactionDetailResponseDto> {
    const result = await this.transactionsService.getDetail(
      user.userId,
      transactionId,
    );

    return TransactionsMapper.toDetailResponse(
      result.transaction,
      result.events,
    );
  }

  @Post(TRANSACTIONS_ROUTES.quote)
  @ApiQuoteTransactionEndpoint()
  quote(
    @Body()
    body: TransactionQuoteRequestDto,
  ): TransactionQuoteResponseDto {
    return this.transactionsService.quote(body);
  }

  @Post()
  @ApiCreateTransactionEndpoint()
  async create(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Body()
    body: CreateTransactionRequestDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.create(
      user.userId,
      body,
    );

    return TransactionsMapper.toResponse(transaction);
  }

  @Post(TRANSACTIONS_ROUTES.ussdOpened)
  @HttpCode(HttpStatus.OK)
  @ApiRecordUssdOpenedEndpoint()
  async recordUssdOpened(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('transactionId', new ParseUUIDPipe())
    transactionId: string,

    @Body()
    body: RecordUssdOpenedRequestDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.recordUssdOpened(
      user.userId,
      transactionId,
      body,
    );

    return TransactionsMapper.toResponse(transaction);
  }

  @Post(TRANSACTIONS_ROUTES.providerSmsResult)
  @HttpCode(HttpStatus.OK)
  @ApiRecordProviderSmsResultEndpoint()
  async recordProviderSmsResult(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('transactionId', new ParseUUIDPipe())
    transactionId: string,

    @Body()
    body: RecordProviderSmsResultRequestDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.recordProviderSmsResult(
      user.userId,
      transactionId,
      body,
    );

    return TransactionsMapper.toResponse(transaction);
  }

  @Post(TRANSACTIONS_ROUTES.manualResult)
  @HttpCode(HttpStatus.OK)
  @ApiRecordManualResultEndpoint()
  async recordManualResult(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('transactionId', new ParseUUIDPipe())
    transactionId: string,

    @Body()
    body: RecordManualResultRequestDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.recordManualResult(
      user.userId,
      transactionId,
      body,
    );

    return TransactionsMapper.toResponse(transaction);
  }
}
