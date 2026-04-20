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
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { UsersService } from '../users/users.service';
import { CurrencyService } from '../currency/currency.service';
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { ListSavingsQueryDto } from './dto/list-savings.query.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';
import { SavingWithCreator, SavingsRepository } from './savings.repository';

@Injectable()
export class SavingsService {
  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly currencyService: CurrencyService,
  ) {}

  async listCurrentUserSavings(
    userId: string,
    query: ListSavingsQueryDto,
  ): Promise<PaginatedResponse<SavingWithCreator>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);

    return this.savingsRepository.findManyByUserIds(visibleUserIds, {
      dateFrom: dateRange?.dateFrom,
      dateTo: dateRange?.dateTo,
      search: normalizeListSearch(query.search),
      page: pagination.page,
      limit: pagination.limit,
      skip: pagination.skip,
      take: pagination.limit,
    });
  }

  async createCurrentUserSaving(
    userId: string,
    payload: CreateSavingRequestDto,
  ): Promise<SavingWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const amountRwf = await this.currencyService.convertToRwf(
      payload.amount,
      payload.currency,
    );

    return this.savingsRepository.runInTransaction(async (db) => {
      const saving = await this.savingsRepository.create(
        {
          userId,
          label: payload.label,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf,
          date: new Date(payload.date),
          note: payload.note ?? null,
          stillHave: payload.stillHave,
        },
        db,
      );

      await this.savingsRepository.syncPrimaryDeposit(saving, db);
      await this.savingsRepository.syncLegacyAvailabilityWithdrawal(saving, db);

      return this.findSavingByIdOrThrow(saving.id, saving.userId, db);
    });
  }

  async updateCurrentUserSaving(
    userId: string,
    savingId: string,
    payload: UpdateSavingRequestDto,
  ): Promise<SavingWithCreator> {
    if (
      payload.label === undefined &&
      payload.amount === undefined &&
      payload.currency === undefined &&
      payload.date === undefined &&
      payload.note === undefined &&
      payload.stillHave === undefined
    ) {
      throw new BadRequestException(
        'Provide at least one saving field to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findVisibleSavingOrThrow(userId, savingId);
    const resolvedAmount = payload.amount ?? Number(saving.amount);
    const resolvedCurrency = payload.currency ?? saving.currency;
    const shouldUpdateAmountRwf =
      payload.amount !== undefined || payload.currency !== undefined;
    const amountRwf = shouldUpdateAmountRwf
      ? await this.currencyService.convertToRwf(
          resolvedAmount,
          resolvedCurrency,
        )
      : undefined;

    return this.savingsRepository.runInTransaction(async (db) => {
      const updatedSaving = await this.savingsRepository.update(
        saving.id,
        {
          label: payload.label,
          amount:
            payload.amount === undefined
              ? undefined
              : new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf,
          date: payload.date === undefined ? undefined : new Date(payload.date),
          note: payload.note,
          stillHave: payload.stillHave,
        },
        db,
      );

      await this.savingsRepository.syncPrimaryDeposit(updatedSaving, db);
      await this.savingsRepository.syncLegacyAvailabilityWithdrawal(
        updatedSaving,
        db,
      );

      return this.findSavingByIdOrThrow(
        updatedSaving.id,
        updatedSaving.userId,
        db,
      );
    });
  }

  async deleteCurrentUserSaving(
    userId: string,
    savingId: string,
  ): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findOwnedSavingOrThrow(userId, savingId);

    await this.savingsRepository.update(saving.id, {
      deletedAt: new Date(),
    });
  }

  private async findOwnedSavingOrThrow(
    userId: string,
    savingId: string,
  ): Promise<SavingWithCreator> {
    return this.findVisibleSavingOrThrow(userId, savingId);
  }

  private async findVisibleSavingOrThrow(
    userId: string,
    savingId: string,
  ): Promise<SavingWithCreator> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const saving = await this.savingsRepository.findActiveByIdAndUserIds(
      savingId,
      visibleUserIds,
    );

    if (!saving) {
      throw new NotFoundException('Saving record was not found.');
    }

    return saving;
  }

  private async findSavingByIdOrThrow(
    savingId: string,
    userId: string,
    db: Prisma.TransactionClient,
  ): Promise<SavingWithCreator> {
    const saving = await this.savingsRepository.findActiveByIdAndUserIds(
      savingId,
      [userId],
      db,
    );

    if (!saving) {
      throw new NotFoundException('Saving record was not found.');
    }

    return saving;
  }
}
