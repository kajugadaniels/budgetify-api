import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';

import { UsersService } from '../users/users.service';
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSE_CATEGORY_OPTIONS } from './expense-category-options';
import { ExpensesRepository } from './expenses.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserExpenses(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<Expense[]> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const { dateFrom, dateTo } = this.buildExpenseMonthRange(query);

    return this.expensesRepository.findManyByUserId(userId, {
      dateFrom,
      dateTo,
    });
  }

  listExpenseCategories(): ExpenseCategoryOptionResponseDto[] {
    return EXPENSE_CATEGORY_OPTIONS.map((option) => ({ ...option }));
  }

  async createCurrentUserExpense(
    userId: string,
    payload: CreateExpenseRequestDto,
  ): Promise<Expense> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.expensesRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      category: payload.category,
      date: new Date(payload.date),
      note: payload.note ?? null,
    });
  }

  async updateCurrentUserExpense(
    userId: string,
    expenseId: string,
    payload: UpdateExpenseRequestDto,
  ): Promise<Expense> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.category === undefined &&
      payload.date === undefined &&
      payload.note === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one expense field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const expense = await this.findOwnedExpenseOrThrow(userId, expenseId);

    return this.expensesRepository.update(expense.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
      category: payload.category,
      date: payload.date === undefined ? undefined : new Date(payload.date),
      note: payload.note,
    });
  }

  async deleteCurrentUserExpense(
    userId: string,
    expenseId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const expense = await this.findOwnedExpenseOrThrow(userId, expenseId);

    await this.expensesRepository.update(expense.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedExpenseOrThrow(
    userId: string,
    expenseId: string,
  ): Promise<Expense> {
    const expense = await this.expensesRepository.findActiveByIdAndUserId(
      expenseId,
      userId,
    );

    if (!expense) {
      throw new NotFoundException('Expense record was not found.');
    }

    return expense;
  }

  private buildExpenseMonthRange(query: ListExpensesQueryDto): {
    dateFrom: Date;
    dateTo: Date;
  } {
    const now = new Date();
    const resolvedYear = query.year ?? now.getUTCFullYear();
    const resolvedMonthIndex = (query.month ?? now.getUTCMonth() + 1) - 1;

    return {
      dateFrom: new Date(Date.UTC(resolvedYear, resolvedMonthIndex, 1)),
      dateTo: new Date(Date.UTC(resolvedYear, resolvedMonthIndex + 1, 1)),
    };
  }
}
