import { BadRequestException } from '@nestjs/common';
import {
  ReceivedTransactionClassification,
  TransactionCategory,
  TransactionTransferType,
} from '@prisma/client';

import {
  CompletedReceivedTransactionTotals,
  CompletedTransactionTotals,
  TransactionAnalyticsPeriodData,
} from '../analytics/transaction-analytics.types';
import { OutgoingTransactionAnalyticsRepository } from '../repositories/analytics/outgoing-transaction-analytics.repository';
import { ReceivedTransactionAnalyticsRepository } from '../repositories/analytics/received-transaction-analytics.repository';
import { TransactionLifecycleAnalyticsRepository } from '../repositories/analytics/transaction-lifecycle-analytics.repository';
import { TransactionAnalyticsService } from './transaction-analytics.service';

describe('TransactionAnalyticsService', () => {
  let outgoingRepository: jest.Mocked<OutgoingTransactionAnalyticsRepository>;

  let receivedRepository: jest.Mocked<ReceivedTransactionAnalyticsRepository>;

  let lifecycleRepository: jest.Mocked<TransactionLifecycleAnalyticsRepository>;

  let service: TransactionAnalyticsService;

  beforeEach(() => {
    outgoingRepository = {
      getPeriodData: jest.fn(),

      getCompletedTotals: jest.fn(),
    } as unknown as jest.Mocked<OutgoingTransactionAnalyticsRepository>;

    receivedRepository = {
      getPeriodData: jest.fn(),

      getCompletedTotals: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionAnalyticsRepository>;

    lifecycleRepository = {
      getPeriodData: jest.fn(),
    } as unknown as jest.Mocked<TransactionLifecycleAnalyticsRepository>;

    service = new TransactionAnalyticsService(
      outgoingRepository,

      receivedRepository,

      lifecycleRepository,
    );
  });

  function mockCurrentPeriod(current: TransactionAnalyticsPeriodData): void {
    outgoingRepository.getPeriodData.mockResolvedValue({
      completed: current.completed,

      categories: current.categories,

      transferTypes: current.transferTypes,
    });

    receivedRepository.getPeriodData.mockResolvedValue({
      received: current.received,

      receivedReversedTransactions: current.receivedReversedTransactions,

      receivedEvidence: current.receivedEvidence,

      receivedClassifications: current.receivedClassifications,
    });

    lifecycleRepository.getPeriodData.mockResolvedValue({
      pendingTransactions: current.pendingTransactions,

      processingTransactions: current.processingTransactions,

      failedTransactions: current.failedTransactions,

      cancelledTransactions: current.cancelledTransactions,

      reversedTransactions: current.reversedTransactions,

      smsEvidence: current.smsEvidence,

      providerApiConfirmed: current.providerApiConfirmed,

      manuallyConfirmed: current.manuallyConfirmed,
    });
  }

  it('builds combined sent and received analytics with equal-period comparison', async () => {
    const current: TransactionAnalyticsPeriodData = {
      completed: {
        transactions: 4,

        sentAmount: 100000,

        feesPaid: 1200,

        totalDebited: 101200,
      },

      received: {
        transactions: 3,

        receivedAmount: 65000,
      },

      pendingTransactions: 1,

      processingTransactions: 2,

      failedTransactions: 1,

      cancelledTransactions: 1,

      reversedTransactions: 0,

      receivedReversedTransactions: 1,

      smsEvidence: 2,

      providerApiConfirmed: 1,

      manuallyConfirmed: 1,

      receivedEvidence: {
        smsEvidence: 2,

        providerApiEvidence: 0,

        manualEntries: 1,
      },

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

      receivedClassifications: [
        {
          classification: ReceivedTransactionClassification.UNCLASSIFIED,

          transactions: 1,

          receivedAmount: 25000,
        },
        {
          classification: ReceivedTransactionClassification.REIMBURSEMENT,

          transactions: 1,

          receivedAmount: 30000,
        },
        {
          classification: ReceivedTransactionClassification.OWN_TRANSFER,

          transactions: 1,

          receivedAmount: 10000,
        },
      ],
    };

    const previousSent: CompletedTransactionTotals = {
      transactions: 2,

      sentAmount: 80000,

      feesPaid: 800,

      totalDebited: 80800,
    };

    const previousReceived: CompletedReceivedTransactionTotals = {
      transactions: 2,

      receivedAmount: 50000,
    };

    mockCurrentPeriod(current);

    outgoingRepository.getCompletedTotals.mockResolvedValue(previousSent);

    receivedRepository.getCompletedTotals.mockResolvedValue(previousReceived);

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-11T00:00:00.000Z',

      to: '2026-09-20T23:59:59.999Z',
    });

    const currentRange = {
      userId: 'user-1',

      from: new Date('2026-09-11T00:00:00.000Z'),

      to: new Date('2026-09-20T23:59:59.999Z'),
    };

    expect(outgoingRepository.getPeriodData.mock.calls).toEqual([
      [currentRange],
    ]);

    expect(receivedRepository.getPeriodData.mock.calls).toEqual([
      [currentRange],
    ]);

    expect(lifecycleRepository.getPeriodData.mock.calls).toEqual([
      [currentRange],
    ]);

    expect(outgoingRepository.getCompletedTotals.mock.calls).toEqual([
      [
        {
          userId: 'user-1',

          from: new Date('2026-09-01T00:00:00.000Z'),

          to: new Date('2026-09-10T23:59:59.999Z'),
        },
      ],
    ]);

    expect(receivedRepository.getCompletedTotals.mock.calls).toEqual([
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

      receivedAmount: 65000,

      feesPaid: 1200,

      totalDebited: 101200,

      netCashMovement: -36200,

      completedTransactions: 4,

      receivedTransactions: 3,

      pendingTransactions: 1,

      processingTransactions: 2,

      needsConfirmation: 3,

      failedTransactions: 1,

      cancelledTransactions: 1,

      reversedTransactions: 0,

      receivedReversedTransactions: 1,
    });

    expect(result.comparison).toEqual({
      previousSentAmount: 80000,

      sentAmountChangePercentage: 25,

      previousReceivedAmount: 50000,

      receivedAmountChangePercentage: 30,

      previousFeesPaid: 800,

      feesPaidChangePercentage: 50,

      previousTotalDebited: 80800,

      totalDebitedChangePercentage: 25.25,

      previousNetCashMovement: -30800,

      netCashMovementChange: -5400,

      previousCompletedTransactions: 2,

      completedTransactionsChangePercentage: 100,

      previousReceivedTransactions: 2,

      receivedTransactionsChangePercentage: 50,
    });

    expect(result.confirmation).toEqual({
      smsEvidence: 2,

      providerApiConfirmed: 1,

      manuallyConfirmed: 1,

      unclassified: 0,
    });

    expect(result.receivedEvidence).toEqual({
      smsEvidence: 2,

      providerApiEvidence: 0,

      manualEntries: 1,
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

    expect(result.receivedClassifications).toEqual([
      {
        classification: ReceivedTransactionClassification.REIMBURSEMENT,

        transactions: 1,

        receivedAmount: 30000,

        percentage: 46.15,
      },
      {
        classification: ReceivedTransactionClassification.UNCLASSIFIED,

        transactions: 1,

        receivedAmount: 25000,

        percentage: 38.46,
      },
      {
        classification: ReceivedTransactionClassification.OWN_TRANSFER,

        transactions: 1,

        receivedAmount: 10000,

        percentage: 15.38,
      },
    ]);
  });

  it('returns null percentage changes for new sent and received activity', async () => {
    mockCurrentPeriod({
      completed: {
        transactions: 1,

        sentAmount: 25000,

        feesPaid: 100,

        totalDebited: 25100,
      },

      received: {
        transactions: 1,

        receivedAmount: 15000,
      },

      pendingTransactions: 0,

      processingTransactions: 0,

      failedTransactions: 0,

      cancelledTransactions: 0,

      reversedTransactions: 0,

      receivedReversedTransactions: 0,

      smsEvidence: 1,

      providerApiConfirmed: 0,

      manuallyConfirmed: 0,

      receivedEvidence: {
        smsEvidence: 1,

        providerApiEvidence: 0,

        manualEntries: 0,
      },

      categories: [],

      transferTypes: [],

      receivedClassifications: [],
    });

    outgoingRepository.getCompletedTotals.mockResolvedValue({
      transactions: 0,

      sentAmount: 0,

      feesPaid: 0,

      totalDebited: 0,
    });

    receivedRepository.getCompletedTotals.mockResolvedValue({
      transactions: 0,

      receivedAmount: 0,
    });

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-01T00:00:00.000Z',

      to: '2026-09-01T23:59:59.999Z',
    });

    expect(result.comparison.sentAmountChangePercentage).toBeNull();

    expect(result.comparison.receivedAmountChangePercentage).toBeNull();

    expect(result.comparison.feesPaidChangePercentage).toBeNull();

    expect(result.comparison.completedTransactionsChangePercentage).toBeNull();

    expect(result.comparison.receivedTransactionsChangePercentage).toBeNull();

    expect(result.summary.netCashMovement).toBe(-10100);

    expect(result.comparison.previousNetCashMovement).toBe(0);

    expect(result.comparison.netCashMovementChange).toBe(-10100);
  });

  it('returns zero percentage change when both periods contain zero', async () => {
    mockCurrentPeriod({
      completed: {
        transactions: 0,

        sentAmount: 0,

        feesPaid: 0,

        totalDebited: 0,
      },

      received: {
        transactions: 0,

        receivedAmount: 0,
      },

      pendingTransactions: 0,

      processingTransactions: 0,

      failedTransactions: 0,

      cancelledTransactions: 0,

      reversedTransactions: 0,

      receivedReversedTransactions: 0,

      smsEvidence: 0,

      providerApiConfirmed: 0,

      manuallyConfirmed: 0,

      receivedEvidence: {
        smsEvidence: 0,

        providerApiEvidence: 0,

        manualEntries: 0,
      },

      categories: [],

      transferTypes: [],

      receivedClassifications: [],
    });

    outgoingRepository.getCompletedTotals.mockResolvedValue({
      transactions: 0,

      sentAmount: 0,

      feesPaid: 0,

      totalDebited: 0,
    });

    receivedRepository.getCompletedTotals.mockResolvedValue({
      transactions: 0,

      receivedAmount: 0,
    });

    const result = await service.getAnalytics('user-1', {
      from: '2026-09-01T00:00:00.000Z',

      to: '2026-09-01T23:59:59.999Z',
    });

    expect(result.comparison.sentAmountChangePercentage).toBe(0);

    expect(result.comparison.receivedAmountChangePercentage).toBe(0);

    expect(result.comparison.feesPaidChangePercentage).toBe(0);

    expect(result.comparison.totalDebitedChangePercentage).toBe(0);

    expect(result.comparison.completedTransactionsChangePercentage).toBe(0);

    expect(result.comparison.receivedTransactionsChangePercentage).toBe(0);

    expect(result.comparison.previousNetCashMovement).toBe(0);

    expect(result.comparison.netCashMovementChange).toBe(0);
  });

  it('rejects an analytics range where from occurs after to', async () => {
    await expect(
      service.getAnalytics('user-1', {
        from: '2026-09-30T23:59:59.999Z',

        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(outgoingRepository.getPeriodData.mock.calls).toHaveLength(0);

    expect(receivedRepository.getPeriodData.mock.calls).toHaveLength(0);

    expect(lifecycleRepository.getPeriodData.mock.calls).toHaveLength(0);

    expect(outgoingRepository.getCompletedTotals.mock.calls).toHaveLength(0);

    expect(receivedRepository.getCompletedTotals.mock.calls).toHaveLength(0);
  });
});
