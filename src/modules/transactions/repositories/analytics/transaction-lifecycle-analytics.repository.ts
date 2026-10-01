import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../../../database/prisma/prisma.service';
import {
  AnalyticsRangeInput,
  TransactionLifecycleAnalyticsPeriodData,
} from '../../analytics/transaction-analytics.types';

@Injectable()
export class TransactionLifecycleAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPeriodData(
    input: AnalyticsRangeInput,
  ): Promise<TransactionLifecycleAnalyticsPeriodData> {
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
      pendingTransactions,
      processingTransactions,
      failedTransactions,
      cancelledTransactions,
      reversedTransactions,
      smsEvidence,
      providerApiConfirmed,
      manuallyConfirmed,
    ] = await Promise.all([
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

      // SMS evidence is counted only when the
      // transaction does not also have stronger
      // provider API confirmation.
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

      // Provider API evidence has the strongest
      // confirmation precedence.
      this.prisma.transaction.count({
        where: {
          ...completedWhere,

          events: {
            some: providerApiCompletionEvent,
          },
        },
      }),

      // Manual confirmation is counted only when
      // no provider API or SMS completion evidence
      // exists for the transaction.
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
      pendingTransactions,

      processingTransactions,

      failedTransactions,

      cancelledTransactions,

      reversedTransactions,

      smsEvidence,

      providerApiConfirmed,

      manuallyConfirmed,
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
