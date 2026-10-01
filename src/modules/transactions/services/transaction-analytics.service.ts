import { BadRequestException, Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';

import {
  CompletedReceivedTransactionTotals,
  CompletedTransactionTotals,
  TransactionAnalyticsPeriodData,
} from '../analytics/transaction-analytics.types';
import { TransactionAnalyticsQueryDto } from '../dto/transaction-analytics.query.dto';
import { TransactionAnalyticsResponseDto } from '../dto/transaction-analytics.response.dto';
import { OutgoingTransactionAnalyticsRepository } from '../repositories/analytics/outgoing-transaction-analytics.repository';
import { ReceivedTransactionAnalyticsRepository } from '../repositories/analytics/received-transaction-analytics.repository';
import { TransactionLifecycleAnalyticsRepository } from '../repositories/analytics/transaction-lifecycle-analytics.repository';

@Injectable()
export class TransactionAnalyticsService {
  constructor(
    private readonly outgoingAnalyticsRepository: OutgoingTransactionAnalyticsRepository,

    private readonly receivedAnalyticsRepository: ReceivedTransactionAnalyticsRepository,

    private readonly lifecycleAnalyticsRepository: TransactionLifecycleAnalyticsRepository,
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

    const [outgoing, received, lifecycle, previousSent, previousReceived] =
      await Promise.all([
        this.outgoingAnalyticsRepository.getPeriodData({
          userId,

          from,

          to,
        }),

        this.receivedAnalyticsRepository.getPeriodData({
          userId,

          from,

          to,
        }),

        this.lifecycleAnalyticsRepository.getPeriodData({
          userId,

          from,

          to,
        }),

        this.outgoingAnalyticsRepository.getCompletedTotals({
          userId,

          from: previousFrom,

          to: previousTo,
        }),

        this.receivedAnalyticsRepository.getCompletedTotals({
          userId,

          from: previousFrom,

          to: previousTo,
        }),
      ]);

    const current: TransactionAnalyticsPeriodData = {
      ...outgoing,

      ...received,

      ...lifecycle,
    };

    const completedSentAmount = current.completed.sentAmount;

    const receivedAmount = current.received.receivedAmount;

    const netCashMovement = receivedAmount - current.completed.totalDebited;

    const previousNetCashMovement =
      previousReceived.receivedAmount - previousSent.totalDebited;

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

        percentage: this.sharePercentage(
          category.sentAmount,
          completedSentAmount,
        ),
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
          completedSentAmount,
        ),
      }));

    const receivedClassifications = [...current.receivedClassifications]
      .sort((left, right) => {
        if (right.receivedAmount !== left.receivedAmount) {
          return right.receivedAmount - left.receivedAmount;
        }

        if (right.transactions !== left.transactions) {
          return right.transactions - left.transactions;
        }

        return left.classification.localeCompare(right.classification);
      })
      .map((classification) => ({
        ...classification,

        percentage: this.sharePercentage(
          classification.receivedAmount,
          receivedAmount,
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

        receivedAmount,

        feesPaid: current.completed.feesPaid,

        totalDebited: current.completed.totalDebited,

        netCashMovement,

        completedTransactions: current.completed.transactions,

        receivedTransactions: current.received.transactions,

        pendingTransactions: current.pendingTransactions,

        processingTransactions: current.processingTransactions,

        needsConfirmation:
          current.pendingTransactions + current.processingTransactions,

        failedTransactions: current.failedTransactions,

        cancelledTransactions: current.cancelledTransactions,

        reversedTransactions: current.reversedTransactions,

        receivedReversedTransactions: current.receivedReversedTransactions,
      },

      comparison: this.buildComparison({
        currentSent: current.completed,

        currentReceived: current.received,

        previousSent,

        previousReceived,

        netCashMovement,

        previousNetCashMovement,
      }),

      confirmation: {
        smsEvidence: current.smsEvidence,

        providerApiConfirmed: current.providerApiConfirmed,

        manuallyConfirmed: current.manuallyConfirmed,

        unclassified: Math.max(
          current.completed.transactions - classifiedConfirmations,
          0,
        ),
      },

      receivedEvidence: current.receivedEvidence,

      categories,

      transferTypes,

      receivedClassifications,
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

  private buildComparison(input: {
    currentSent: CompletedTransactionTotals;

    currentReceived: CompletedReceivedTransactionTotals;

    previousSent: CompletedTransactionTotals;

    previousReceived: CompletedReceivedTransactionTotals;

    netCashMovement: number;

    previousNetCashMovement: number;
  }) {
    return {
      previousSentAmount: input.previousSent.sentAmount,

      sentAmountChangePercentage: this.changePercentage(
        input.currentSent.sentAmount,
        input.previousSent.sentAmount,
      ),

      previousReceivedAmount: input.previousReceived.receivedAmount,

      receivedAmountChangePercentage: this.changePercentage(
        input.currentReceived.receivedAmount,
        input.previousReceived.receivedAmount,
      ),

      previousFeesPaid: input.previousSent.feesPaid,

      feesPaidChangePercentage: this.changePercentage(
        input.currentSent.feesPaid,
        input.previousSent.feesPaid,
      ),

      previousTotalDebited: input.previousSent.totalDebited,

      totalDebitedChangePercentage: this.changePercentage(
        input.currentSent.totalDebited,
        input.previousSent.totalDebited,
      ),

      previousNetCashMovement: input.previousNetCashMovement,

      netCashMovementChange:
        input.netCashMovement - input.previousNetCashMovement,

      previousCompletedTransactions: input.previousSent.transactions,

      completedTransactionsChangePercentage: this.changePercentage(
        input.currentSent.transactions,
        input.previousSent.transactions,
      ),

      previousReceivedTransactions: input.previousReceived.transactions,

      receivedTransactionsChangePercentage: this.changePercentage(
        input.currentReceived.transactions,
        input.previousReceived.transactions,
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
