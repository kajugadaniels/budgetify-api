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

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLoanRequestDto } from './dto/create-loan.request.dto';
import { CreateLoanTransactionRequestDto } from './dto/create-loan-transaction.request.dto';
import { LinkLoanTransactionFinancialRecordRequestDto } from './dto/link-loan-transaction-financial-record.request.dto';
import { ListLoansQueryDto } from './dto/list-loans.query.dto';
import { LoanSettlementResponseDto } from './dto/loan-settlement-response.dto';
import { LoanTransactionResponseDto } from './dto/loan-transaction.response.dto';
import { PaginatedLoanResponseDto } from './dto/paginated-loan.response.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { SendLoanToExpenseRequestDto } from './dto/send-loan-to-expense.request.dto';
import { UpdateLoanRequestDto } from './dto/update-loan.request.dto';
import { LoansMapper } from './mappers/loans.mapper';
import { LOANS_ROUTES } from './loans.routes';
import { LoansService } from './loans.service';
import {
  ApiCreateCurrentUserLoanEndpoint,
  ApiCreateCurrentUserLoanTransactionEndpoint,
  ApiDeleteCurrentUserLoanEndpoint,
  ApiListCurrentUserLoansEndpoint,
  ApiListCurrentUserLoanTransactionsEndpoint,
  ApiSendCurrentUserLoanToExpenseEndpoint,
  ApiSendCurrentUserLoanTransactionToExpenseEndpoint,
  ApiSendCurrentUserLoanTransactionToIncomeEndpoint,
  ApiUpdateCurrentUserLoanEndpoint,
} from './loans.swagger';

@ApiTags('Loans')
@Controller(LOANS_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @ApiListCurrentUserLoansEndpoint()
  async listCurrentUserLoans(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListLoansQueryDto,
  ): Promise<PaginatedLoanResponseDto> {
    const loans = await this.loansService.listCurrentUserLoans(
      user.userId,
      query,
    );

    return LoansMapper.toPaginatedLoanResponse(loans);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCurrentUserLoanEndpoint()
  async createCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateLoanRequestDto,
  ): Promise<LoanResponseDto> {
    const loan = await this.loansService.createCurrentUserLoan(
      user.userId,
      body,
    );

    return LoansMapper.toLoanResponse(loan);
  }

  @Get(LOANS_ROUTES.transactions)
  @ApiListCurrentUserLoanTransactionsEndpoint()
  async listCurrentUserLoanTransactions(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ): Promise<LoanTransactionResponseDto[]> {
    const transactions =
      await this.loansService.listCurrentUserLoanTransactions(
        user.userId,
        loanId,
      );

    return transactions.map((transaction) =>
      LoansMapper.toLoanTransactionResponse(transaction),
    );
  }

  @Post(LOANS_ROUTES.transactions)
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCurrentUserLoanTransactionEndpoint()
  async createCurrentUserLoanTransaction(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() body: CreateLoanTransactionRequestDto,
  ): Promise<LoanTransactionResponseDto> {
    const transaction =
      await this.loansService.createCurrentUserLoanTransaction(
        user.userId,
        loanId,
        body,
      );

    return LoansMapper.toLoanTransactionResponse(transaction);
  }

  @Post(LOANS_ROUTES.sendToExpense)
  @HttpCode(HttpStatus.CREATED)
  @ApiSendCurrentUserLoanToExpenseEndpoint()
  async sendCurrentUserLoanToExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() body: SendLoanToExpenseRequestDto,
  ): Promise<LoanSettlementResponseDto> {
    const result = await this.loansService.sendCurrentUserLoanToExpense(
      user.userId,
      loanId,
      body,
    );

    return LoansMapper.toLoanSettlementResponse(result);
  }

  @Post(LOANS_ROUTES.transactionToExpense)
  @HttpCode(HttpStatus.CREATED)
  @ApiSendCurrentUserLoanTransactionToExpenseEndpoint()
  async sendCurrentUserLoanTransactionToExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() body: LinkLoanTransactionFinancialRecordRequestDto,
  ): Promise<LoanTransactionResponseDto> {
    const transaction =
      await this.loansService.sendCurrentUserLoanTransactionToExpense(
        user.userId,
        loanId,
        transactionId,
        body,
      );

    return LoansMapper.toLoanTransactionResponse(transaction);
  }

  @Post(LOANS_ROUTES.transactionToIncome)
  @HttpCode(HttpStatus.CREATED)
  @ApiSendCurrentUserLoanTransactionToIncomeEndpoint()
  async sendCurrentUserLoanTransactionToIncome(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() body: LinkLoanTransactionFinancialRecordRequestDto,
  ): Promise<LoanTransactionResponseDto> {
    const transaction =
      await this.loansService.sendCurrentUserLoanTransactionToIncome(
        user.userId,
        loanId,
        transactionId,
        body,
      );

    return LoansMapper.toLoanTransactionResponse(transaction);
  }

  @Patch(LOANS_ROUTES.byId)
  @ApiUpdateCurrentUserLoanEndpoint()
  async updateCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
    @Body() body: UpdateLoanRequestDto,
  ): Promise<LoanResponseDto> {
    const loan = await this.loansService.updateCurrentUserLoan(
      user.userId,
      loanId,
      body,
    );

    return LoansMapper.toLoanResponse(loan);
  }

  @Delete(LOANS_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteCurrentUserLoanEndpoint()
  async deleteCurrentUserLoan(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('loanId', ParseUUIDPipe) loanId: string,
  ): Promise<void> {
    await this.loansService.deleteCurrentUserLoan(user.userId, loanId);
  }
}
