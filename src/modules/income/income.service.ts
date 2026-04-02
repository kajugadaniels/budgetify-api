import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Income, Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  findMatchingOptionValues,
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { UsersService } from '../users/users.service';
import { CreateIncomeRequestDto } from './dto/create-income.request.dto';
import { IncomeCategoryOptionResponseDto } from './dto/income-category-option.response.dto';
import { ListIncomeQueryDto } from './dto/list-income.query.dto';
import { UpdateIncomeRequestDto } from './dto/update-income.request.dto';
import { INCOME_CATEGORY_OPTIONS } from './income-category-options';
import { IncomeRepository } from './income.repository';

@Injectable()
export class IncomeService {
  constructor(
    private readonly incomeRepository: IncomeRepository,
    private readonly usersService: UsersService,
  ) {}

  async listCurrentUserIncome(
    userId: string,
    query: ListIncomeQueryDto,
  ): Promise<PaginatedResponse<Income>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);
    const search = normalizeListSearch(query.search);
    const searchCategories = findMatchingOptionValues(
      INCOME_CATEGORY_OPTIONS,
      search,
    );

    return this.incomeRepository.findManyByUserId(userId, {
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

  async createCurrentUserIncome(
    userId: string,
    payload: CreateIncomeRequestDto,
  ): Promise<Income> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.incomeRepository.create({
      userId,
      label: payload.label,
      amount: new Prisma.Decimal(payload.amount),
      category: payload.category,
      date: new Date(payload.date),
      received: payload.received,
    });
  }

  async updateCurrentUserIncome(
    userId: string,
    incomeId: string,
    payload: UpdateIncomeRequestDto,
  ): Promise<Income> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.category === undefined &&
      payload.date === undefined &&
      payload.received === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one income field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const income = await this.findOwnedIncomeOrThrow(userId, incomeId);

    return this.incomeRepository.update(income.id, {
      label: payload.label,
      amount:
        payload.amount === undefined
          ? undefined
          : new Prisma.Decimal(payload.amount),
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
  ): Promise<Income> {
    const income = await this.incomeRepository.findActiveByIdAndUserId(
      incomeId,
      userId,
    );

    if (!income) {
      throw new NotFoundException('Income record was not found.');
    }

    return income;
  }
}
