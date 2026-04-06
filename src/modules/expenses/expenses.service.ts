import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  findMatchingOptionValues,
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { UsersService } from '../users/users.service';
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSE_CATEGORY_OPTIONS } from './expense-category-options';
import { ExpenseWithCreator, ExpensesRepository } from './expenses.repository';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
  ) {}

  async listCurrentUserExpenses(
    userId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedResponse<ExpenseWithCreator>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);
    const search = normalizeListSearch(query.search);
    const searchCategories = findMatchingOptionValues(
      EXPENSE_CATEGORY_OPTIONS,
      search,
    );

    return this.expensesRepository.findManyByUserIds(visibleUserIds, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      search,
      searchCategories,
      category: query.category,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  listExpenseCategories(): ExpenseCategoryOptionResponseDto[] {
    return EXPENSE_CATEGORY_OPTIONS.map((option) => ({ ...option }));
  }

  async createCurrentUserExpense(
    userId: string,
    payload: CreateExpenseRequestDto,
  ): Promise<ExpenseWithCreator> {
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
  ): Promise<ExpenseWithCreator> {
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

    const expense = await this.findVisibleExpenseOrThrow(userId, expenseId);

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
  ): Promise<ExpenseWithCreator> {
    return this.findVisibleExpenseOrThrow(userId, expenseId);
  }

  private async findVisibleExpenseOrThrow(
    userId: string,
    expenseId: string,
  ): Promise<ExpenseWithCreator> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const expense = await this.expensesRepository.findActiveByIdAndUserIds(
      expenseId,
      visibleUserIds,
    );

    if (!expense) {
      throw new NotFoundException('Expense record was not found.');
    }

    return expense;
  }
}
