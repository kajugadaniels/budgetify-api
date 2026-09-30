import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TransactionCategory,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

interface AnalyticsRangeInput {
  userId: string;
  from: Date;
  to: Date;
}

export interface CompletedTransactionTotals {
  transactions: number;
  sentAmount: number;
  feesPaid: number;
  totalDebited: number;
}

export interface TransactionCategoryAnalyticsRow {
  category: TransactionCategory;
  transactions: number;
  sentAmount: number;
  feesPaid: number;
  totalDebited: number;
}

export interface TransactionTransferTypeAnalyticsRow {
  transferType: TransactionTransferType;
  transactions: number;
  sentAmount: number;
  feesPaid: number;
  totalDebited: number;
}

export interface TransactionAnalyticsPeriodData {
  completed: CompletedTransactionTotals;

  pendingTransactions: number;
  processingTransactions: number;
  failedTransactions: number;
  cancelledTransactions: number;
  reversedTransactions: number;

  smsEvidence: number;
  providerApiConfirmed: number;
  manuallyConfirmed: number;

  categories: TransactionCategoryAnalyticsRow[];

  transferTypes: TransactionTransferTypeAnalyticsRow[];
}

@Injectable()
export class TransactionAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletedTotals(
    input: AnalyticsRangeInput,
  ): Promise<CompletedTransactionTotals> {
    const aggregate = await this.prisma.transaction.aggregate({
      where: this.completedTransactionsWhere(input),
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
        feeAmount: true,
        totalAmount: true,
      },
    });

    return {
      transactions: aggregate._count._all,
      sentAmount: aggregate._sum.amount ?? 0,
      feesPaid: aggregate._sum.feeAmount ?? 0,
      totalDebited: aggregate._sum.totalAmount ?? 0,
    };
  }

  async getPeriodData(
    input: AnalyticsRangeInput,
  ): Promise<TransactionAnalyticsPeriodData> {
    const completedWhere = this.completedTransactionsWhere(input);

    const providerApiCompletionEvent: Prisma.TransactionEventWhereInput = {
      type: TransactionEventType.PROVIDER_RESULT_RECEIVED,
      source: TransactionEventSource.PROVIDER_API,
      toStatus: TransactionStatus.COMPLETED,
    };

    const smsCompletionEvent: Prisma.TransactionEventWhereInput = {
      type: TransactionEventType.PROVIDER_RESULT_RECEIVED,
      source: TransactionEventSource.PROVIDER_SMS,
      toStatus: TransactionStatus.COMPLETED,
    };

    const manualCompletionEvent: Prisma.TransactionEventWhereInput = {
      type: TransactionEventType.STATUS_CHANGED,
      source: TransactionEventSource.MOBILE_APP,
      toStatus: TransactionStatus.COMPLETED,
    };

    const [
      completed,
      categoryGroups,
      transferTypeGroups,
      pendingTransactions,
      processingTransactions,
      failedTransactions,
      cancelledTransactions,
      reversedTransactions,
      smsEvidence,
      providerApiConfirmed,
      manuallyConfirmed,
    ] = await Promise.all([
      this.getCompletedTotals(input),

      this.prisma.transaction.groupBy({
        by: ['category'],
        where: completedWhere,
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
          feeAmount: true,
          totalAmount: true,
        },
      }),

      this.prisma.transaction.groupBy({
        by: ['transferType'],
        where: completedWhere,
        _count: {
          _all: true,
        },
        _sum: {
          amount: true,
          feeAmount: true,
          totalAmount: true,
        },
      }),

      this.prisma.transaction.count({
        where: {
          userId: input.userId,
          status: TransactionStatus.PENDING,
          createdAt: {
            gte: input.from,
            lte: input.to,
          },
        },
      }),

      this.prisma.transaction.count({
        where: {
          userId: input.userId,
          status: TransactionStatus.PROCESSING,
          processedAt: {
            gte: input.from,
            lte: input.to,
          },
        },
      }),

      this.prisma.transaction.count({
        where: {
          userId: input.userId,
          status: TransactionStatus.FAILED,
          failedAt: {
            gte: input.from,
            lte: input.to,
          },
        },
      }),

      this.prisma.transaction.count({
        where: {
          userId: input.userId,
          status: TransactionStatus.CANCELLED,
          cancelledAt: {
            gte: input.from,
            lte: input.to,
          },
        },
      }),

      this.prisma.transaction.count({
        where: {
          userId: input.userId,
          status: TransactionStatus.REVERSED,
          reversedAt: {
            gte: input.from,
            lte: input.to,
          },
        },
      }),

      // SMS evidence is client-observed evidence parsed from the
      // device. If a transaction also has provider API evidence,
      // the stronger provider API provenance takes precedence.
      this.prisma.transaction.count({
        where: {
          ...completedWhere,

          AND: [
            {
              events: {
                some: smsCompletionEvent,
              },
            },
            {
              events: {
                none: providerApiCompletionEvent,
              },
            },
          ],
        },
      }),

      // Provider API evidence has the highest provenance priority.
      this.prisma.transaction.count({
        where: {
          ...completedWhere,

          events: {
            some: providerApiCompletionEvent,
          },
        },
      }),

      // Manual confirmation is counted only when the transaction
      // does not also have SMS or provider API completion evidence.
      this.prisma.transaction.count({
        where: {
          ...completedWhere,

          AND: [
            {
              events: {
                some: manualCompletionEvent,
              },
            },
            {
              events: {
                none: providerApiCompletionEvent,
              },
            },
            {
              events: {
                none: smsCompletionEvent,
              },
            },
          ],
        },
      }),
    ]);

    return {
      completed,

      pendingTransactions,
      processingTransactions,
      failedTransactions,
      cancelledTransactions,
      reversedTransactions,

      smsEvidence,
      providerApiConfirmed,
      manuallyConfirmed,

      categories: categoryGroups.map((group) => ({
        category: group.category,
        transactions: group._count._all,
        sentAmount: group._sum.amount ?? 0,
        feesPaid: group._sum.feeAmount ?? 0,
        totalDebited: group._sum.totalAmount ?? 0,
      })),

      transferTypes: transferTypeGroups.map((group) => ({
        transferType: group.transferType,
        transactions: group._count._all,
        sentAmount: group._sum.amount ?? 0,
        feesPaid: group._sum.feeAmount ?? 0,
        totalDebited: group._sum.totalAmount ?? 0,
      })),
    };
  }

  private completedTransactionsWhere(
    input: AnalyticsRangeInput,
  ): Prisma.TransactionWhereInput {
    return {
      userId: input.userId,

      status: TransactionStatus.COMPLETED,

      completedAt: {
        gte: input.from,
        lte: input.to,
      },
    };
  }
}
