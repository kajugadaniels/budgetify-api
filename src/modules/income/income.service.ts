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
import { ExpensesRepository } from '../expenses/expenses.repository';
import { SavingsRepository } from '../savings/savings.repository';
import { UsersService } from '../users/users.service';
import { CurrencyService } from '../currency/currency.service';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeDetailResponseDto } from './dto/income-detail.response.dto';
import { IncomeCategoryOptionResponseDto } from './dto/income-category-option.response.dto';
import { ListIncomeQueryDto } from './dto/list-income.query.dto';
import { IncomeSummaryQueryDto } from './dto/income-summary.query.dto';
import { IncomeSummaryResponseDto } from './dto/income-summary.response.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';
import { INCOME_CATEGORY_OPTIONS } from './income-category-options';
import { IncomeMapper } from './mappers/income.mapper';
import { IncomeRepository, IncomeWithCreator } from './income.repository';

@Injectable()
export class IncomeService {
  constructor(
    private readonly incomeRepository: IncomeRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly currencyService: CurrencyService,
    private readonly expensesRepository: ExpensesRepository,
    private readonly savingsRepository: SavingsRepository,
  ) {}

  async listCurrentUserIncome(
    userId: string,
    query: ListIncomeQueryDto,
  ): Promise<PaginatedResponse<IncomeWithCreator>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);
    const search = normalizeListSearch(query.search);
    const searchCategories = findMatchingOptionValues(
      INCOME_CATEGORY_OPTIONS,
      search,
    );

    return this.incomeRepository.findManyByUserIds(visibleUserIds, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      search,
      searchCategories,
      category: query.category,
      received: query.received,
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  listIncomeCategories(): IncomeCategoryOptionResponseDto[] {
    return INCOME_CATEGORY_OPTIONS.map((option) => ({ ...option }));
  }

  async summarizeCurrentUserIncome(
    userId: string,
    query: IncomeSummaryQueryDto,
  ): Promise<IncomeSummaryResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const dateRange = resolveListDateRange(query);

    const [incomeSummary, totalExpensesRwf, totalSavingsBalanceRwf] =
      await Promise.all([
        this.incomeRepository.summarizeByUserIds(visibleUserIds, {
          dateFrom: dateRange?.dateFrom,
          dateTo: dateRange?.dateTo,
        }),
        this.expensesRepository.sumAmountByUserIds(visibleUserIds, {
          dateFrom: dateRange?.dateFrom,
          dateTo: dateRange?.dateTo,
        }),
        this.savingsRepository.sumCurrentBalanceRwfByUserIds(visibleUserIds, {
          dateFrom: dateRange?.dateFrom,
          dateTo: dateRange?.dateTo,
        }),
      ]);

    const pendingIncomeRwf = Math.max(
      incomeSummary.totalAmountRwf - incomeSummary.receivedAmountRwf,
      0,
    );
    const pendingIncomeCount = Math.max(
      incomeSummary.totalCount - incomeSummary.receivedCount,
      0,
    );

    return {
      totalIncomeRwf: incomeSummary.totalAmountRwf,
      receivedIncomeRwf: incomeSummary.receivedAmountRwf,
      pendingIncomeRwf,
      totalExpensesRwf,
      totalSavingsBalanceRwf,
      availableMoneyNowRwf:
        incomeSummary.receivedAmountRwf -
        totalExpensesRwf -
        totalSavingsBalanceRwf,
      totalIncomeCount: incomeSummary.totalCount,
      receivedIncomeCount: incomeSummary.receivedCount,
      pendingIncomeCount,
    };
  }

  async findVisibleIncomeForCurrentUser(
    userId: string,
    incomeId: string,
  ): Promise<IncomeWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.findVisibleIncomeOrThrow(userId, incomeId);
  }

  async getCurrentUserIncomeDetail(
    userId: string,
    incomeId: string,
  ): Promise<IncomeDetailResponseDto> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const income = await this.findVisibleIncomeOrThrow(userId, incomeId);
    const allocations =
      await this.savingsRepository.findActiveDepositSourcesByIncomeId(
        income.id,
        visibleUserIds,
      );

    return IncomeMapper.toIncomeDetailResponse(income, allocations);
  }

  async createCurrentUserIncome(
    userId: string,
    payload: CreateIncomeRequestDto,
  ): Promise<IncomeWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const amountRwf = await this.currencyService.convertToRwf(
      payload.amount,
      payload.currency,
    );

    return this.incomeRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      currency: payload.currency,
      amountRwf,
      category: payload.category,
      date: new Date(payload.date),
      received: payload.received,
    });
  }

  async updateCurrentUserIncome(
    userId: string,
    incomeId: string,
    payload: UpdateIncomeRequestDto,
  ): Promise<IncomeWithCreator> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.currency === undefined &&
      payload.category === undefined &&
      payload.date === undefined &&
      payload.received === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one income field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const income = await this.findVisibleIncomeOrThrow(userId, incomeId);
    const resolvedAmount = payload.amount ?? Number(income.amount);
    const resolvedCurrency = payload.currency ?? income.currency;
    const shouldUpdateAmountRwf =
      payload.amount !== undefined || payload.currency !== undefined;
    const amountRwf = shouldUpdateAmountRwf
      ? await this.currencyService.convertToRwf(
          resolvedAmount,
          resolvedCurrency,
        )
      : undefined;

    return this.incomeRepository.update(income.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
      currency: payload.currency,
      amountRwf,
      category: payload.category,
      date: payload.date === undefined ? undefined : new Date(payload.date),
      received: payload.received,
    });
  }

  async deleteCurrentUserIncome(
    userId: string,
    incomeId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const income = await this.findOwnedIncomeOrThrow(userId, incomeId);

    await this.incomeRepository.update(income.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedIncomeOrThrow(
    userId: string,
    incomeId: string,
  ): Promise<IncomeWithCreator> {
    return this.findVisibleIncomeOrThrow(userId, incomeId);
  }

  private async findVisibleIncomeOrThrow(
    userId: string,
    incomeId: string,
  ): Promise<IncomeWithCreator> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const income = await this.incomeRepository.findActiveByIdAndUserIds(
      incomeId,
      visibleUserIds,
    );

    if (!income) {
      throw new NotFoundException('Income record was not found.');
    }

    return income;
  }
}
