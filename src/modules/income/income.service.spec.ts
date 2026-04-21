import { IncomeService } from './income.service';

describe('IncomeService', () => {
  const incomeRepository = {
    summarizeByUserIds: jest.fn(),
  };
  const usersService = {
    findActiveByIdOrThrow: jest.fn(),
  };
  const partnershipsService = {
    getVisibleUserIds: jest.fn(),
  };
  const currencyService = {
    convertToRwf: jest.fn(),
  };
  const expensesRepository = {
    sumAmountByUserIds: jest.fn(),
  };
  const savingsRepository = {
    sumCurrentBalanceRwfByUserIds: jest.fn(),
    sumActiveDepositSourceAmountRwfByUserIds: jest.fn(),
    sumMoneyMovementAmountRwfByUserIds: jest.fn(),
  };

  let service: IncomeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IncomeService(
      incomeRepository as never,
      usersService as never,
      partnershipsService as never,
      currencyService as never,
      expensesRepository as never,
      savingsRepository as never,
    );
  });

  it('builds a balanced income audit response', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue(['user-1']);
    incomeRepository.summarizeByUserIds.mockResolvedValue({
      totalAmountRwf: 1250000,
      receivedAmountRwf: 980000,
      totalCount: 6,
      receivedCount: 4,
    });
    expensesRepository.sumAmountByUserIds.mockResolvedValue(540000);
    savingsRepository.sumCurrentBalanceRwfByUserIds.mockResolvedValue(180000);
    savingsRepository.sumActiveDepositSourceAmountRwfByUserIds.mockResolvedValue(
      220000,
    );
    savingsRepository.sumMoneyMovementAmountRwfByUserIds.mockResolvedValue(
      60000,
    );

    const result = await service.auditCurrentUserIncome('user-1', {
      month: 4,
      year: 2026,
    });

    expect(result).toMatchObject({
      totalIncomeRwf: 1250000,
      receivedIncomeRwf: 980000,
      pendingIncomeRwf: 270000,
      allocatedToSavingsRwf: 220000,
      savingWithdrawalsReturnedRwf: 60000,
      totalExpensesRwf: 540000,
      totalSavingsBalanceRwf: 180000,
      availableMoneyNowRwf: 260000,
      recomputedAvailableMoneyNowRwf: 260000,
      reconciliationDifferenceRwf: 0,
      isBalanced: true,
      periodStartDate: '2026-04-01',
      periodEndDate: '2026-04-30',
    });
  });
});
