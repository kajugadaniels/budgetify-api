import { BadRequestException } from '@nestjs/common';
import { TransactionCategory, TransactionTransferType } from '@prisma/client';

import {
  CompletedTransactionTotals,
  TransactionAnalyticsPeriodData,
  TransactionAnalyticsRepository,
} from '../transaction-analytics.repository';
import { TransactionAnalyticsService } from './transaction-analytics.service';

describe('TransactionAnalyticsService', () => {
  let repository: jest.Mocked<TransactionAnalyticsRepository>;

  let service: TransactionAnalyticsService;

  beforeEach(() => {
    repository = {
      getPeriodData: jest.fn(),

      getCompletedTotals: jest.fn(),
    } as unknown as jest.Mocked<TransactionAnalyticsRepository>;

    service = new TransactionAnalyticsService(repository);
  });

  it('builds completed transaction analytics and previous-period comparison', async () => {
    const current: TransactionAnalyticsPeriodData = {
      completed: {
        transactions: 4,
        sentAmount: 100000,
        feesPaid: 1200,
        totalDebited: 101200,
      },

      pendingTransactions: 1,
      processingTransactions: 2,
      failedTransactions: 1,
      cancelledTransactions: 1,
      reversedTransactions: 0,

      smsEvidence: 2,
      providerApiConfirmed: 1,
      manuallyConfirmed: 1,

      categories: [
        {
          category: TransactionCategory.FOOD_DINING,
          transactions: 1,
          sentAmount: 30000,
          feesPaid: 200,
          totalDebited: 30200,
        },
        {
          category: TransactionCategory.TRANSPORT,
          transactions: 3,
          sentAmount: 70000,
          feesPaid: 1000,
          totalDebited: 71000,
        },
      ],

      transferTypes: [
        {
          transferType: TransactionTransferType.MOMO_PAY,
          transactions: 1,
          sentAmount: 20000,
          feesPaid: 0,
          totalDebited: 20000,
        },
        {
          transferType: TransactionTransferType.MOMO_TO_MOMO,
          transactions: 3,
          sentAmount: 80000,
          feesPaid: 1200,
          totalDebited: 81200,
        },
      ],
    };

    const previous: CompletedTransactionTotals = {
      transactions: 2,
      sentAmount: 80000,
      feesPaid: 800,
      totalDebited: 80800,
    };

    repository.getPeriodData.mockResolvedValue(current);

    repository.getCompletedTotals.mockResolvedValue(previous);

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-11T00:00:00.000Z',
      to: '2026-09-20T23:59:59.999Z',
    });

    expect(repository.getPeriodData.mock.calls).toEqual([
      [
        {
          userId: 'user-1',
          from: new Date('2026-09-11T00:00:00.000Z'),
          to: new Date('2026-09-20T23:59:59.999Z'),
        },
      ],
    ]);

    expect(repository.getCompletedTotals.mock.calls).toEqual([
      [
        {
          userId: 'user-1',
          from: new Date('2026-09-01T00:00:00.000Z'),
          to: new Date('2026-09-10T23:59:59.999Z'),
        },
      ],
    ]);

    expect(result.period).toEqual({
      from: '2026-09-11T00:00:00.000Z',

      to: '2026-09-20T23:59:59.999Z',

      previousFrom: '2026-09-01T00:00:00.000Z',

      previousTo: '2026-09-10T23:59:59.999Z',
    });

    expect(result.summary).toEqual({
      sentAmount: 100000,
      feesPaid: 1200,
      totalDebited: 101200,

      completedTransactions: 4,

      pendingTransactions: 1,
      processingTransactions: 2,
      needsConfirmation: 3,

      failedTransactions: 1,
      cancelledTransactions: 1,
      reversedTransactions: 0,
    });

    expect(result.comparison).toEqual({
      previousSentAmount: 80000,
      sentAmountChangePercentage: 25,

      previousFeesPaid: 800,
      feesPaidChangePercentage: 50,

      previousTotalDebited: 80800,
      totalDebitedChangePercentage: 25.25,

      previousCompletedTransactions: 2,
      completedTransactionsChangePercentage: 100,
    });

    expect(result.confirmation).toEqual({
      smsEvidence: 2,
      providerApiConfirmed: 1,
      manuallyConfirmed: 1,
      unclassified: 0,
    });

    expect(result.categories).toEqual([
      {
        category: TransactionCategory.TRANSPORT,
        transactions: 3,
        sentAmount: 70000,
        feesPaid: 1000,
        totalDebited: 71000,
        percentage: 70,
      },
      {
        category: TransactionCategory.FOOD_DINING,
        transactions: 1,
        sentAmount: 30000,
        feesPaid: 200,
        totalDebited: 30200,
        percentage: 30,
      },
    ]);

    expect(result.transferTypes).toEqual([
      {
        transferType: TransactionTransferType.MOMO_TO_MOMO,
        transactions: 3,
        sentAmount: 80000,
        feesPaid: 1200,
        totalDebited: 81200,
        percentage: 80,
      },
      {
        transferType: TransactionTransferType.MOMO_PAY,
        transactions: 1,
        sentAmount: 20000,
        feesPaid: 0,
        totalDebited: 20000,
        percentage: 20,
      },
    ]);
  });

  it('returns null percentage change when the previous value is zero and the current value is non-zero', async () => {
    repository.getPeriodData.mockResolvedValue({
      completed: {
        transactions: 1,
        sentAmount: 25000,
        feesPaid: 100,
        totalDebited: 25100,
      },

      pendingTransactions: 0,
      processingTransactions: 0,
      failedTransactions: 0,
      cancelledTransactions: 0,
      reversedTransactions: 0,

      smsEvidence: 1,
      providerApiConfirmed: 0,
      manuallyConfirmed: 0,

      categories: [],
      transferTypes: [],
    });

    repository.getCompletedTotals.mockResolvedValue({
      transactions: 0,
      sentAmount: 0,
      feesPaid: 0,
      totalDebited: 0,
    });

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-01T23:59:59.999Z',
    });

    expect(result.comparison.sentAmountChangePercentage).toBeNull();

    expect(result.comparison.feesPaidChangePercentage).toBeNull();

    expect(result.comparison.completedTransactionsChangePercentage).toBeNull();
  });

  it('returns zero percentage change when both periods contain zero', async () => {
    repository.getPeriodData.mockResolvedValue({
      completed: {
        transactions: 0,
        sentAmount: 0,
        feesPaid: 0,
        totalDebited: 0,
      },

      pendingTransactions: 0,
      processingTransactions: 0,
      failedTransactions: 0,
      cancelledTransactions: 0,
      reversedTransactions: 0,

      smsEvidence: 0,
      providerApiConfirmed: 0,
      manuallyConfirmed: 0,

      categories: [],
      transferTypes: [],
    });

    repository.getCompletedTotals.mockResolvedValue({
      transactions: 0,
      sentAmount: 0,
      feesPaid: 0,
      totalDebited: 0,
    });

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-01T00:00:00.000Z',
      to: '2026-09-01T23:59:59.999Z',
    });

    expect(result.comparison.sentAmountChangePercentage).toBe(0);

    expect(result.comparison.feesPaidChangePercentage).toBe(0);

    expect(result.comparison.totalDebitedChangePercentage).toBe(0);

    expect(result.comparison.completedTransactionsChangePercentage).toBe(0);
  });

  it('rejects an analytics range where from occurs after to', async () => {
    await expect(
      service.getAnalytics('user-1', {
        from: '2026-09-30T23:59:59.999Z',
        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.getPeriodData.mock.calls).toHaveLength(0);

    expect(repository.getCompletedTotals.mock.calls).toHaveLength(0);
  });
});
