import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import {
  AnalyticsRangeInput,
  CompletedReceivedTransactionTotals,
  ReceivedTransactionAnalyticsPeriodData,
} from '../../analytics/transaction-analytics.types';

@Injectable()
export class ReceivedTransactionAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCompletedTotals(
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
  ): Promise<ReceivedTransactionAnalyticsPeriodData> {
    const completedWhere = this.completedReceivedTransactionsWhere(input);

    const [
      received,
      classificationGroups,
      evidenceGroups,
      receivedReversedTransactions,
    ] = await Promise.all([
      this.getCompletedTotals(input),

      this.prisma.receivedTransaction.groupBy({
        by: ['classification'],

        where: completedWhere,

        _count: {
          _all: true,
        },

        _sum: {
          amount: true,
        },
      }),

      this.prisma.receivedTransaction.groupBy({
        by: ['evidenceSource'],

        where: completedWhere,

        _count: {
          _all: true,
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
    ]);

    return {
      received,

      receivedReversedTransactions,

      receivedEvidence: {
        smsEvidence:
          evidenceGroups.find(
            (group) =>
              group.evidenceSource ===
              ReceivedTransactionEvidenceSource.PROVIDER_SMS,
          )?._count._all ?? 0,

        providerApiEvidence:
          evidenceGroups.find(
            (group) =>
              group.evidenceSource ===
              ReceivedTransactionEvidenceSource.PROVIDER_API,
          )?._count._all ?? 0,

        manualEntries:
          evidenceGroups.find(
            (group) =>
              group.evidenceSource === ReceivedTransactionEvidenceSource.MANUAL,
          )?._count._all ?? 0,
      },

      receivedClassifications: classificationGroups.map((group) => ({
        classification: group.classification,

        transactions: group._count._all,

        receivedAmount: group._sum.amount ?? 0,
      })),
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
