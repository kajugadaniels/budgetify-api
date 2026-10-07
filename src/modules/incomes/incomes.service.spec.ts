import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { IncomesService } from './incomes.service';

describe('IncomesService', () => {
  const date = new Date('2026-01-01T00:00:00Z');
  const row = {
    id: 'income-id',
    userId: 'owner',
    label: 'Salary',
    amount: new Prisma.Decimal(1000),
    currency: 'RWF',
    category: 'SALARY',
    date,
    expectedAt: date,
    receivedAt: null,
    received: false,
    clientEventId: 'request-id',
    deletedAt: null,
    receivedTransactionId: null,
    receivedTransaction: null,
  };
  const income = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  };
  const receivedTransaction = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const tx = { income, receivedTransaction };
  const transaction = jest.fn();
  const service = new IncomesService({
    ...tx,
    $transaction: transaction,
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    transaction.mockImplementation(
      (work: ((db: typeof tx) => Promise<unknown>) | Promise<unknown>[]) =>
        Array.isArray(work) ? Promise.all(work) : work(tx),
    );
    income.findFirst.mockResolvedValue(row);
    income.update.mockResolvedValue({ ...row, received: true });
    receivedTransaction.update.mockResolvedValue({});
  });

  it('requires ownership for receipt updates', async () => {
    income.findFirst.mockResolvedValue(null);
    await expect(
      service.receive('other-owner', row.id, { date: date.toISOString() }),
    ).rejects.toBeInstanceOf(NotFoundException);
    const [findFirstArguments] = income.findFirst.mock.calls[0] as unknown as [
      { where: { userId: string; deletedAt: Date | null } },
    ];
    expect(findFirstArguments.where.userId).toBe('other-owner');
    expect(findFirstArguments.where.deletedAt).toBeNull();
    expect(income.update).not.toHaveBeenCalled();
  });

  it('marks expected income received without creating another payment', async () => {
    await service.receive('owner', row.id, { date: date.toISOString() });
    const [updateArguments] = income.update.mock.calls[0] as unknown as [
      {
        data: {
          received: boolean;
          receivedAt: Date;
          expectedAt: Date;
        };
      },
    ];
    expect(updateArguments.data.received).toBe(true);
    expect(updateArguments.data.receivedAt).toEqual(date);
    expect(updateArguments.data.expectedAt).toEqual(date);
    expect(receivedTransaction.update).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('rejects future receipt dates', async () => {
    await expect(
      service.receive('owner', row.id, {
        date: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(income.update).not.toHaveBeenCalled();
  });

  it('locks received amounts and dates', async () => {
    income.findFirst.mockResolvedValue({ ...row, received: true });
    await expect(
      service.update('owner', row.id, { amount: 999 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(income.update).not.toHaveBeenCalled();
  });

  it('rejects an already linked payment', async () => {
    receivedTransaction.findFirst.mockResolvedValue({
      id: 'payment',
      income: { id: 'another-income' },
      status: 'COMPLETED',
      currency: 'RWF',
      amount: 1000,
      classification: 'INCOME',
    });
    await expect(
      service.link('owner', row.id, { receivedTransactionId: 'payment' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(income.update).not.toHaveBeenCalled();
  });

  it('rejects mismatched amounts and reversed payments', async () => {
    for (const payment of [
      { status: 'COMPLETED', amount: 999 },
      { status: 'REVERSED', amount: 1000 },
    ]) {
      receivedTransaction.findFirst.mockResolvedValue({
        ...payment,
        id: 'payment',
        income: null,
        currency: 'RWF',
        classification: 'UNCLASSIFIED',
      });
      await expect(
        service.link('owner', row.id, { receivedTransactionId: 'payment' }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
    expect(income.update).not.toHaveBeenCalled();
  });

  it("cannot link another user's payment", async () => {
    receivedTransaction.findFirst.mockResolvedValue(null);
    await expect(
      service.link('owner', row.id, {
        receivedTransactionId: 'foreign-payment',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(income.update).not.toHaveBeenCalled();
  });

  it('maps the database unique constraint to a safe duplicate conflict', async () => {
    transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: '7.4.2',
      }),
    );
    await expect(
      service.receive('owner', row.id, { date: date.toISOString() }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('retries serializable write conflicts before returning a result', async () => {
    transaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Write conflict', {
        code: 'P2034',
        clientVersion: '7.4.2',
      }),
    );
    await service.receive('owner', row.id, { date: date.toISOString() });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it('links one owned matching payment and classifies it as income', async () => {
    receivedTransaction.findFirst.mockResolvedValue({
      id: 'payment',
      income: null,
      currency: 'RWF',
      amount: 1000,
      status: 'COMPLETED',
      classification: 'UNCLASSIFIED',
      occurredAt: date,
    });
    await service.link('owner', row.id, { receivedTransactionId: 'payment' });
    expect(receivedTransaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'payment', userId: 'owner' } }),
    );
    expect(receivedTransaction.update).toHaveBeenCalledWith({
      where: { id: 'payment' },
      data: { classification: 'INCOME' },
    });
    const [updateArguments] = income.update.mock.calls[0] as unknown as [
      { data: { receivedTransactionId: string; received: boolean } },
    ];
    expect(updateArguments.data.receivedTransactionId).toBe('payment');
    expect(updateArguments.data.received).toBe(true);
  });

  it('returns the same record for an identical create retry', async () => {
    income.findUnique.mockResolvedValue(row);
    const result = await service.create('owner', {
      label: 'Salary',
      amount: 1000,
      category: 'SALARY',
      date: date.toISOString(),
      clientEventId: 'request-id',
      received: false,
    });
    expect(result.id).toBe(row.id);
    expect(income.create).not.toHaveBeenCalled();
  });

  it('excludes reversed payments from received totals', async () => {
    income.findMany.mockResolvedValue([
      {
        ...row,
        received: true,
        receivedTransaction: { status: 'REVERSED', reference: 'payment' },
      },
    ]);
    income.count.mockResolvedValue(1);
    income.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal(0) },
      _count: 0,
    });
    const result = await service.list('owner', { page: 1, limit: 20 });
    expect(result.items[0].status).toBe('REVERSED');
    expect(result.summary.receivedAmount).toBe('0');
    const [, [receivedAggregateArguments]] = income.aggregate.mock
      .calls as unknown as [
      unknown[],
      [
        {
          where: {
            AND: [
              unknown,
              {
                received: boolean;
                OR: [
                  { receivedTransactionId: null },
                  { receivedTransaction: { status: string } },
                ];
              },
            ];
          };
        },
      ],
    ];
    expect(receivedAggregateArguments.where.AND[1]).toEqual({
      received: true,
      OR: [
        { receivedTransactionId: null },
        { receivedTransaction: { status: 'COMPLETED' } },
      ],
    });
  });
});
