import { Currency, Prisma } from '@prisma/client';

import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const expensesRepository = {
    summarizeByUserIds: jest.fn(),
    create: jest.fn(),
  };
  const usersService = {
    findActiveByIdOrThrow: jest.fn(),
  };
  const partnershipsService = {
    getVisibleUserIds: jest.fn(),
  };
  const incomeService = {
    summarizeCurrentUserIncome: jest.fn(),
  };
  const mobileMoneyTariffService = {
    resolveExpenseCharges: jest.fn(),
  };

  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpensesService(
      expensesRepository as never,
      usersService as never,
      partnershipsService as never,
      incomeService as never,
      mobileMoneyTariffService as never,
    );
  });

  it('summarizes charged expenses and available money', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue(['user-1']);
    expensesRepository.summarizeByUserIds.mockResolvedValue({
      totalBaseAmountRwf: 20000,
      totalFeeAmountRwf: 300,
      totalChargedAmountRwf: 20300,
      totalCount: 2,
      largestChargedAmountRwf: 10200,
    });
    incomeService.summarizeCurrentUserIncome.mockResolvedValue({
      availableMoneyNowRwf: 480000,
    });

    const result = await service.summarizeCurrentUserExpenses('user-1', {
      month: 4,
      year: 2026,
    });

    expect(result).toEqual({
      totalExpensesRwf: 20000,
      totalFeesRwf: 300,
      totalChargedExpensesRwf: 20300,
      averageExpenseRwf: 10150,
      largestExpenseRwf: 10200,
      availableMoneyNowRwf: 480000,
      expenseCount: 2,
    });
  });

  it('creates a cash expense without fees', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    mobileMoneyTariffService.resolveExpenseCharges.mockResolvedValue({
      amount: new Prisma.Decimal(12000),
      currency: Currency.RWF,
      amountRwf: new Prisma.Decimal(12000),
      feeAmount: new Prisma.Decimal(0),
      feeAmountRwf: new Prisma.Decimal(0),
      totalAmountRwf: new Prisma.Decimal(12000),
      paymentMethod: 'CASH',
      mobileMoneyChannel: null,
      mobileMoneyProvider: null,
      mobileMoneyNetwork: null,
    });
    expensesRepository.create.mockResolvedValue({ id: 'expense-1' });

    await service.createCurrentUserExpense('user-1', {
      label: 'Groceries',
      amount: 12000,
      currency: Currency.RWF,
      category: 'FOOD_DINING',
      paymentMethod: 'CASH',
      date: '2026-04-21T00:00:00.000Z',
    } as never);

    expect(expensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountRwf: new Prisma.Decimal(12000),
        feeAmountRwf: new Prisma.Decimal(0),
        totalAmountRwf: new Prisma.Decimal(12000),
        paymentMethod: 'CASH',
      }),
    );
  });

  it('quotes a mobile money expense before creation', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    mobileMoneyTariffService.resolveExpenseCharges.mockResolvedValue({
      amount: new Prisma.Decimal(5000),
      currency: Currency.RWF,
      amountRwf: new Prisma.Decimal(5000),
      feeAmount: new Prisma.Decimal(100),
      feeAmountRwf: new Prisma.Decimal(100),
      totalAmountRwf: new Prisma.Decimal(5100),
      paymentMethod: 'MOBILE_MONEY',
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
    });

    const result = await service.quoteCurrentUserMobileMoneyExpense('user-1', {
      amount: 5000,
      currency: Currency.RWF,
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
    });

    expect(result).toEqual({
      amount: 5000,
      currency: Currency.RWF,
      amountRwf: 5000,
      feeAmount: 100,
      feeAmountRwf: 100,
      totalAmountRwf: 5100,
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
    });
  });

  it('creates a mobile money expense with a calculated fee', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    mobileMoneyTariffService.resolveExpenseCharges.mockResolvedValue({
      amount: new Prisma.Decimal(5000),
      currency: Currency.RWF,
      amountRwf: new Prisma.Decimal(5000),
      feeAmount: new Prisma.Decimal(100),
      feeAmountRwf: new Prisma.Decimal(100),
      totalAmountRwf: new Prisma.Decimal(5100),
      paymentMethod: 'MOBILE_MONEY',
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
    });
    expensesRepository.create.mockResolvedValue({ id: 'expense-2' });

    await service.createCurrentUserExpense('user-1', {
      label: 'Paid technician',
      amount: 5000,
      currency: Currency.RWF,
      category: 'UTILITIES',
      paymentMethod: 'MOBILE_MONEY',
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
      date: '2026-04-21T00:00:00.000Z',
    } as never);

    expect(expensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountRwf: new Prisma.Decimal(5000),
        feeAmountRwf: new Prisma.Decimal(100),
        totalAmountRwf: new Prisma.Decimal(5100),
        paymentMethod: 'MOBILE_MONEY',
        mobileMoneyChannel: 'P2P_TRANSFER',
        mobileMoneyProvider: 'MTN_RWANDA',
        mobileMoneyNetwork: 'ON_NET',
      }),
    );
  });
});
