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
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseAuditResponseDto } from './dto/expense-audit.response.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { ExpenseSummaryQueryDto } from './dto/expense-summary.query.dto';
import { ExpenseSummaryResponseDto } from './dto/expense-summary.response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query.dto';
import { MobileMoneyQuoteRequestDto } from './dto/mobile-money-quote.request.dto';
import { MobileMoneyQuoteResponseDto } from './dto/mobile-money-quote.response.dto';
import { PaginatedExpenseResponseDto } from './dto/paginated-expense.response.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSES_ROUTES } from './expenses.routes';
import { ExpensesMapper } from './mappers/expenses.mapper';
import { ExpensesService } from './expenses.service';
import {
  ApiCreateCurrentUserExpenseEndpoint,
  ApiAuditCurrentUserExpensesEndpoint,
  ApiDeleteCurrentUserExpenseEndpoint,
  ApiListExpenseCategoriesEndpoint,
  ApiListCurrentUserExpensesEndpoint,
  ApiQuoteCurrentUserMobileMoneyExpenseEndpoint,
  ApiSummarizeCurrentUserExpensesEndpoint,
  ApiUpdateCurrentUserExpenseEndpoint,
} from './expenses.swagger';

@ApiTags('Expenses')
@Controller(EXPENSES_ROUTES.base)
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get(EXPENSES_ROUTES.categories)
  @ApiListExpenseCategoriesEndpoint()
  listExpenseCategories(): ExpenseCategoryOptionResponseDto[] {
    return this.expensesService.listExpenseCategories();
  }

  @Get()
  @ApiListCurrentUserExpensesEndpoint()
  async listCurrentUserExpenses(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ListExpensesQueryDto,
  ): Promise<PaginatedExpenseResponseDto> {
    const expenses = await this.expensesService.listCurrentUserExpenses(
      user.userId,
      query,
    );

    return ExpensesMapper.toPaginatedExpenseResponse(expenses);
  }

  @Get(EXPENSES_ROUTES.summary)
  @ApiSummarizeCurrentUserExpensesEndpoint()
  async summarizeCurrentUserExpenses(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseSummaryResponseDto> {
    return this.expensesService.summarizeCurrentUserExpenses(
      user.userId,
      query,
    );
  }

  @Get(EXPENSES_ROUTES.audit)
  @ApiAuditCurrentUserExpensesEndpoint()
  async auditCurrentUserExpenses(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseAuditResponseDto> {
    return this.expensesService.auditCurrentUserExpenses(user.userId, query);
  }

  @Post(EXPENSES_ROUTES.mobileMoneyQuote)
  @HttpCode(HttpStatus.OK)
  @ApiQuoteCurrentUserMobileMoneyExpenseEndpoint()
  async quoteCurrentUserMobileMoneyExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: MobileMoneyQuoteRequestDto,
  ): Promise<MobileMoneyQuoteResponseDto> {
    return this.expensesService.quoteCurrentUserMobileMoneyExpense(
      user.userId,
      body,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiCreateCurrentUserExpenseEndpoint()
  async createCurrentUserExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateExpenseRequestDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expensesService.createCurrentUserExpense(
      user.userId,
      body,
    );

    return ExpensesMapper.toExpenseResponse(expense);
  }

  @Patch(EXPENSES_ROUTES.byId)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiUpdateCurrentUserExpenseEndpoint()
  async updateCurrentUserExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() body: UpdateExpenseRequestDto,
  ): Promise<ExpenseResponseDto> {
    const expense = await this.expensesService.updateCurrentUserExpense(
      user.userId,
      expenseId,
      body,
    );

    return ExpensesMapper.toExpenseResponse(expense);
  }

  @Delete(EXPENSES_ROUTES.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ write: { limit: 1, ttl: 15_000, blockDuration: 15_000 } })
  @ApiDeleteCurrentUserExpenseEndpoint()
  async deleteCurrentUserExpense(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<void> {
    await this.expensesService.deleteCurrentUserExpense(user.userId, expenseId);
  }
}
