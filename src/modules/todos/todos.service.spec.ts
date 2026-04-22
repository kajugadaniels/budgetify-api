import { Prisma } from '@prisma/client';

import { TodosService } from './todos.service';

describe('TodosService', () => {
  const prisma = {
    $transaction: jest.fn(),
  };
  const todosRepository = {
    findSummaryRowsByUserIds: jest.fn(),
    aggregateRecordingsByTodoIds: jest.fn(),
    findActiveByIdAndUserIds: jest.fn(),
    update: jest.fn(),
    createRecording: jest.fn(),
  };
  const expensesRepository = {
    create: jest.fn(),
  };
  const mobileMoneyTariffService = {
    resolveExpenseCharges: jest.fn(),
  };
  const usersService = {
    findActiveByIdOrThrow: jest.fn(),
  };
  const partnershipsService = {
    getVisibleUserIds: jest.fn(),
  };
  const todoImageStorageService = {};

  let service: TodosService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-04-22T09:00:00.000Z'));

    service = new TodosService(
      prisma as never,
      todosRepository as never,
      expensesRepository as never,
      mobileMoneyTariffService as never,
      usersService as never,
      partnershipsService as never,
      todoImageStorageService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildSummaryRows() {
    return [
      {
        id: 'todo-1',
        name: 'Insurance renewal',
        price: new Prisma.Decimal(100),
        priority: 'TOP_PRIORITY',
        status: 'ACTIVE',
        frequency: 'ONCE',
        occurrenceDates: ['2026-04-20'],
        recordedOccurrenceDates: [],
        remainingAmount: null,
        createdAt: new Date('2026-04-21T10:25:00.000Z'),
        hasActiveImage: true,
      },
      {
        id: 'todo-2',
        name: 'School fees reserve',
        price: new Prisma.Decimal(300),
        priority: 'PRIORITY',
        status: 'RECORDED',
        frequency: 'MONTHLY',
        occurrenceDates: ['2026-04-15', '2026-04-24'],
        recordedOccurrenceDates: ['2026-04-15'],
        remainingAmount: new Prisma.Decimal(150),
        createdAt: new Date('2026-04-20T10:25:00.000Z'),
        hasActiveImage: false,
      },
      {
        id: 'todo-3',
        name: 'Weekly groceries',
        price: new Prisma.Decimal(200),
        priority: 'NOT_PRIORITY',
        status: 'COMPLETED',
        frequency: 'WEEKLY',
        occurrenceDates: ['2026-04-14'],
        recordedOccurrenceDates: ['2026-04-14'],
        remainingAmount: new Prisma.Decimal(0),
        createdAt: new Date('2026-04-19T10:25:00.000Z'),
        hasActiveImage: false,
      },
      {
        id: 'todo-4',
        name: 'Rent top-up',
        price: new Prisma.Decimal(400),
        priority: 'TOP_PRIORITY',
        status: 'ACTIVE',
        frequency: 'MONTHLY',
        occurrenceDates: ['2026-04-01', '2026-05-01'],
        recordedOccurrenceDates: [],
        remainingAmount: new Prisma.Decimal(400),
        createdAt: new Date('2026-04-18T10:25:00.000Z'),
        hasActiveImage: false,
      },
    ];
  }

  it('summarizes todo planning totals from lightweight todo rows', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue(['user-1']);
    todosRepository.findSummaryRowsByUserIds.mockResolvedValue(
      buildSummaryRows(),
    );
    todosRepository.aggregateRecordingsByTodoIds.mockResolvedValue({
      totalCount: 2,
      totalChargedAmount: new Prisma.Decimal(260),
    });

    const result = await service.summarizeCurrentUserTodos('user-1', {});

    expect(result).toEqual({
      totalCount: 4,
      openCount: 3,
      completedCount: 1,
      recurringCount: 3,
      topPriorityCount: 2,
      withImagesCount: 1,
      completionPercentage: 25,
      imageCoveragePercentage: 25,
      plannedTotal: 1000,
      openPlannedTotal: 800,
      remainingRecurringBudgetTotal: 550,
      recordedCount: 2,
      recordedTotalAmount: 260,
      overdueCount: 2,
      next7DaysScheduledAmount: 150,
      next30DaysScheduledAmount: 350,
      latestTodo: {
        id: 'todo-1',
        name: 'Insurance renewal',
        createdAt: new Date('2026-04-21T10:25:00.000Z'),
      },
    });
  });

  it('builds upcoming buckets and reserve guidance for open recurring todos', async () => {
    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue(['user-1']);
    todosRepository.findSummaryRowsByUserIds.mockResolvedValue(
      buildSummaryRows(),
    );

    const result = await service.listCurrentUserUpcomingTodos('user-1', {
      days: 7,
    });

    expect(result).toEqual({
      windowDays: 7,
      daysWithPlans: 1,
      occurrenceCount: 1,
      totalScheduledAmount: 150,
      overdueCount: 2,
      reserveSummary: {
        targetAmount: 700,
        usedAmount: 150,
        remainingAmount: 550,
        items: [
          {
            id: 'todo-4',
            name: 'Rent top-up',
            frequency: 'MONTHLY',
            targetAmount: 400,
            usedAmount: 0,
            remainingAmount: 400,
            remainingOccurrenceCount: 2,
          },
          {
            id: 'todo-2',
            name: 'School fees reserve',
            frequency: 'MONTHLY',
            targetAmount: 300,
            usedAmount: 150,
            remainingAmount: 150,
            remainingOccurrenceCount: 1,
          },
        ],
      },
      days: [
        { date: '2026-04-22', itemCount: 0, totalAmount: 0, items: [] },
        { date: '2026-04-23', itemCount: 0, totalAmount: 0, items: [] },
        {
          date: '2026-04-24',
          itemCount: 1,
          totalAmount: 150,
          items: [
            {
              id: 'todo-2',
              name: 'School fees reserve',
              frequency: 'MONTHLY',
              amount: 150,
            },
          ],
        },
        { date: '2026-04-25', itemCount: 0, totalAmount: 0, items: [] },
        { date: '2026-04-26', itemCount: 0, totalAmount: 0, items: [] },
        { date: '2026-04-27', itemCount: 0, totalAmount: 0, items: [] },
        { date: '2026-04-28', itemCount: 0, totalAmount: 0, items: [] },
      ],
    });
  });

  it('creates the expense and todo recording in one transaction', async () => {
    const tx = { transaction: true };
    const todo = {
      id: 'todo-2',
      name: 'School fees reserve',
      price: new Prisma.Decimal(300),
      priority: 'PRIORITY',
      status: 'ACTIVE',
      frequency: 'MONTHLY',
      occurrenceDates: ['2026-04-15', '2026-04-24'],
      recordedOccurrenceDates: ['2026-04-15'],
      remainingAmount: new Prisma.Decimal(150),
      _count: { recordings: 1 },
    };
    const runTransaction = async <T>(
      callback: (client: typeof tx) => Promise<T> | T,
    ): Promise<T> => callback(tx);

    usersService.findActiveByIdOrThrow.mockResolvedValue(undefined);
    partnershipsService.getVisibleUserIds.mockResolvedValue(['user-1']);
    prisma.$transaction.mockImplementation(runTransaction);
    mobileMoneyTariffService.resolveExpenseCharges.mockResolvedValue({
      amount: new Prisma.Decimal(140),
      currency: 'RWF',
      amountRwf: new Prisma.Decimal(140),
      feeAmount: new Prisma.Decimal(10),
      feeAmountRwf: new Prisma.Decimal(10),
      totalAmountRwf: new Prisma.Decimal(150),
      paymentMethod: 'MOBILE_MONEY',
      mobileMoneyChannel: 'P2P_TRANSFER',
      mobileMoneyProvider: 'MTN_RWANDA',
      mobileMoneyNetwork: 'ON_NET',
    });
    todosRepository.findActiveByIdAndUserIds.mockResolvedValue(todo);
    expensesRepository.create.mockResolvedValue({ id: 'expense-1' });
    todosRepository.update.mockResolvedValue(todo);
    todosRepository.createRecording.mockResolvedValue({ id: 'recording-1' });

    await expect(
      service.recordCurrentUserTodoExpenseFromPayload('user-1', 'todo-2', {
        label: 'School fees reserve',
        amount: 140,
        currency: 'RWF',
        category: 'SCHOOL_FEES',
        paymentMethod: 'MOBILE_MONEY',
        mobileMoneyProvider: 'MTN_RWANDA',
        mobileMoneyChannel: 'P2P_TRANSFER',
        mobileMoneyNetwork: 'ON_NET',
        date: '2026-04-24',
        occurrenceDate: '2026-04-24',
      } as never),
    ).resolves.toEqual({ id: 'recording-1' });

    expect(expensesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        label: 'School fees reserve',
        amountRwf: new Prisma.Decimal(140),
        feeAmountRwf: new Prisma.Decimal(10),
        totalAmountRwf: new Prisma.Decimal(150),
      }),
      tx,
    );
    expect(todosRepository.update).toHaveBeenCalledWith(
      'todo-2',
      expect.objectContaining({
        status: 'COMPLETED',
        recordedOccurrenceDates: { set: ['2026-04-15', '2026-04-24'] },
        remainingAmount: new Prisma.Decimal(0),
      }),
      tx,
    );
    expect(todosRepository.createRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        todoId: 'todo-2',
        expenseId: 'expense-1',
        plannedAmount: new Prisma.Decimal(150),
        baseAmount: new Prisma.Decimal(140),
        feeAmount: new Prisma.Decimal(10),
        totalChargedAmount: new Prisma.Decimal(150),
        varianceAmount: new Prisma.Decimal(0),
      }),
      tx,
    );
  });
});
