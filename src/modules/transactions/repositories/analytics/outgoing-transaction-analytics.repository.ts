import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma/prisma.service';
import {
  AnalyticsRangeInput,
  CompletedTransactionTotals,
  OutgoingTransactionAnalyticsPeriodData,
} from '../../analytics/transaction-analytics.types';

@Injectable()
export class OutgoingTransactionAnalyticsRepository {
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
  ): Promise<OutgoingTransactionAnalyticsPeriodData> {
    const completedWhere = this.completedTransactionsWhere(input);

    const [completed, categoryGroups, transferTypeGroups] = await Promise.all([
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
    ]);

    return {
      completed,

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
