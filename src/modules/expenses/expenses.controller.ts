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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedRequestUser } from '../../common/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSES_ROUTES } from './expenses.routes';
import { ExpensesMapper } from './mappers/expenses.mapper';
import { ExpensesService } from './expenses.service';
import {
  ApiCreateCurrentUserExpenseEndpoint,
  ApiDeleteCurrentUserExpenseEndpoint,
  ApiListExpenseCategoriesEndpoint,
  ApiListCurrentUserExpensesEndpoint,
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
  ): Promise<ExpenseResponseDto[]> {
    const expenses = await this.expensesService.listCurrentUserExpenses(
      user.userId,
    );

    return ExpensesMapper.toExpenseResponseList(expenses);
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
