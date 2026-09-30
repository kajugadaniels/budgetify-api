import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionRequestDto } from './dto/create-transaction.request.dto';
import { RecordUssdOpenedRequestDto } from './dto/record-ussd-opened.request.dto';
import { TransactionQuoteRequestDto } from './dto/transaction-quote.request.dto';
import { TransactionQuoteResponseDto } from './dto/transaction-quote.response.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';
import { TransactionsMapper } from './transactions.mapper';
import { TRANSACTIONS_ROUTES } from './transactions.routes';
import { TransactionsService } from './transactions.service';
import {
  ApiCreateTransactionEndpoint,
  ApiQuoteTransactionEndpoint,
  ApiRecordUssdOpenedEndpoint,
} from './transactions.swagger';

@ApiTags('Transactions')
@Controller(TRANSACTIONS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

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
}
