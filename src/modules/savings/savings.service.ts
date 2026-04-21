import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  MoneyMovementType,
  Prisma,
  SavingTransactionType,
} from '@prisma/client';

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
import { CreateSavingWithdrawalRequestDto } from './dto/create-saving-withdrawal.request.dto';
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
    const resolvedAmount = payload.amount ?? 0;
    const amountRwf = await this.currencyService.convertToRwf(
      resolvedAmount,
      payload.currency,
    );
    const targetConfig = await this.resolveCreateTargetConfig(payload);

    return this.savingsRepository.runInTransaction(async (db) => {
      const saving = await this.savingsRepository.create(
        {
          userId,
          label: payload.label,
          amount: new Prisma.Decimal(resolvedAmount),
          currency: payload.currency,
          amountRwf,
          targetAmount: targetConfig.targetAmount,
          targetCurrency: targetConfig.targetCurrency,
          targetAmountRwf: targetConfig.targetAmountRwf,
          startDate: targetConfig.startDate,
          endDate: targetConfig.endDate,
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
      payload.targetAmount === undefined &&
      payload.targetCurrency === undefined &&
      payload.startDate === undefined &&
      payload.endDate === undefined &&
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
    const resolvedTargetAmount =
      payload.targetAmount === undefined
        ? saving.targetAmount === null
          ? null
          : Number(saving.targetAmount)
        : payload.targetAmount;
    const resolvedTargetCurrency =
      payload.targetCurrency === undefined
        ? saving.targetCurrency
        : payload.targetCurrency;
    const shouldUpdateTargetAmountRwf =
      payload.targetAmount !== undefined ||
      payload.targetCurrency !== undefined;
    const amountRwf = shouldUpdateAmountRwf
      ? await this.currencyService.convertToRwf(
          resolvedAmount,
          resolvedCurrency,
        )
      : undefined;
    const targetAmountRwf =
      shouldUpdateTargetAmountRwf &&
      resolvedTargetAmount !== null &&
      resolvedTargetCurrency !== null
        ? await this.currencyService.convertToRwf(
            resolvedTargetAmount,
            resolvedTargetCurrency,
          )
        : undefined;
    const resolvedStartDate =
      payload.startDate === undefined
        ? saving.startDate
        : payload.startDate === null
          ? null
          : this.parseDateOnly(payload.startDate);
    const resolvedEndDate =
      payload.endDate === undefined
        ? saving.endDate
        : payload.endDate === null
          ? null
          : this.parseDateOnly(payload.endDate);

    if (
      payload.startDate !== undefined ||
      payload.endDate !== undefined ||
      resolvedStartDate !== null ||
      resolvedEndDate !== null
    ) {
      if (!resolvedStartDate || !resolvedEndDate) {
        throw new BadRequestException(
          'Both startDate and endDate are required for a saving timeframe.',
        );
      }

      this.assertValidTimeframe(resolvedStartDate, resolvedEndDate);
    }

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
          targetAmount:
            payload.targetAmount === undefined
              ? undefined
              : payload.targetAmount === null
                ? null
                : new Prisma.Decimal(payload.targetAmount),
          targetCurrency: payload.targetCurrency,
          targetAmountRwf,
          startDate:
            payload.startDate === undefined ? undefined : resolvedStartDate,
          endDate: payload.endDate === undefined ? undefined : resolvedEndDate,
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

  async createCurrentUserSavingWithdrawal(
    userId: string,
    savingId: string,
    payload: CreateSavingWithdrawalRequestDto,
  ): Promise<SavingWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findVisibleSavingOrThrow(userId, savingId);
    const withdrawalAmountRwf = await this.toRoundedRwf(
      payload.amount,
      payload.currency,
    );
    const currentBalanceRwf = this.calculateCurrentBalanceRwf(saving);

    if (withdrawalAmountRwf.greaterThan(currentBalanceRwf)) {
      throw new BadRequestException(
        `Withdrawal exceeds the current saving balance of RWF ${currentBalanceRwf.toFixed(0)}.`,
      );
    }

    const remainingBalanceRwf = currentBalanceRwf.minus(withdrawalAmountRwf);

    return this.savingsRepository.runInTransaction(async (db) => {
      const transaction = await this.savingsRepository.createTransaction(
        {
          savingId: saving.id,
          userId: saving.userId,
          type: SavingTransactionType.WITHDRAWAL,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf: withdrawalAmountRwf,
          date: new Date(payload.date),
          note: payload.note ?? null,
        },
        db,
      );

      await this.savingsRepository.createMoneyMovement(
        {
          userId: saving.userId,
          type: MoneyMovementType.SAVING_WITHDRAWAL,
          amount: new Prisma.Decimal(payload.amount),
          currency: payload.currency,
          amountRwf: withdrawalAmountRwf,
          date: new Date(payload.date),
          note: payload.note ?? null,
          savingTransactionId: transaction.id,
        },
        db,
      );

      if (saving.stillHave !== remainingBalanceRwf.greaterThan(0)) {
        await this.savingsRepository.update(
          saving.id,
          { stillHave: remainingBalanceRwf.greaterThan(0) },
          db,
        );
      }

      return this.findSavingByIdOrThrow(saving.id, saving.userId, db);
    });
  }

  async reverseCurrentUserSavingDeposit(
    userId: string,
    savingId: string,
    transactionId: string,
  ): Promise<SavingWithCreator> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const saving = await this.findVisibleSavingOrThrow(userId, savingId);
    const transaction =
      await this.savingsRepository.findTransactionByIdAndSavingId(
        transactionId,
        saving.id,
      );

    if (!transaction) {
      throw new NotFoundException('Saving transaction was not found.');
    }

    if (transaction.type !== SavingTransactionType.DEPOSIT) {
      throw new BadRequestException(
        'Only deposit transactions can be reversed.',
      );
    }

    if (transaction.incomeSources.length === 0) {
      throw new BadRequestException(
        'Only traced saving deposits can be reversed.',
      );
    }

    const currentBalanceRwf = this.calculateCurrentBalanceRwf(saving);
    const reversalAmountRwf = new Prisma.Decimal(transaction.amountRwf);

    if (reversalAmountRwf.greaterThan(currentBalanceRwf)) {
      throw new BadRequestException(
        `This deposit cannot be reversed because the saving balance is only RWF ${currentBalanceRwf.toFixed(0)}.`,
      );
    }

    const reversalDate = new Date();
    const reversalNote = `Reversal of deposit from ${transaction.date.toISOString().slice(0, 10)}`;
    const originalNote = transaction.note
      ? `${transaction.note} [Reversal recorded ${reversalDate.toISOString().slice(0, 10)}]`
      : `Deposit reversed on ${reversalDate.toISOString().slice(0, 10)}`;
    const remainingBalanceRwf = currentBalanceRwf.minus(reversalAmountRwf);

    return this.savingsRepository.runInTransaction(async (db) => {
      await this.savingsRepository.deleteTransactionIncomeSources(
        transaction.id,
        db,
      );

      await this.savingsRepository.updateTransaction(
        transaction.id,
        {
          note: originalNote,
        },
        db,
      );

      const reversalTransaction =
        await this.savingsRepository.createTransaction(
          {
            savingId: saving.id,
            userId: saving.userId,
            type: SavingTransactionType.WITHDRAWAL,
            amount: transaction.amount,
            currency: transaction.currency,
            amountRwf: transaction.amountRwf,
            date: reversalDate,
            note: reversalNote,
          },
          db,
        );

      await this.savingsRepository.createMoneyMovement(
        {
          userId: saving.userId,
          type: MoneyMovementType.SAVING_WITHDRAWAL,
          amount: transaction.amount,
          currency: transaction.currency,
          amountRwf: transaction.amountRwf,
          date: reversalDate,
          note: reversalNote,
          savingTransactionId: reversalTransaction.id,
        },
        db,
      );

      if (saving.stillHave !== remainingBalanceRwf.greaterThan(0)) {
        await this.savingsRepository.update(
          saving.id,
          { stillHave: remainingBalanceRwf.greaterThan(0) },
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

  private calculateCurrentBalanceRwf(
    saving: SavingWithCreator,
  ): Prisma.Decimal {
    return saving.transactions.reduce((balance, transaction) => {
      const amountRwf = new Prisma.Decimal(transaction.amountRwf);

      if (transaction.type === SavingTransactionType.DEPOSIT) {
        return balance.add(amountRwf);
      }

      if (transaction.type === SavingTransactionType.WITHDRAWAL) {
        return balance.minus(amountRwf);
      }

      return balance.add(amountRwf);
    }, new Prisma.Decimal(0));
  }

  private parseDateOnly(value: string): Date {
    const dateOnly = value.slice(0, 10);
    return new Date(`${dateOnly}T00:00:00.000Z`);
  }

  private assertValidTimeframe(startDate: Date, endDate: Date): void {
    if (endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'End date must be the same as or later than the start date.',
      );
    }
  }

  private async resolveCreateTargetConfig(
    payload: CreateSavingRequestDto,
  ): Promise<{
    targetAmount: Prisma.Decimal | null;
    targetCurrency: Currency | null;
    targetAmountRwf: Prisma.Decimal | null;
    startDate: Date | null;
    endDate: Date | null;
  }> {
    const hasAnyTargetField =
      payload.targetAmount !== undefined ||
      payload.startDate !== undefined ||
      payload.endDate !== undefined;

    if (!hasAnyTargetField) {
      return {
        targetAmount: null,
        targetCurrency: null,
        targetAmountRwf: null,
        startDate: null,
        endDate: null,
      };
    }

    if (payload.targetAmount === undefined || payload.endDate === undefined) {
      throw new BadRequestException(
        'Target amount and end date are required when the saving has a target.',
      );
    }

    const startDate = this.parseDateOnly(payload.startDate ?? payload.date);
    const endDate = this.parseDateOnly(payload.endDate);
    this.assertValidTimeframe(startDate, endDate);

    return {
      targetAmount: new Prisma.Decimal(payload.targetAmount),
      targetCurrency: payload.targetCurrency,
      targetAmountRwf: await this.currencyService.convertToRwf(
        payload.targetAmount,
        payload.targetCurrency,
      ),
      startDate,
      endDate,
    };
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
