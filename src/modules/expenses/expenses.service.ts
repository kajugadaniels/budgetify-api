import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Currency } from '@prisma/client';

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
import { IncomeService } from '../income/income.service';
import { UsersService } from '../users/users.service';
import { CreateExpenseRequestDto } from './dto/create-expense.request.dto';
import { ExpenseCategoryOptionResponseDto } from './dto/expense-category-option.response.dto';
import { ExpenseSummaryQueryDto } from './dto/expense-summary.query.dto';
import { ExpenseSummaryResponseDto } from './dto/expense-summary.response.dto';
import { ListExpensesQueryDto } from './dto/list-expenses.query.dto';
import { UpdateExpenseRequestDto } from './dto/update-expense.request.dto';
import { EXPENSE_CATEGORY_OPTIONS } from './expense-category-options';
import { ExpenseWithCreator, ExpensesRepository } from './expenses.repository';
import { MobileMoneyTariffService } from './mobile-money-tariff.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesRepository: ExpensesRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    @Inject(forwardRef(() => IncomeService))
    private readonly incomeService: IncomeService,
    private readonly mobileMoneyTariffService: MobileMoneyTariffService,
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

  async summarizeCurrentUserExpenses(
    userId: string,
    query: ExpenseSummaryQueryDto,
  ): Promise<ExpenseSummaryResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const dateRange = resolveListDateRange(query);

    const [expenseSummary, incomeSummary] = await Promise.all([
      this.expensesRepository.summarizeByUserIds(visibleUserIds, {
        dateFrom: dateRange?.dateFrom,
        dateTo: dateRange?.dateTo,
      }),
      this.incomeService.summarizeCurrentUserIncome(userId, query),
    ]);

    return {
      totalExpensesRwf: expenseSummary.totalBaseAmountRwf,
      totalFeesRwf: expenseSummary.totalFeeAmountRwf,
      totalChargedExpensesRwf: expenseSummary.totalChargedAmountRwf,
      averageExpenseRwf:
        expenseSummary.totalCount > 0
          ? expenseSummary.totalChargedAmountRwf / expenseSummary.totalCount
          : 0,
      largestExpenseRwf: expenseSummary.largestChargedAmountRwf,
      availableMoneyNowRwf: incomeSummary.availableMoneyNowRwf,
      expenseCount: expenseSummary.totalCount,
    };
  }

  async createCurrentUserExpense(
    userId: string,
    payload: CreateExpenseRequestDto,
  ): Promise<ExpenseWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const charges = await this.mobileMoneyTariffService.resolveExpenseCharges({
      amount: payload.amount,
      currency: payload.currency ?? Currency.RWF,
      paymentMethod: payload.paymentMethod,
      mobileMoneyChannel: payload.mobileMoneyChannel,
      mobileMoneyProvider: payload.mobileMoneyProvider,
      mobileMoneyNetwork: payload.mobileMoneyNetwork,
    });

    return this.expensesRepository.create({
      userId,
      label: payload.label,
      amount: charges.amount,
      currency: charges.currency,
      amountRwf: charges.amountRwf,
      feeAmount: charges.feeAmount,
      feeAmountRwf: charges.feeAmountRwf,
      totalAmountRwf: charges.totalAmountRwf,
      paymentMethod: charges.paymentMethod,
      mobileMoneyChannel: charges.mobileMoneyChannel,
      mobileMoneyProvider: charges.mobileMoneyProvider,
      mobileMoneyNetwork: charges.mobileMoneyNetwork,
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
      payload.currency === undefined &&
      payload.category === undefined &&
      payload.paymentMethod === undefined &&
      payload.mobileMoneyChannel === undefined &&
      payload.mobileMoneyProvider === undefined &&
      payload.mobileMoneyNetwork === undefined &&
      payload.date === undefined &&
      payload.note === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one expense field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const expense = await this.findVisibleExpenseOrThrow(userId, expenseId);
    const charges =
      payload.amount !== undefined ||
      payload.currency !== undefined ||
      payload.paymentMethod !== undefined ||
      payload.mobileMoneyChannel !== undefined ||
      payload.mobileMoneyProvider !== undefined ||
      payload.mobileMoneyNetwork !== undefined
        ? await this.mobileMoneyTariffService.resolveExpenseCharges({
            amount: payload.amount ?? Number(expense.amount),
            currency: payload.currency ?? expense.currency,
            paymentMethod: payload.paymentMethod ?? expense.paymentMethod,
            mobileMoneyChannel:
              payload.mobileMoneyChannel === undefined
                ? (expense.mobileMoneyChannel ?? undefined)
                : payload.mobileMoneyChannel,
            mobileMoneyProvider:
              payload.mobileMoneyProvider === undefined
                ? (expense.mobileMoneyProvider ?? undefined)
                : payload.mobileMoneyProvider,
            mobileMoneyNetwork:
              payload.mobileMoneyNetwork === undefined
                ? (expense.mobileMoneyNetwork ?? undefined)
                : payload.mobileMoneyNetwork,
          })
        : null;

    return this.expensesRepository.update(expense.id, {
      label: payload.label,
      amount: charges?.amount,
      currency: charges?.currency,
      amountRwf: charges?.amountRwf,
      feeAmount: charges?.feeAmount,
      feeAmountRwf: charges?.feeAmountRwf,
      totalAmountRwf: charges?.totalAmountRwf,
      paymentMethod: charges?.paymentMethod,
      mobileMoneyChannel: charges?.mobileMoneyChannel,
      mobileMoneyProvider: charges?.mobileMoneyProvider,
      mobileMoneyNetwork: charges?.mobileMoneyNetwork,
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
