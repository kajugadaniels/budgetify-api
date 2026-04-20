import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Currency, Prisma, SavingTransactionType } from '@prisma/client';

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
import { IncomeService } from '../income/income.service';
import { CreateSavingRequestDto } from './dto/create-saving.request.dto';
import { CreateSavingDepositRequestDto } from './dto/create-saving-deposit.request.dto';
import { ListSavingsQueryDto } from './dto/list-savings.query.dto';
import { UpdateSavingRequestDto } from './dto/update-saving.request.dto';
import {
  SavingTransactionWithSources,
  SavingWithCreator,
  SavingsRepository,
} from './savings.repository';

@Injectable()
export class SavingsService {
  constructor(
    private readonly savingsRepository: SavingsRepository,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly currencyService: CurrencyService,
    private readonly incomeService: IncomeService,
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

  async listCurrentUserSavingTransactions(
    userId: string,
    savingId: string,
  ): Promise<SavingTransactionWithSources[]> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findVisibleSavingOrThrow(userId, savingId);

    return this.savingsRepository.findTransactionsBySavingId(saving.id);
  }

  async createCurrentUserSavingDeposit(
    userId: string,
    savingId: string,
    payload: CreateSavingDepositRequestDto,
  ): Promise<SavingWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findVisibleSavingOrThrow(userId, savingId);
    const depositAmountRwf = await this.toRoundedRwf(
      payload.amount,
      payload.currency,
    );
    const sourceInputs = await Promise.all(
      payload.incomeSources.map(async (source) => ({
        ...source,
        amountRwf: await this.toRoundedRwf(source.amount, source.currency),
      })),
    );

    const duplicateIncomeId = this.findDuplicateIncomeId(
      sourceInputs.map((source) => source.incomeId),
    );

    if (duplicateIncomeId) {
      throw new BadRequestException(
        'Each income record can only be listed once per saving deposit.',
      );
    }

    const sourceTotalRwf = sourceInputs.reduce(
      (sum, source) => sum.add(source.amountRwf),
      new Prisma.Decimal(0),
    );

    if (!sourceTotalRwf.equals(depositAmountRwf)) {
      throw new BadRequestException(
        'Income source amounts must equal the deposit amount after RWF conversion.',
      );
    }

    const incomeRecords = await Promise.all(
      sourceInputs.map((source) =>
        this.incomeService.findVisibleIncomeForCurrentUser(
          userId,
          source.incomeId,
        ),
      ),
    );

    for (const source of sourceInputs) {
      const income = incomeRecords.find((item) => item.id === source.incomeId);

      if (!income) {
        throw new BadRequestException('Income source was not found.');
      }

      if (!income.received) {
        throw new BadRequestException(
          `Income source "${income.label}" must be marked as received before it can fund savings.`,
        );
      }

      const allocatedAmountRwf =
        await this.savingsRepository.sumDepositSourceAmountRwfByIncomeId(
          source.incomeId,
        );
      const remainingAmountRwf = new Prisma.Decimal(income.amountRwf).minus(
        allocatedAmountRwf,
      );

      if (source.amountRwf.greaterThan(remainingAmountRwf)) {
        throw new BadRequestException(
          `Income source "${income.label}" only has RWF ${remainingAmountRwf.toFixed(0)} remaining for savings.`,
        );
      }
    }

    return this.savingsRepository.runInTransaction(async (db) => {
      const transaction = await this.savingsRepository.createTransaction(
        {
          savingId: saving.id,
          userId: saving.userId,
          type: SavingTransactionType.DEPOSIT,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf: depositAmountRwf,
          date: new Date(payload.date),
          note: payload.note ?? null,
        },
        db,
      );

      await this.savingsRepository.createTransactionIncomeSources(
        sourceInputs.map((source) => ({
          savingTransactionId: transaction.id,
          incomeId: source.incomeId,
          amount: new Prisma.Decimal(source.amount),
          currency: source.currency,
          amountRwf: source.amountRwf,
        })),
        db,
      );

      if (!saving.stillHave) {
        const updatedSaving = await this.savingsRepository.update(
          saving.id,
          { stillHave: true },
          db,
        );
        await this.savingsRepository.syncLegacyAvailabilityWithdrawal(
          updatedSaving,
          db,
        );
      }

      return this.findSavingByIdOrThrow(saving.id, saving.userId, db);
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

  private async toRoundedRwf(
    amount: number,
    currency: Currency,
  ): Promise<Prisma.Decimal> {
    const amountRwf = await this.currencyService.convertToRwf(amount, currency);

    return amountRwf.toDecimalPlaces(2);
  }

  private findDuplicateIncomeId(incomeIds: string[]): string | null {
    const seenIncomeIds = new Set<string>();

    for (const incomeId of incomeIds) {
      if (seenIncomeIds.has(incomeId)) {
        return incomeId;
      }

      seenIncomeIds.add(incomeId);
    }

    return null;
  }
}
