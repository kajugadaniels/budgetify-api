import { SavingTransactionType } from '@prisma/client';

import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { PaginatedSavingResponseDto } from '../dto/paginated-saving.response.dto';
import { SavingResponseDto } from '../dto/saving-response.dto';
import { SavingTransactionResponseDto } from '../dto/saving-transaction.response.dto';
import {
  SavingTransactionWithSources,
  SavingWithCreator,
} from '../savings.repository';

export class SavingsMapper {
  static toSavingResponse(saving: SavingWithCreator): SavingResponseDto {
    const totals = saving.transactions.reduce(
      (accumulator, transaction) => {
        const amountRwf = Number(transaction.amountRwf);

        if (transaction.type === SavingTransactionType.DEPOSIT) {
          accumulator.totalDepositedRwf += amountRwf;
        }

        if (transaction.type === SavingTransactionType.WITHDRAWAL) {
          accumulator.totalWithdrawnRwf += amountRwf;
        }

        if (transaction.type === SavingTransactionType.ADJUSTMENT) {
          accumulator.adjustmentRwf += amountRwf;
        }

        return accumulator;
      },
      {
        totalDepositedRwf: 0,
        totalWithdrawnRwf: 0,
        adjustmentRwf: 0,
      },
    );

    const currentBalanceRwf =
      totals.totalDepositedRwf -
      totals.totalWithdrawnRwf +
      totals.adjustmentRwf;
    const timeframeDays =
      saving.startDate && saving.endDate
        ? SavingsMapper.countTimeframeDays(saving.startDate, saving.endDate)
        : null;
    const targetAmountRwf =
      saving.targetAmountRwf === null ? null : Number(saving.targetAmountRwf);
    const targetProgressPercentage =
      targetAmountRwf !== null && targetAmountRwf > 0
        ? Math.min(
            Math.max((currentBalanceRwf / targetAmountRwf) * 100, 0),
            100,
          )
        : null;
    const timeframeProgressPercentage =
      saving.startDate && saving.endDate
        ? SavingsMapper.resolveTimeframeProgressPercentage(
            saving.startDate,
            saving.endDate,
          )
        : null;

    return {
      id: saving.id,
      label: saving.label,
      amount: Number(saving.amount),
      currency: saving.currency,
      amountRwf: Number(saving.amountRwf),
      targetAmount:
        saving.targetAmount === null ? null : Number(saving.targetAmount),
      targetCurrency: saving.targetCurrency,
      targetAmountRwf,
      startDate: saving.startDate
        ? saving.startDate.toISOString().slice(0, 10)
        : null,
      endDate: saving.endDate
        ? saving.endDate.toISOString().slice(0, 10)
        : null,
      timeframeDays,
      targetProgressPercentage,
      timeframeProgressPercentage,
      totalDepositedRwf: totals.totalDepositedRwf,
      totalWithdrawnRwf: totals.totalWithdrawnRwf,
      currentBalanceRwf,
      date: saving.date,
      note: saving.note,
      stillHave: saving.stillHave,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt,
      createdBy: {
        id: saving.user.id,
        firstName: saving.user.firstName,
        lastName: saving.user.lastName,
        avatarUrl: saving.user.avatarUrl,
      },
    };
  }

  static toSavingResponseList(
    savings: SavingWithCreator[],
  ): SavingResponseDto[] {
    return savings.map((saving) => SavingsMapper.toSavingResponse(saving));
  }

  static toPaginatedSavingResponse(
    payload: PaginatedResponse<SavingWithCreator>,
  ): PaginatedSavingResponseDto {
    return {
      items: SavingsMapper.toSavingResponseList(payload.items),
      meta: payload.meta,
    };
  }

  static toSavingTransactionResponse(
    transaction: SavingTransactionWithSources,
  ): SavingTransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      amountRwf: Number(transaction.amountRwf),
      date: transaction.date,
      note: transaction.note,
      incomeSources: transaction.incomeSources.map((source) => ({
        id: source.id,
        incomeId: source.incomeId,
        incomeLabel: source.income.label,
        incomeCategory: source.income.category,
        amount: Number(source.amount),
        currency: source.currency,
        amountRwf: Number(source.amountRwf),
      })),
      createdAt: transaction.createdAt,
    };
  }

  static toSavingTransactionResponseList(
    transactions: SavingTransactionWithSources[],
  ): SavingTransactionResponseDto[] {
    return transactions.map((transaction) =>
      SavingsMapper.toSavingTransactionResponse(transaction),
    );
  }

  private static countTimeframeDays(startDate: Date, endDate: Date): number {
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const normalizedStart = Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    );
    const normalizedEnd = Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    );

    return (
      Math.floor((normalizedEnd - normalizedStart) / millisecondsPerDay) + 1
    );
  }

  private static resolveTimeframeProgressPercentage(
    startDate: Date,
    endDate: Date,
  ): number {
    const totalDays = SavingsMapper.countTimeframeDays(startDate, endDate);
    if (totalDays <= 0) {
      return 100;
    }

    const now = new Date();
    const todayUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const startUtc = Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    );
    const endUtc = Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    );

    if (todayUtc <= startUtc) {
      return 0;
    }

    if (todayUtc >= endUtc) {
      return 100;
    }

    const elapsedDays = Math.floor(
      (todayUtc - startUtc) / (24 * 60 * 60 * 1000),
    );
    return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
  }
}
