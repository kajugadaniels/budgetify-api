import {
  Body,
  Controller,
  Delete,
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
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSavingDepositRequestDto } from './dto/create-saving-deposit.request.dto';
import { CreateSavingWithdrawalRequestDto } from './dto/create-saving-withdrawal.request.dto';
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { ListSavingsQueryDto } from './dto/list-savings.query.dto';
import { PaginatedSavingResponseDto } from './dto/paginated-saving.response.dto';
import { SavingResponseDto } from './dto/saving-response.dto';
import { SavingTransactionResponseDto } from './dto/saving-transaction.response.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';
import { SavingsMapper } from './mappers/savings.mapper';
import { SAVINGS_ROUTES } from './savings.routes';
import { SavingsService } from './savings.service';
import {
  ApiCreateCurrentUserSavingEndpoint,
  ApiCreateCurrentUserSavingDepositEndpoint,
  ApiCreateCurrentUserSavingWithdrawalEndpoint,
  ApiDeleteCurrentUserSavingEndpoint,
  ApiListCurrentUserSavingsEndpoint,
  ApiListCurrentUserSavingTransactionsEndpoint,
  ApiUpdateCurrentUserSavingEndpoint,
} from './savings.swagger';

@ApiTags('Savings')
@Controller(SAVINGS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @Get()
  @ApiListCurrentUserSavingsEndpoint()
  async listCurrentUserSavings(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListSavingsQueryDto,
  ): Promise<PaginatedSavingResponseDto> {
    const savings = await this.savingsService.listCurrentUserSavings(
      user.userId,
      query,
    );

    return SavingsMapper.toPaginatedSavingResponse(savings);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserSavingEndpoint()
  async createCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateSavingRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.createCurrentUserSaving(
      user.userId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Patch(SAVINGS_ROUTES.byId)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateCurrentUserSavingEndpoint()
  async updateCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
    @Body() body: UpdateSavingRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.updateCurrentUserSaving(
      user.userId,
      savingId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Get(SAVINGS_ROUTES.transactions)
  @ApiListCurrentUserSavingTransactionsEndpoint()
  async listCurrentUserSavingTransactions(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
  ): Promise<SavingTransactionResponseDto[]> {
    const transactions =
      await this.savingsService.listCurrentUserSavingTransactions(
        user.userId,
        savingId,
      );

    return SavingsMapper.toSavingTransactionResponseList(transactions);
  }

  @Post(SAVINGS_ROUTES.deposits)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserSavingDepositEndpoint()
  async createCurrentUserSavingDeposit(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
    @Body() body: CreateSavingDepositRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.createCurrentUserSavingDeposit(
      user.userId,
      savingId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Post(SAVINGS_ROUTES.withdrawals)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserSavingWithdrawalEndpoint()
  async createCurrentUserSavingWithdrawal(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
    @Body() body: CreateSavingWithdrawalRequestDto,
  ): Promise<SavingResponseDto> {
    const saving = await this.savingsService.createCurrentUserSavingWithdrawal(
      user.userId,
      savingId,
      body,
    );

    return SavingsMapper.toSavingResponse(saving);
  }

  @Delete(SAVINGS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiDeleteCurrentUserSavingEndpoint()
  async deleteCurrentUserSaving(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('savingId', ParseUUIDPipe) savingId: string,
  ): Promise<void> {
    await this.savingsService.deleteCurrentUserSaving(user.userId, savingId);
  }
}
