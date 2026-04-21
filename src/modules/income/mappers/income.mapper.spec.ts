import { Currency, IncomeCategory, Prisma } from '@prisma/client';

import { IncomeAllocationStatus } from '../dto/income-allocation-status.enum';
import { IncomeMapper } from './income.mapper';

describe('IncomeMapper', () => {
  it('maps structural reversal metadata on saving allocations', () => {
    const income = {
      id: 'income-1',
      label: 'Salary',
      amount: new Prisma.Decimal(1000),
      currency: Currency.USD,
      amountRwf: new Prisma.Decimal(1460000),
      category: IncomeCategory.SALARY,
      date: new Date('2026-04-01T00:00:00.000Z'),
      received: true,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      user: {
        id: 'user-1',
        firstName: 'Dev',
        lastName: 'Niels',
        avatarUrl: null,
      },
    } as const;

    const allocations = [
      {
        id: 'allocation-1',
        amount: new Prisma.Decimal(200),
        currency: Currency.USD,
        amountRwf: new Prisma.Decimal(292000),
        savingTransaction: {
          id: 'transaction-1',
          date: new Date('2026-04-10T00:00:00.000Z'),
          note: 'Emergency fund',
          reversalOfTransactionId: null,
          reversedByTransaction: { id: 'transaction-2' },
          saving: {
            id: 'saving-1',
            label: 'Emergency fund',
          },
        },
      },
    ];

    const result = IncomeMapper.toIncomeDetailResponse(
      income as never,
      allocations as never,
      {
        allocatedToSavingsRwf: 292000,
        remainingAvailableRwf: 1168000,
        allocationStatus: IncomeAllocationStatus.PARTIALLY_ALLOCATED,
      },
    );

    expect(result.savingAllocations).toEqual([
      expect.objectContaining({
        id: 'allocation-1',
        savingId: 'saving-1',
        savingLabel: 'Emergency fund',
        transactionId: 'transaction-1',
        amount: 200,
        currency: Currency.USD,
        amountRwf: 292000,
        note: 'Emergency fund',
        isReversed: true,
        isReversal: false,
        reversedByTransactionId: 'transaction-2',
      }),
    ]);
  });
});
