import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
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

export interface CompletedReceivedTransactionTotals {
  transactions: number;

  receivedAmount: number;
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

export interface ReceivedTransactionClassificationAnalyticsRow {
  classification: ReceivedTransactionClassification;

  transactions: number;

  receivedAmount: number;
}

export interface ReceivedTransactionEvidenceAnalytics {
  smsEvidence: number;

  providerApiEvidence: number;

  manualEntries: number;
}

export interface TransactionAnalyticsPeriodData {
  completed: CompletedTransactionTotals;

  received: CompletedReceivedTransactionTotals;

  pendingTransactions: number;

  processingTransactions: number;

  failedTransactions: number;

  cancelledTransactions: number;

  reversedTransactions: number;

  receivedReversedTransactions: number;

  smsEvidence: number;

  providerApiConfirmed: number;

  manuallyConfirmed: number;

  receivedEvidence: ReceivedTransactionEvidenceAnalytics;

  categories: TransactionCategoryAnalyticsRow[];

  transferTypes: TransactionTransferTypeAnalyticsRow[];

  receivedClassifications: ReceivedTransactionClassificationAnalyticsRow[];
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

  async getCompletedReceivedTotals(
    input: AnalyticsRangeInput,
  ): Promise<CompletedReceivedTransactionTotals> {
    const aggregate = await this.prisma.receivedTransaction.aggregate({
      where: this.completedReceivedTransactionsWhere(input),

      _count: {
        _all: true,
      },

      _sum: {
        amount: true,
      },
    });

    return {
      transactions: aggregate._count._all,

      receivedAmount: aggregate._sum.amount ?? 0,
    };
  }

  async getPeriodData(
    input: AnalyticsRangeInput,
  ): Promise<TransactionAnalyticsPeriodData> {
    const completedWhere = this.completedTransactionsWhere(input);

    const completedReceivedWhere =
      this.completedReceivedTransactionsWhere(input);

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
      received,
      categoryGroups,
      transferTypeGroups,
      receivedClassificationGroups,
      receivedEvidenceGroups,
      pendingTransactions,
      processingTransactions,
      failedTransactions,
      cancelledTransactions,
      reversedTransactions,
      receivedReversedTransactions,
      smsEvidence,
      providerApiConfirmed,
      manuallyConfirmed,
    ] = await Promise.all([
      this.getCompletedTotals(input),

      this.getCompletedReceivedTotals(input),

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

      this.prisma.receivedTransaction.groupBy({
        by: ['classification'],

        where: completedReceivedWhere,

        _count: {
          _all: true,
        },

        _sum: {
          amount: true,
        },
      }),

      this.prisma.receivedTransaction.groupBy({
        by: ['evidenceSource'],

        where: completedReceivedWhere,

        _count: {
          _all: true,
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

      this.prisma.receivedTransaction.count({
        where: {
          userId: input.userId,

          status: ReceivedTransactionStatus.REVERSED,

          reversedAt: {
            gte: input.from,

            lte: input.to,
          },
        },
      }),

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

      this.prisma.transaction.count({
        where: {
          ...completedWhere,

          events: {
            some: providerApiCompletionEvent,
          },
        },
      }),

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

      received,

      pendingTransactions,

      processingTransactions,

      failedTransactions,

      cancelledTransactions,

      reversedTransactions,

      receivedReversedTransactions,

      smsEvidence,

      providerApiConfirmed,

      manuallyConfirmed,

      receivedEvidence: {
        smsEvidence:
          receivedEvidenceGroups.find(
            (group) =>
              group.evidenceSource ===
              ReceivedTransactionEvidenceSource.PROVIDER_SMS,
          )?._count._all ?? 0,

        providerApiEvidence:
          receivedEvidenceGroups.find(
            (group) =>
              group.evidenceSource ===
              ReceivedTransactionEvidenceSource.PROVIDER_API,
          )?._count._all ?? 0,

        manualEntries:
          receivedEvidenceGroups.find(
            (group) =>
              group.evidenceSource === ReceivedTransactionEvidenceSource.MANUAL,
          )?._count._all ?? 0,
      },

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

      receivedClassifications: receivedClassificationGroups.map((group) => ({
        classification: group.classification,

        transactions: group._count._all,

        receivedAmount: group._sum.amount ?? 0,
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

  private completedReceivedTransactionsWhere(
    input: AnalyticsRangeInput,
  ): Prisma.ReceivedTransactionWhereInput {
    return {
      userId: input.userId,

      status: ReceivedTransactionStatus.COMPLETED,

      occurredAt: {
        gte: input.from,

        lte: input.to,
      },
    };
  }
}
