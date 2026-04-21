import { BadRequestException } from '@nestjs/common';
import {
  Currency,
  MoneyMovementType,
  Prisma,
  SavingTransactionType,
} from '@prisma/client';

import { SavingsService } from './savings.service';

describe('SavingsService', () => {
  const userId = 'user-1';
  const savingId = 'saving-1';
  const transactionId = 'deposit-1';
  const transactionDb = {} as Prisma.TransactionClient;

  const usersService = {
    findActiveByIdOrThrow: jest.fn(),
  };

  const partnershipsService = {
    getVisibleUserIds: jest.fn(),
  };

  const currencyService = {
    convertToRwf: jest.fn(),
  };

  const incomeService = {
    findVisibleIncomeForCurrentUser: jest.fn(),
  };

  const savingsRepository = {
    runInTransaction: jest.fn(),
    findActiveByIdAndUserIds: jest.fn(),
    findTransactionByIdAndSavingId: jest.fn(),
    deleteTransactionIncomeSources: jest.fn(),
    updateTransaction: jest.fn(),
    createTransaction: jest.fn(),
    createMoneyMovement: jest.fn(),
    update: jest.fn(),
  };

  let service: SavingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SavingsService(
      savingsRepository as never,
      usersService as never,
      partnershipsService as never,
      currencyService as never,
      incomeService as never,
    );
    savingsRepository.runInTransaction.mockImplementation(
      (callback: (db: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(transactionDb),
    );
  });

  it('creates a matched reversal withdrawal for a traced deposit', async () => {
    const saving = {
      id: savingId,
      userId,
      stillHave: true,
      transactions: [
        {
          type: SavingTransactionType.DEPOSIT,
          amountRwf: new Prisma.Decimal(73000),
        },
      ],
    };
    const reversedSaving = {
      ...saving,
      stillHave: false,
      transactions: [
        ...saving.transactions,
        {
          type: SavingTransactionType.WITHDRAWAL,
          amountRwf: new Prisma.Decimal(73000),
        },
      ],
    };
    const depositTransaction = {
      id: transactionId,
      savingId,
      userId,
      type: SavingTransactionType.DEPOSIT,
      amount: new Prisma.Decimal(50),
      currency: Currency.USD,
      amountRwf: new Prisma.Decimal(73000),
      date: new Date('2026-04-10T00:00:00.000Z'),
      note: 'Emergency fund',
      incomeSources: [{ id: 'source-1' }],
    };

    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue([userId]);
    savingsRepository.findActiveByIdAndUserIds
      .mockResolvedValueOnce(saving)
      .mockResolvedValueOnce(reversedSaving);
    savingsRepository.findTransactionByIdAndSavingId.mockResolvedValue(
      depositTransaction,
    );
    savingsRepository.createTransaction.mockResolvedValue({
      id: 'withdrawal-1',
    });

    const result = await service.reverseCurrentUserSavingDeposit(
      userId,
      savingId,
      transactionId,
    );

    expect(
      savingsRepository.deleteTransactionIncomeSources,
    ).toHaveBeenCalledWith(transactionId, transactionDb);
    const [, updatedTransactionPayload, updatedTransactionDb] =
      savingsRepository.updateTransaction.mock.calls[0] as [
        string,
        { note?: string },
        Prisma.TransactionClient,
      ];
    expect(updatedTransactionPayload.note).toEqual(
      expect.stringContaining('Reversal recorded'),
    );
    expect(updatedTransactionDb).toBe(transactionDb);
    expect(savingsRepository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        savingId,
        userId,
        type: SavingTransactionType.WITHDRAWAL,
        amount: depositTransaction.amount,
        currency: Currency.USD,
        amountRwf: depositTransaction.amountRwf,
        reversalOfTransactionId: transactionId,
        note: 'Reversal of deposit from 2026-04-10',
      }),
      transactionDb,
    );
    expect(savingsRepository.createMoneyMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        type: MoneyMovementType.SAVING_WITHDRAWAL,
        amount: depositTransaction.amount,
        currency: Currency.USD,
        amountRwf: depositTransaction.amountRwf,
        savingTransactionId: 'withdrawal-1',
        note: 'Reversal of deposit from 2026-04-10',
      }),
      transactionDb,
    );
    expect(savingsRepository.update).toHaveBeenCalledWith(
      savingId,
      { stillHave: false },
      transactionDb,
    );
    expect(result).toBe(reversedSaving);
  });

  it('rejects reversing an untraced deposit', async () => {
    const saving = {
      id: savingId,
      userId,
      stillHave: true,
      transactions: [
        {
          type: SavingTransactionType.DEPOSIT,
          amountRwf: new Prisma.Decimal(73000),
        },
      ],
    };

    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue([userId]);
    savingsRepository.findActiveByIdAndUserIds.mockResolvedValue(saving);
    savingsRepository.findTransactionByIdAndSavingId.mockResolvedValue({
      id: transactionId,
      type: SavingTransactionType.DEPOSIT,
      incomeSources: [],
    });

    await expect(
      service.reverseCurrentUserSavingDeposit(userId, savingId, transactionId),
    ).rejects.toThrow(
      new BadRequestException('Only traced saving deposits can be reversed.'),
    );

    expect(savingsRepository.createTransaction).not.toHaveBeenCalled();
  });
});
