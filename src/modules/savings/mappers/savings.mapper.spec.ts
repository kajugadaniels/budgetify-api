import { Currency, Prisma, SavingTransactionType } from '@prisma/client';

import { SavingsMapper } from './savings.mapper';

describe('SavingsMapper', () => {
  it('maps structural reversal metadata on saving transactions', () => {
    const transaction = {
      id: 'transaction-1',
      type: SavingTransactionType.DEPOSIT,
      amount: new Prisma.Decimal(50),
      currency: Currency.USD,
      amountRwf: new Prisma.Decimal(73000),
      date: new Date('2026-04-21T00:00:00.000Z'),
      note: 'Traced deposit',
      reversalOfTransactionId: null,
      reversedByTransaction: { id: 'transaction-2' },
      incomeSources: [
        {
          id: 'source-1',
          incomeId: 'income-1',
          amount: new Prisma.Decimal(50),
          currency: Currency.USD,
          amountRwf: new Prisma.Decimal(73000),
          income: {
            label: 'Salary',
            category: 'SALARY',
          },
        },
      ],
      createdAt: new Date('2026-04-21T01:00:00.000Z'),
    } as const;

    const result = SavingsMapper.toSavingTransactionResponse(
      transaction as never,
    );

    expect(result).toMatchObject({
      id: 'transaction-1',
      isReversal: false,
      isReversed: true,
      reversalOfTransactionId: null,
      reversedByTransactionId: 'transaction-2',
      incomeSources: [
        {
          id: 'source-1',
          incomeId: 'income-1',
          incomeLabel: 'Salary',
          incomeCategory: 'SALARY',
          amount: 50,
          currency: Currency.USD,
          amountRwf: 73000,
        },
      ],
    });
  });
});
