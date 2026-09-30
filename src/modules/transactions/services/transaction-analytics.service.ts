import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';

import { TransactionAnalyticsQueryDto } from '../dto/transaction-analytics.query.dto';
import { TransactionAnalyticsResponseDto } from '../dto/transaction-analytics.response.dto';
import {
  CompletedTransactionTotals,
  TransactionAnalyticsRepository,
} from '../transaction-analytics.repository';

@Injectable()
export class TransactionAnalyticsService {
  constructor(
    private readonly analyticsRepository: TransactionAnalyticsRepository,
  ) {}

  async getAnalytics(
    userId: string,
    query: TransactionAnalyticsQueryDto,
  ): Promise<TransactionAnalyticsResponseDto> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    this.assertValidRange(from, to);

    const periodDurationMs = to.getTime() - from.getTime() + 1;

    const previousFrom = new Date(from.getTime() - periodDurationMs);

    const previousTo = new Date(from.getTime() - 1);

    const [current, previous] = await Promise.all([
      this.analyticsRepository.getPeriodData({
        userId,
        from,
        to,
      }),

      this.analyticsRepository.getCompletedTotals({
        userId,
        from: previousFrom,
        to: previousTo,
      }),
    ]);

    const completedAmount = current.completed.sentAmount;

    const categories = [...current.categories]
      .sort((left, right) => {
        if (right.sentAmount !== left.sentAmount) {
          return right.sentAmount - left.sentAmount;
        }

        if (right.transactions !== left.transactions) {
          return right.transactions - left.transactions;
        }

        return left.category.localeCompare(right.category);
      })
      .map((category) => ({
        ...category,

        percentage: this.sharePercentage(category.sentAmount, completedAmount),
      }));

    const transferTypes = [...current.transferTypes]
      .sort((left, right) => {
        if (right.sentAmount !== left.sentAmount) {
          return right.sentAmount - left.sentAmount;
        }

        if (right.transactions !== left.transactions) {
          return right.transactions - left.transactions;
        }

        return left.transferType.localeCompare(right.transferType);
      })
      .map((transferType) => ({
        ...transferType,

        percentage: this.sharePercentage(
          transferType.sentAmount,
          completedAmount,
        ),
      }));

    const classifiedConfirmations =
      current.smsEvidence +
      current.providerApiConfirmed +
      current.manuallyConfirmed;

    return {
      currency: Currency.RWF,

      period: {
        from: from.toISOString(),
        to: to.toISOString(),

        previousFrom: previousFrom.toISOString(),

        previousTo: previousTo.toISOString(),
      },

      summary: {
        sentAmount: current.completed.sentAmount,

        feesPaid: current.completed.feesPaid,

        totalDebited: current.completed.totalDebited,

        completedTransactions: current.completed.transactions,

        pendingTransactions: current.pendingTransactions,

        processingTransactions: current.processingTransactions,

        needsConfirmation:
          current.pendingTransactions + current.processingTransactions,

        failedTransactions: current.failedTransactions,

        cancelledTransactions: current.cancelledTransactions,

        reversedTransactions: current.reversedTransactions,
      },

      comparison: this.buildComparison(current.completed, previous),

      confirmation: {
        smsEvidence: current.smsEvidence,

        providerApiConfirmed: current.providerApiConfirmed,

        manuallyConfirmed: current.manuallyConfirmed,

        unclassified: Math.max(
          current.completed.transactions - classifiedConfirmations,
          0,
        ),
      },

      categories,

      transferTypes,
    };
  }

  private assertValidRange(from: Date, to: Date): void {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException(
        'Analytics period must contain valid dates.',
      );
    }

    if (from.getTime() > to.getTime()) {
      throw new BadRequestException(
        'Analytics from date must be earlier than or equal to the to date.',
      );
    }
  }

  private buildComparison(
    current: CompletedTransactionTotals,
    previous: CompletedTransactionTotals,
  ) {
    return {
      previousSentAmount: previous.sentAmount,

      sentAmountChangePercentage: this.changePercentage(
        current.sentAmount,
        previous.sentAmount,
      ),

      previousFeesPaid: previous.feesPaid,

      feesPaidChangePercentage: this.changePercentage(
        current.feesPaid,
        previous.feesPaid,
      ),

      previousTotalDebited: previous.totalDebited,

      totalDebitedChangePercentage: this.changePercentage(
        current.totalDebited,
        previous.totalDebited,
      ),

      previousCompletedTransactions: previous.transactions,

      completedTransactionsChangePercentage: this.changePercentage(
        current.transactions,
        previous.transactions,
      ),
    };
  }

  private sharePercentage(amount: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return this.roundPercentage((amount / total) * 100);
  }

  private changePercentage(current: number, previous: number): number | null {
    if (previous === 0) {
      return current === 0 ? 0 : null;
    }

    return this.roundPercentage(((current - previous) / previous) * 100);
  }

  private roundPercentage(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
