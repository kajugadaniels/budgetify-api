import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListReceivedTransactionsQueryDto } from './dto/list-received-transactions.query.dto';
import { ReceivedTransactionListResponseDto } from './dto/received-transaction-list.response.dto';
import { ReceivedTransactionResponseDto } from './dto/received-transaction.response.dto';
import { RecordReceivedManualRequestDto } from './dto/record-received-manual.request.dto';
import { RecordReceivedProviderSmsRequestDto } from './dto/record-received-provider-sms.request.dto';
import { UpdateReceivedTransactionClassificationRequestDto } from './dto/update-received-transaction-classification.request.dto';
import { ReceivedTransactionsMapper } from './received-transactions.mapper';
import { RECEIVED_TRANSACTIONS_ROUTES } from './received-transactions.routes';
import { ReceivedTransactionsService } from './received-transactions.service';
import { ApiUpdateReceivedTransactionClassificationEndpoint } from './swagger/received-transaction-classification.swagger';
import {
  ApiGetReceivedTransactionEndpoint,
  ApiListReceivedTransactionsEndpoint,
} from './swagger/received-transaction-query.swagger';
import {
  ApiRecordReceivedManualEndpoint,
  ApiRecordReceivedProviderSmsEndpoint,
} from './swagger/received-transaction-recording.swagger';

@ApiTags('Received Transactions')
@Controller(RECEIVED_TRANSACTIONS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class ReceivedTransactionsController {
  constructor(
    private readonly receivedTransactionsService: ReceivedTransactionsService,
  ) {}

  @Get()
  @ApiListReceivedTransactionsEndpoint()
  async list(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Query()
    query: ListReceivedTransactionsQueryDto,
  ): Promise<ReceivedTransactionListResponseDto> {
    const result = await this.receivedTransactionsService.list(
      user.userId,
      query,
    );

    return {
      items: result.items.map((transaction) =>
        ReceivedTransactionsMapper.toResponse(transaction),
      ),

      pagination: result.pagination,
    };
  }

  @Post(RECEIVED_TRANSACTIONS_ROUTES.providerSms)
  @HttpCode(HttpStatus.OK)
  @ApiRecordReceivedProviderSmsEndpoint()
  async recordProviderSms(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Body()
    body: RecordReceivedProviderSmsRequestDto,
  ): Promise<ReceivedTransactionResponseDto> {
    const transaction =
      await this.receivedTransactionsService.recordProviderSms(
        user.userId,
        body,
      );

    return ReceivedTransactionsMapper.toResponse(transaction);
  }

  @Post(RECEIVED_TRANSACTIONS_ROUTES.manual)
  @HttpCode(HttpStatus.OK)
  @ApiRecordReceivedManualEndpoint()
  async recordManual(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Body()
    body: RecordReceivedManualRequestDto,
  ): Promise<ReceivedTransactionResponseDto> {
    const transaction = await this.receivedTransactionsService.recordManual(
      user.userId,
      body,
    );

    return ReceivedTransactionsMapper.toResponse(transaction);
  }

  @Patch(RECEIVED_TRANSACTIONS_ROUTES.classification)
  @HttpCode(HttpStatus.OK)
  @ApiUpdateReceivedTransactionClassificationEndpoint()
  async updateClassification(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('receivedTransactionId', new ParseUUIDPipe())
    receivedTransactionId: string,

    @Body()
    body: UpdateReceivedTransactionClassificationRequestDto,
  ): Promise<ReceivedTransactionResponseDto> {
    const transaction =
      await this.receivedTransactionsService.updateClassification(
        user.userId,
        receivedTransactionId,
        body,
      );

    return ReceivedTransactionsMapper.toResponse(transaction);
  }

  @Get(RECEIVED_TRANSACTIONS_ROUTES.detail)
  @ApiGetReceivedTransactionEndpoint()
  async getDetail(
    @CurrentUser()
    user: AuthenticatedRequestUser,

    @Param('receivedTransactionId', new ParseUUIDPipe())
    receivedTransactionId: string,
  ): Promise<ReceivedTransactionResponseDto> {
    const transaction = await this.receivedTransactionsService.getDetail(
      user.userId,
      receivedTransactionId,
    );

    return ReceivedTransactionsMapper.toResponse(transaction);
  }
}
