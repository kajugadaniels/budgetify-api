import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpensePaymentMethod,
  Prisma,
  TodoFrequency,
  TodoOccurrenceStatus,
  TodoRecordingExpenseSource,
  TodoStatus,
  TodoType,
} from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
  resolvePaginationOptions,
} from '../../common/interfaces/paginated-response.interface';
import {
  normalizeListSearch,
  resolveListDateRange,
} from '../../common/utils/list-query.utils';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { MobileMoneyTariffService } from '../expenses/mobile-money-tariff.service';
import { PartnershipsService } from '../partnerships/partnerships.service';
import { UsersService } from '../users/users.service';
import { CreateTodoRequestDto } from './dto/create-todo.request.dto';
import { CreateTodoExpenseRequestDto } from './dto/create-todo-expense.request.dto';
import { CreateTodoRecordingRequestDto } from './dto/create-todo-recording.request.dto';
import { ListTodosQueryDto, TodoSortBy } from './dto/list-todos.query.dto';
import { ReverseTodoRecordingRequestDto } from './dto/reverse-todo-recording.request.dto';
import { TodoSummaryQueryDto } from './dto/todo-summary.query.dto';
import { TodoUpcomingQueryDto } from './dto/todo-upcoming.query.dto';
import { UpdateTodoRequestDto } from './dto/update-todo.request.dto';
import {
  MAX_TODO_IMAGES,
  StoredTodoImage,
  TodoImageStorageService,
  TodoUploadFile,
} from './services/todo-image-storage.service';
import {
  TodoOccurrenceWithRecording,
  TodoRecordingMutationTarget,
  TodoSummaryRow,
  TodoRecordingWithRelations,
  TodoWithImages,
  TodosRepository,
} from './todos.repository';

const DAY_MS = 24 * 60 * 60 * 1000;
const TODO_RECORDING_TRANSACTION_TIMEOUT_MS = 15000;

type ResolvedRecurringSchedule = {
  endDate: Date;
  frequency: TodoFrequency;
  frequencyDays: number[];
  occurrenceDates: string[];
  startDate: Date;
};

type PreparedTodoRecordingMutation = {
  occurrence: TodoOccurrenceWithRecording;
  nextRecordedOccurrenceDates: string[];
  nextRemainingAmount: Prisma.Decimal | null;
  nextStatus: TodoStatus;
  occurrenceDate: Date;
  plannedAmount: Prisma.Decimal;
  varianceAmount: Prisma.Decimal;
};

type TodoOccurrenceStateLike = {
  id: string | null;
  occurrenceDate: Date | string;
  resolvedAt?: Date | null;
  status: TodoOccurrenceStatus;
  recording: {
    expenseId: string | null;
    id: string;
  } | null;
};

type PreparedOccurrenceSync = {
  activeOccurrences: TodoOccurrenceStateLike[];
  createdOccurrences: Array<{
    occurrenceDate: Date;
    resolvedAt: Date | null;
    status: TodoOccurrenceStatus;
  }>;
  deactivatedOccurrenceIds: string[];
  recordedOccurrenceDates: string[];
  openOccurrenceDates: string[];
  occurrenceDates: string[];
  updatedOccurrences: Array<{
    id: string;
    resolvedAt: Date | null;
    status: TodoOccurrenceStatus;
  }>;
};

type TodoFrequencyCompletionSnapshot = {
  completedCount: number;
  completionPercentage: number;
  frequency: TodoFrequency;
  totalCount: number;
};

type TodoRecurringBudgetBurnDownSnapshot = {
  remainingAmount: number;
  targetAmount: number;
  usagePercentage: number;
  usedAmount: number;
};

type TodoTypeBreakdownSnapshot = {
  openCount: number;
  plannedTotal: number;
  remainingTotal: number;
  totalCount: number;
  type: TodoType;
};

type TodoReportingSnapshot = {
  completedCount: number;
  completionByFrequency: TodoFrequencyCompletionSnapshot[];
  completionPercentage: number;
  dueNext30DaysCount: number;
  dueNext30DaysAmount: number;
  dueNext7DaysCount: number;
  dueNext7DaysAmount: number;
  feeBearingRecordingCount: number;
  imageCoveragePercentage: number;
  openCount: number;
  openPlannedTotal: number;
  overdueCount: number;
  overdueOccurrenceCount: number;
  plannedTotal: number;
  recordedBaseTotalAmount: number;
  recordedCount: number;
  recordedFeeTotalAmount: number;
  recordedTotalAmount: number;
  recordedVarianceTotalAmount: number;
  recurringBudgetBurnDown: TodoRecurringBudgetBurnDownSnapshot;
  recurringCount: number;
  remainingRecurringBudgetTotal: number;
  topPriorityCount: number;
  totalCount: number;
  totalRemainingAmount: number;
  typeBreakdown: TodoTypeBreakdownSnapshot[];
  withImagesCount: number;
};

export type TodoSummarySnapshot = {
  latestTodo: {
    createdAt: Date;
    id: string;
    name: string;
  } | null;
} & TodoReportingSnapshot;

export type TodoAuditSnapshot = {
  completionByFrequency: TodoFrequencyCompletionSnapshot[];
  completionPercentage: number;
  dueThisMonthAmount: number;
  dueThisMonthCount: number;
  dueThisWeekAmount: number;
  dueThisWeekCount: number;
  feeBearingRecordingCount: number;
  openTodoCount: number;
  overdueOccurrenceCount: number;
  overdueTodoCount: number;
  periodEndDate: string | null;
  periodStartDate: string | null;
  recordingCount: number;
  recurringBudgetBurnDown: TodoRecurringBudgetBurnDownSnapshot;
  recurringTodoCount: number;
  todoCount: number;
  totalPlannedAmount: number;
  totalRecordedBaseAmount: number;
  totalRecordedChargedAmount: number;
  totalRecordedFeeAmount: number;
  totalRecordedVarianceAmount: number;
  totalRemainingAmount: number;
  typeBreakdown: TodoTypeBreakdownSnapshot[];
};

export type TodoUpcomingSnapshot = {
  days: Array<{
    date: string;
    itemCount: number;
    items: Array<{
      amount: number;
      frequency: TodoFrequency;
      id: string;
      name: string;
    }>;
    totalAmount: number;
  }>;
  daysWithPlans: number;
  occurrenceCount: number;
  overdueCount: number;
  reserveSummary: {
    items: Array<{
      frequency: TodoFrequency;
      id: string;
      name: string;
      remainingAmount: number;
      remainingOccurrenceCount: number;
      targetAmount: number;
      usedAmount: number;
    }>;
    remainingAmount: number;
    targetAmount: number;
    usedAmount: number;
  };
  totalScheduledAmount: number;
  windowDays: number;
};

@Injectable()
export class TodosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly todosRepository: TodosRepository,
    private readonly expensesRepository: ExpensesRepository,
    private readonly mobileMoneyTariffService: MobileMoneyTariffService,
    private readonly usersService: UsersService,
    private readonly partnershipsService: PartnershipsService,
    private readonly todoImageStorageService: TodoImageStorageService,
  ) {}

  async listCurrentUserTodos(
    userId: string,
    query: ListTodosQueryDto,
  ): Promise<PaginatedResponse<TodoWithImages>> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const pagination = resolvePaginationOptions(query);
    const dateRange = resolveListDateRange(query);
    const items = await this.todosRepository.findAllByUserIds(visibleUserIds, {
      frequency: query.frequency,
      cadence: query.cadence,
      priority: query.priority,
      status: query.status,
      type: query.type,
      operationalState: query.operationalState,
      hasLinkedExpense: query.hasLinkedExpense,
      feeBearingOnly: query.feeBearingOnly,
      remainingBudgetLte: query.remainingBudgetLte,
      search: normalizeListSearch(query.search),
      occurrenceDates: dateRange?.isoDates,
    });
    const sortedItems = this.sortTodoListItems(
      items,
      query.sortBy ?? TodoSortBy.NEXT_OCCURRENCE_ASC,
    );
    const pagedItems = sortedItems.slice(
      pagination.skip,
      pagination.skip + pagination.limit,
    );

    return createPaginatedResponse(pagedItems, sortedItems.length, {
      page: pagination.page,
      limit: pagination.limit,
    });
  }

  async summarizeCurrentUserTodos(
    userId: string,
    query: TodoSummaryQueryDto,
  ): Promise<TodoSummarySnapshot> {
    const dateRange = resolveListDateRange(query);
    const rows = await this.listSummaryRowsForUser(userId, query);
    const report = await this.buildTodoReportingSnapshot(rows, {
      occurrenceDateFrom: dateRange?.dateFrom,
      occurrenceDateTo: dateRange?.dateTo,
    });

    return {
      ...report,
      latestTodo:
        rows[0] !== undefined
          ? {
              id: rows[0].id,
              name: rows[0].name,
              createdAt: rows[0].createdAt,
            }
          : null,
    };
  }

  async auditCurrentUserTodos(
    userId: string,
    query: TodoSummaryQueryDto,
  ): Promise<TodoAuditSnapshot> {
    const dateRange = resolveListDateRange(query);
    const rows = await this.listSummaryRowsForUser(userId, query);
    const report = await this.buildTodoReportingSnapshot(rows, {
      occurrenceDateFrom: dateRange?.dateFrom,
      occurrenceDateTo: dateRange?.dateTo,
    });

    return {
      periodStartDate: dateRange?.dateFrom?.toISOString().slice(0, 10) ?? null,
      periodEndDate:
        dateRange?.dateTo === undefined
          ? null
          : new Date(dateRange.dateTo.getTime() - 1).toISOString().slice(0, 10),
      todoCount: report.totalCount,
      openTodoCount: report.openCount,
      recurringTodoCount: report.recurringCount,
      totalPlannedAmount: report.plannedTotal,
      totalRemainingAmount: report.totalRemainingAmount,
      recordingCount: report.recordedCount,
      totalRecordedBaseAmount: report.recordedBaseTotalAmount,
      totalRecordedFeeAmount: report.recordedFeeTotalAmount,
      totalRecordedChargedAmount: report.recordedTotalAmount,
      totalRecordedVarianceAmount: report.recordedVarianceTotalAmount,
      feeBearingRecordingCount: report.feeBearingRecordingCount,
      overdueTodoCount: report.overdueCount,
      overdueOccurrenceCount: report.overdueOccurrenceCount,
      dueThisWeekCount: report.dueNext7DaysCount,
      dueThisWeekAmount: report.dueNext7DaysAmount,
      dueThisMonthCount: report.dueNext30DaysCount,
      dueThisMonthAmount: report.dueNext30DaysAmount,
      completionPercentage: report.completionPercentage,
      recurringBudgetBurnDown: report.recurringBudgetBurnDown,
      completionByFrequency: report.completionByFrequency,
      typeBreakdown: report.typeBreakdown,
    };
  }

  async listCurrentUserUpcomingTodos(
    userId: string,
    query: TodoUpcomingQueryDto,
  ): Promise<TodoUpcomingSnapshot> {
    const rows = await this.listSummaryRowsForUser(userId, query);
    const windowDays = query.days ?? 7;
    const today = this.parseDateOnly(this.getTodayDateString());
    const windowDates = Array.from({ length: windowDays }, (_, index) =>
      this.toIsoDate(this.addDays(today, index)),
    );
    const dayMap = new Map(
      windowDates.map((date) => [
        date,
        {
          date,
          itemCount: 0,
          totalAmount: 0,
          items: [] as TodoUpcomingSnapshot['days'][number]['items'],
        },
      ]),
    );

    const reserveItems: TodoUpcomingSnapshot['reserveSummary']['items'] = [];
    const todayIsoDate = this.toIsoDate(today);
    let overdueCount = 0;

    for (const row of rows) {
      if (!this.isOperationalTodoType(row.type)) {
        continue;
      }

      const remainingDates = this.getRemainingOccurrenceDates(row);

      if (
        !this.isTodoClosed(row.status) &&
        remainingDates.some((date) => date < todayIsoDate)
      ) {
        overdueCount += 1;
      }

      if (
        !this.isTodoClosed(row.status) &&
        (row.frequency === 'WEEKLY' || row.frequency === 'MONTHLY')
      ) {
        const targetAmount = Number(row.price);
        const remainingAmount = Number(row.remainingAmount ?? row.price);
        const usedAmount = Math.max(targetAmount - remainingAmount, 0);
        const remainingOccurrenceCount = remainingDates.length;

        if (remainingAmount > 0) {
          reserveItems.push({
            id: row.id,
            name: row.name,
            frequency: row.frequency,
            targetAmount: this.roundCurrency(targetAmount),
            usedAmount: this.roundCurrency(usedAmount),
            remainingAmount: this.roundCurrency(remainingAmount),
            remainingOccurrenceCount,
          });
        }
      }

      if (this.isTodoClosed(row.status) || remainingDates.length === 0) {
        continue;
      }

      const amountPerOccurrence = this.resolveUpcomingOccurrenceAmount(
        row,
        remainingDates,
      );

      for (const date of remainingDates) {
        const day = dayMap.get(date);

        if (!day) {
          continue;
        }

        day.items.push({
          id: row.id,
          name: row.name,
          frequency: row.frequency,
          amount: amountPerOccurrence,
        });
        day.itemCount += 1;
        day.totalAmount += amountPerOccurrence;
      }
    }

    reserveItems.sort(
      (left, right) =>
        right.remainingOccurrenceCount - left.remainingOccurrenceCount ||
        right.remainingAmount - left.remainingAmount,
    );

    const days = windowDates.map((date) => {
      const day = dayMap.get(date)!;
      day.items.sort(
        (left, right) =>
          right.amount - left.amount ||
          left.name.localeCompare(right.name, 'en'),
      );

      return {
        date,
        itemCount: day.itemCount,
        totalAmount: this.roundCurrency(day.totalAmount),
        items: day.items.map((item) => ({
          ...item,
          amount: this.roundCurrency(item.amount),
        })),
      };
    });

    return {
      windowDays,
      days,
      daysWithPlans: days.filter((day) => day.itemCount > 0).length,
      occurrenceCount: days.reduce((sum, day) => sum + day.itemCount, 0),
      totalScheduledAmount: this.roundCurrency(
        days.reduce((sum, day) => sum + day.totalAmount, 0),
      ),
      overdueCount,
      reserveSummary: {
        items: reserveItems,
        targetAmount: this.roundCurrency(
          reserveItems.reduce((sum, item) => sum + item.targetAmount, 0),
        ),
        usedAmount: this.roundCurrency(
          reserveItems.reduce((sum, item) => sum + item.usedAmount, 0),
        ),
        remainingAmount: this.roundCurrency(
          reserveItems.reduce((sum, item) => sum + item.remainingAmount, 0),
        ),
      },
    };
  }

  async listCurrentUserTodoRecordingIndex(
    userId: string,
    query: TodoSummaryQueryDto,
  ): Promise<TodoRecordingWithRelations[]> {
    const dateRange = resolveListDateRange(query);
    const rows = await this.listSummaryRowsForUser(userId, query);

    return this.todosRepository.findRecordingsByTodoIds(
      rows.map((row) => row.id),
      {
        occurrenceDateFrom: dateRange?.dateFrom,
        occurrenceDateTo: dateRange?.dateTo,
      },
    );
  }

  async getCurrentUserTodo(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    return this.findVisibleTodoOrThrow(userId, todoId);
  }

  async createCurrentUserTodo(
    userId: string,
    payload: CreateTodoRequestDto,
    files: TodoUploadFile[],
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    if (files.length > 0) {
      this.todoImageStorageService.ensureConfigured();
    }

    const schedule = this.resolveSchedule({
      frequency: payload.frequency ?? TodoFrequency.ONCE,
      startDateInput: payload.startDate,
      frequencyDays: payload.frequencyDays,
      occurrenceDates: payload.occurrenceDates,
    });
    const todoType = this.resolveTodoType(
      payload.type,
      schedule.frequency,
      'create',
    );
    const responsibleUserId = await this.resolveResponsibleUserId(
      userId,
      payload.responsibleUserId,
    );
    const financialDefaults = this.resolveTodoFinancialDefaults({
      defaultExpenseCategory: payload.defaultExpenseCategory,
      defaultPaymentMethod: payload.defaultPaymentMethod,
      defaultMobileMoneyChannel: payload.defaultMobileMoneyChannel,
      defaultMobileMoneyNetwork: payload.defaultMobileMoneyNetwork,
      payee: payload.payee,
      expenseNote: payload.expenseNote,
    });

    const price = new Prisma.Decimal(payload.price);
    const remainingAmount =
      schedule.frequency === TodoFrequency.ONCE ? null : price;

    const todo = await this.prisma.$transaction(async (tx) => {
      const createdTodo = await this.todosRepository.create(
        {
          userId,
          responsibleUserId,
          name: payload.name,
          price,
          type: todoType,
          priority: payload.priority,
          status: this.resolveInitialTodoStatus(payload.status),
          frequency: schedule.frequency,
          defaultExpenseCategory: financialDefaults.defaultExpenseCategory,
          defaultPaymentMethod: financialDefaults.defaultPaymentMethod,
          defaultMobileMoneyChannel:
            financialDefaults.defaultMobileMoneyChannel,
          defaultMobileMoneyNetwork:
            financialDefaults.defaultMobileMoneyNetwork,
          payee: financialDefaults.payee,
          expenseNote: financialDefaults.expenseNote,
          startDate: schedule.startDate,
          endDate: schedule.endDate,
          frequencyDays: schedule.frequencyDays,
          occurrenceDates: schedule.occurrenceDates,
          recordedOccurrenceDates: [],
          remainingAmount,
        },
        tx,
      );

      await this.todosRepository.createOccurrences(
        this.buildTodoOccurrenceCreateInputs(
          createdTodo.id,
          schedule.occurrenceDates,
        ),
        tx,
      );

      return createdTodo;
    });

    const uploadedImages = await this.uploadTodoImages(
      todo.id,
      payload.name,
      files,
    );

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.todosRepository.createTodoImages(
          uploadedImages.map((image, index) =>
            this.buildTodoImageCreateInput(todo.id, image, index === 0),
          ),
          tx,
        );
      });
    } catch (error) {
      await Promise.all([
        this.todoImageStorageService.cleanupUploadedImages(
          uploadedImages.map((image) => image.publicId),
        ),
        this.todosRepository.update(todo.id, { deletedAt: new Date() }),
      ]);

      throw error;
    }

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  async listCurrentUserTodoRecordings(
    userId: string,
    todoId: string,
  ): Promise<TodoRecordingWithRelations[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    return this.todosRepository.findRecordingsByTodoId(todo.id);
  }

  async recordCurrentUserTodoExpense(
    userId: string,
    todoId: string,
    payload: CreateTodoRecordingRequestDto,
  ): Promise<TodoRecordingWithRelations> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const [todo, expense, existingRecording] = await Promise.all([
      this.findVisibleTodoOrThrow(userId, todoId),
      this.expensesRepository.findActiveByIdAndUserIds(
        payload.expenseId,
        visibleUserIds,
      ),
      this.todosRepository.findRecordingByExpenseId(payload.expenseId, {
        activeOnly: true,
      }),
    ]);

    if (!expense) {
      throw new NotFoundException('Linked expense was not found.');
    }

    if (existingRecording) {
      throw new BadRequestException(
        'This expense has already been linked to a todo recording.',
      );
    }

    const occurrenceDate = this.parseDateOnly(
      payload.occurrenceDate.slice(0, 10),
    );
    const occurrenceIsoDate = this.toIsoDate(occurrenceDate);
    const expenseIsoDate = expense.date.toISOString().slice(0, 10);

    if (expenseIsoDate !== occurrenceIsoDate) {
      throw new BadRequestException(
        'The occurrence date must match the linked expense date.',
      );
    }

    const preparedRecording = this.prepareTodoRecordingMutation(
      todo,
      occurrenceIsoDate,
      new Prisma.Decimal(expense.totalAmountRwf),
    );

    const recording = await this.prisma.$transaction(
      async (tx) => {
        const recordedAt = new Date();

        await this.todosRepository.update(
          todo.id,
          {
            status: preparedRecording.nextStatus,
            recordedOccurrenceDates: {
              set: preparedRecording.nextRecordedOccurrenceDates,
            },
            remainingAmount:
              todo.frequency === TodoFrequency.ONCE
                ? undefined
                : preparedRecording.nextRemainingAmount,
          },
          tx,
        );

        await this.todosRepository.updateOccurrence(
          preparedRecording.occurrence.id,
          {
            status: TodoOccurrenceStatus.RECORDED,
            resolvedAt: recordedAt,
          },
          tx,
        );

        return this.createTodoRecordingInTransaction(
          {
            todoId: todo.id,
            expenseId: expense.id,
            todoOccurrenceId: preparedRecording.occurrence.id,
            occurrenceDate: preparedRecording.occurrenceDate,
            plannedAmount: preparedRecording.plannedAmount,
            baseAmount: expense.amountRwf,
            feeAmount: expense.feeAmountRwf,
            totalChargedAmount: expense.totalAmountRwf,
            varianceAmount: preparedRecording.varianceAmount,
            expenseSource: TodoRecordingExpenseSource.LINKED_EXISTING,
            paymentMethod: expense.paymentMethod,
            mobileMoneyChannel: expense.mobileMoneyChannel,
            mobileMoneyNetwork: expense.mobileMoneyNetwork,
            recordedAt,
            recordedByUserId: userId,
          },
          tx,
        );
      },
      { timeout: TODO_RECORDING_TRANSACTION_TIMEOUT_MS },
    );

    const hydratedRecording =
      await this.todosRepository.findRecordingByIdAndTodoId(
        recording.id,
        todo.id,
      );

    if (!hydratedRecording) {
      throw new NotFoundException(
        'The todo recording was created but could not be reloaded.',
      );
    }

    return hydratedRecording;
  }

  async recordCurrentUserTodoExpenseFromPayload(
    userId: string,
    todoId: string,
    payload: CreateTodoExpenseRequestDto,
  ): Promise<TodoRecordingWithRelations> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const charges = await this.mobileMoneyTariffService.resolveExpenseCharges({
      amount: payload.amount,
      currency: payload.currency,
      paymentMethod: payload.paymentMethod,
      mobileMoneyChannel: payload.mobileMoneyChannel,
      mobileMoneyProvider: payload.mobileMoneyProvider,
      mobileMoneyNetwork: payload.mobileMoneyNetwork,
    });
    const expenseDate = new Date(payload.date);

    if (Number.isNaN(expenseDate.getTime())) {
      throw new BadRequestException('Expense date must be valid.');
    }

    const occurrenceDateValue =
      payload.occurrenceDate ?? expenseDate.toISOString().slice(0, 10);
    const occurrenceDate = this.parseDateOnly(occurrenceDateValue.slice(0, 10));
    const occurrenceIsoDate = this.toIsoDate(occurrenceDate);

    if (expenseDate.toISOString().slice(0, 10) !== occurrenceIsoDate) {
      throw new BadRequestException(
        'The occurrence date must match the expense date.',
      );
    }

    const resolvedExpenseLabel =
      payload.label.trim().length > 0 ? payload.label.trim() : null;
    const expenseNote = payload.note ?? null;

    const recording = await this.prisma.$transaction(
      async (tx) => {
        const todo = await this.findTodoRecordingTargetByIdAndUserIds(
          todoId,
          visibleUserIds,
          tx,
        );

        if (!todo) {
          throw new NotFoundException('Todo item was not found.');
        }

        const preparedRecording = this.prepareTodoRecordingMutation(
          todo,
          occurrenceIsoDate,
          charges.totalAmountRwf,
        );
        const recordedAt = new Date();
        const expense = await this.createExpenseRecordingSnapshot(
          {
            userId,
            label: (resolvedExpenseLabel ?? todo.payee?.trim()) || todo.name,
            amount: charges.amount,
            currency: charges.currency,
            amountRwf: charges.amountRwf,
            feeAmount: charges.feeAmount,
            feeAmountRwf: charges.feeAmountRwf,
            totalAmountRwf: charges.totalAmountRwf,
            paymentMethod: charges.paymentMethod,
            mobileMoneyChannel: charges.mobileMoneyChannel,
            mobileMoneyProvider: charges.mobileMoneyProvider,
            mobileMoneyNetwork: charges.mobileMoneyNetwork,
            category: payload.category,
            date: expenseDate,
            note: expenseNote ?? todo.expenseNote ?? null,
          },
          tx,
        );

        await this.todosRepository.update(
          todo.id,
          {
            status: preparedRecording.nextStatus,
            recordedOccurrenceDates: {
              set: preparedRecording.nextRecordedOccurrenceDates,
            },
            remainingAmount:
              todo.frequency === TodoFrequency.ONCE
                ? undefined
                : preparedRecording.nextRemainingAmount,
          },
          tx,
        );

        await this.todosRepository.updateOccurrence(
          preparedRecording.occurrence.id,
          {
            status: TodoOccurrenceStatus.RECORDED,
            resolvedAt: recordedAt,
          },
          tx,
        );

        return this.createTodoRecordingInTransaction(
          {
            todoId: todo.id,
            expenseId: expense.id,
            todoOccurrenceId: preparedRecording.occurrence.id,
            occurrenceDate: preparedRecording.occurrenceDate,
            plannedAmount: preparedRecording.plannedAmount,
            baseAmount: charges.amountRwf,
            feeAmount: charges.feeAmountRwf,
            totalChargedAmount: charges.totalAmountRwf,
            varianceAmount: preparedRecording.varianceAmount,
            expenseSource: TodoRecordingExpenseSource.GENERATED,
            paymentMethod: charges.paymentMethod,
            mobileMoneyChannel: charges.mobileMoneyChannel,
            mobileMoneyNetwork: charges.mobileMoneyNetwork,
            recordedAt,
            recordedByUserId: userId,
          },
          tx,
        );
      },
      { timeout: TODO_RECORDING_TRANSACTION_TIMEOUT_MS },
    );

    const hydratedRecording =
      await this.todosRepository.findRecordingByIdAndTodoId(
        recording.id,
        todoId,
      );

    if (!hydratedRecording) {
      throw new NotFoundException(
        'The todo recording was created but could not be reloaded.',
      );
    }

    return hydratedRecording;
  }

  async reverseCurrentUserTodoRecording(
    userId: string,
    todoId: string,
    recordingId: string,
    payload: ReverseTodoRecordingRequestDto,
  ): Promise<TodoRecordingWithRelations> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const [todo, recording] = await Promise.all([
      this.findVisibleTodoOrThrow(userId, todoId),
      this.todosRepository.findRecordingByIdAndTodoId(recordingId, todoId),
    ]);

    if (!recording) {
      throw new NotFoundException('Todo recording was not found.');
    }

    if (recording.reversedAt !== null) {
      throw new BadRequestException(
        'This todo recording has already been reversed.',
      );
    }

    const occurrence = todo.occurrences.find(
      (entry) => entry.id === recording.todoOccurrenceId,
    );

    if (!occurrence) {
      throw new BadRequestException(
        'The linked todo occurrence could not be found for reversal.',
      );
    }

    const reversedAt = new Date();
    const nextRecordedOccurrenceDates = this.sortIsoDates(
      todo.recordedOccurrenceDates.filter(
        (date) => date !== recording.occurrenceDate.toISOString().slice(0, 10),
      ),
    );
    const nextRemainingAmount = this.resolveRemainingAmountAfterReversal(
      todo,
      recording,
    );
    const nextStatus = this.resolveTodoStatusAfterRecordingReversal({
      activeRecordingCountAfterReversal: Math.max(
        todo._count.recordings - 1,
        0,
      ),
      frequency: todo.frequency,
      remainingAmount: nextRemainingAmount,
      totalOpenOccurrenceCountAfterReversal:
        this.resolveOpenOccurrenceCountAfterReversal(todo, occurrence.id),
    });

    return this.prisma.$transaction(async (tx) => {
      if (recording.expenseSource === TodoRecordingExpenseSource.GENERATED) {
        const linkedExpense =
          recording.expenseId === null
            ? null
            : await this.expensesRepository.findActiveByIdAndUserIds(
                recording.expenseId,
                visibleUserIds,
                tx,
              );

        if (linkedExpense) {
          await this.expensesRepository.update(
            linkedExpense.id,
            { deletedAt: reversedAt },
            tx,
          );
        }
      }

      await this.todosRepository.update(
        todo.id,
        {
          status: nextStatus,
          recordedOccurrenceDates: {
            set: nextRecordedOccurrenceDates,
          },
          remainingAmount:
            todo.frequency === TodoFrequency.ONCE
              ? undefined
              : nextRemainingAmount,
        },
        tx,
      );

      await this.todosRepository.updateOccurrence(
        occurrence.id,
        {
          status: TodoOccurrenceStatus.SCHEDULED,
          resolvedAt: null,
        },
        tx,
      );

      return this.todosRepository.updateRecording(
        recording.id,
        {
          reversedAt,
          reversalReason: this.normalizeRecordingReversalReason(payload.reason),
          reversedBy: {
            connect: { id: userId },
          },
          occurrence: {
            disconnect: true,
          },
        },
        tx,
      );
    });
  }

  async updateCurrentUserTodo(
    userId: string,
    todoId: string,
    payload: UpdateTodoRequestDto,
    files: TodoUploadFile[],
  ): Promise<TodoWithImages> {
    if (
      payload.name === undefined &&
      payload.price === undefined &&
      payload.type === undefined &&
      payload.priority === undefined &&
      payload.status === undefined &&
      payload.frequency === undefined &&
      payload.defaultExpenseCategory === undefined &&
      payload.defaultPaymentMethod === undefined &&
      payload.defaultMobileMoneyChannel === undefined &&
      payload.defaultMobileMoneyNetwork === undefined &&
      payload.payee === undefined &&
      payload.expenseNote === undefined &&
      payload.responsibleUserId === undefined &&
      payload.startDate === undefined &&
      payload.endDate === undefined &&
      payload.frequencyDays === undefined &&
      payload.occurrenceDates === undefined &&
      payload.primaryImageId === undefined &&
      payload.deductAmount === undefined &&
      payload.recordedOccurrenceDate === undefined &&
      files.length === 0
    ) {
      throw new BadRequestException(
        'Provide at least one todo field or image to update.',
      );
    }

    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);

    const nextName = payload.name ?? todo.name;
    const uploadedImages =
      files.length === 0
        ? []
        : await this.uploadTodoImages(todo.id, nextName, files);

    if (payload.primaryImageId !== undefined) {
      const primaryImage =
        await this.todosRepository.findActiveImageByIdAndTodoId(
          payload.primaryImageId,
          todo.id,
        );

      if (!primaryImage) {
        await this.todoImageStorageService.cleanupUploadedImages(
          uploadedImages.map((image) => image.publicId),
        );

        throw new NotFoundException(
          'The selected primary todo image was not found.',
        );
      }
    }

    const currentFrequency = todo.frequency;
    const nextFrequency = payload.frequency ?? currentFrequency;
    const scheduleHasChanged =
      payload.frequency !== undefined ||
      payload.startDate !== undefined ||
      payload.frequencyDays !== undefined ||
      payload.occurrenceDates !== undefined;

    const currentStartDate =
      todo.startDate !== null
        ? this.toIsoDate(todo.startDate)
        : this.getTodayDateString();

    const nextSchedule = scheduleHasChanged
      ? this.resolveSchedule({
          frequency: nextFrequency,
          startDateInput: payload.startDate ?? currentStartDate,
          frequencyDays: payload.frequencyDays ?? todo.frequencyDays,
          occurrenceDates: payload.occurrenceDates ?? todo.occurrenceDates,
        })
      : {
          frequency: nextFrequency,
          startDate: todo.startDate ?? this.parseDateOnly(currentStartDate),
          endDate:
            todo.endDate ??
            this.computeEndDate(
              this.parseDateOnly(currentStartDate),
              nextFrequency,
            ),
          frequencyDays: todo.frequencyDays,
          occurrenceDates: todo.occurrenceDates,
        };
    const requestedType =
      payload.type ??
      (payload.frequency !== undefined && payload.frequency !== todo.frequency
        ? undefined
        : todo.type);
    const nextType = this.resolveTodoType(
      requestedType,
      nextSchedule.frequency,
      'update',
    );
    const nextResponsibleUserId =
      payload.responsibleUserId === undefined
        ? todo.responsibleUserId
        : await this.resolveResponsibleUserId(
            userId,
            payload.responsibleUserId ?? userId,
          );
    const nextFinancialDefaults = this.resolveTodoFinancialDefaults({
      defaultExpenseCategory:
        payload.defaultExpenseCategory === undefined
          ? todo.defaultExpenseCategory
          : payload.defaultExpenseCategory,
      defaultPaymentMethod:
        payload.defaultPaymentMethod === undefined
          ? todo.defaultPaymentMethod
          : payload.defaultPaymentMethod,
      defaultMobileMoneyChannel:
        payload.defaultMobileMoneyChannel === undefined
          ? todo.defaultMobileMoneyChannel
          : payload.defaultMobileMoneyChannel,
      defaultMobileMoneyNetwork:
        payload.defaultMobileMoneyNetwork === undefined
          ? todo.defaultMobileMoneyNetwork
          : payload.defaultMobileMoneyNetwork,
      payee: payload.payee === undefined ? todo.payee : payload.payee,
      expenseNote:
        payload.expenseNote === undefined
          ? todo.expenseNote
          : payload.expenseNote,
    });

    if (nextType !== todo.type && todo._count.recordings > 0) {
      throw new BadRequestException(
        'Todo type cannot change after expense recordings already exist.',
      );
    }

    const nextPrice =
      payload.price !== undefined
        ? new Prisma.Decimal(payload.price)
        : todo.price;
    const spentSoFar = this.resolveSpentAmount(todo);
    let nextRemainingAmount =
      nextSchedule.frequency === TodoFrequency.ONCE
        ? null
        : this.clampDecimalToZero(nextPrice.minus(spentSoFar));

    const hadRecordingMutation =
      payload.deductAmount !== undefined ||
      payload.recordedOccurrenceDate !== undefined;

    if (
      payload.deductAmount !== undefined ||
      payload.recordedOccurrenceDate !== undefined
    ) {
      if (nextSchedule.frequency === TodoFrequency.ONCE) {
        throw new BadRequestException(
          'Only recurring todos support expense deductions.',
        );
      }

      if (
        payload.deductAmount === undefined ||
        payload.recordedOccurrenceDate === undefined
      ) {
        throw new BadRequestException(
          'deductAmount and recordedOccurrenceDate must be provided together.',
        );
      }

      if (nextRemainingAmount === null) {
        throw new BadRequestException(
          'Recurring todos must keep a remaining amount.',
        );
      }

      const deduction = new Prisma.Decimal(payload.deductAmount);

      if (deduction.greaterThan(nextRemainingAmount)) {
        throw new BadRequestException(
          'deductAmount cannot exceed the remaining recurring budget.',
        );
      }

      nextRemainingAmount = this.clampDecimalToZero(
        nextRemainingAmount.minus(deduction),
      );
    }

    const occurrenceSync = this.prepareOccurrenceSync({
      currentOccurrences: todo.occurrences,
      nextOccurrenceDates: nextSchedule.occurrenceDates,
      explicitStatus: payload.status,
      recordedOccurrenceDate: payload.recordedOccurrenceDate,
    });

    const nextStatus = this.resolveNextTodoStatus({
      currentStatus: todo.status,
      explicitStatus: payload.status,
      frequency: nextSchedule.frequency,
      hasRecordedOccurrences: occurrenceSync.recordedOccurrenceDates.length > 0,
      openOccurrenceCount: occurrenceSync.openOccurrenceDates.length,
      remainingAmount: nextRemainingAmount,
      wasRecordingMutation: hadRecordingMutation,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.todosRepository.update(
          todo.id,
          {
            name: payload.name,
            price:
              payload.price === undefined
                ? undefined
                : new Prisma.Decimal(payload.price),
            type: nextType,
            responsibleUser: {
              connect: { id: nextResponsibleUserId },
            },
            priority: payload.priority,
            status: nextStatus,
            frequency: nextSchedule.frequency,
            defaultExpenseCategory:
              nextFinancialDefaults.defaultExpenseCategory,
            defaultPaymentMethod: nextFinancialDefaults.defaultPaymentMethod,
            defaultMobileMoneyChannel:
              nextFinancialDefaults.defaultMobileMoneyChannel,
            defaultMobileMoneyNetwork:
              nextFinancialDefaults.defaultMobileMoneyNetwork,
            payee: nextFinancialDefaults.payee,
            expenseNote: nextFinancialDefaults.expenseNote,
            startDate: nextSchedule.startDate,
            endDate: nextSchedule.endDate,
            frequencyDays: { set: nextSchedule.frequencyDays },
            occurrenceDates: { set: occurrenceSync.occurrenceDates },
            recordedOccurrenceDates: {
              set: occurrenceSync.recordedOccurrenceDates,
            },
            remainingAmount: nextRemainingAmount,
          },
          tx,
        );

        if (occurrenceSync.deactivatedOccurrenceIds.length > 0) {
          await this.todosRepository.updateManyOccurrences(
            {
              id: { in: occurrenceSync.deactivatedOccurrenceIds },
            },
            {
              active: false,
            },
            tx,
          );
        }

        for (const occurrence of occurrenceSync.updatedOccurrences) {
          await this.todosRepository.updateOccurrence(
            occurrence.id,
            {
              status: occurrence.status,
              resolvedAt: occurrence.resolvedAt,
            },
            tx,
          );
        }

        await this.todosRepository.createOccurrences(
          occurrenceSync.createdOccurrences.map((occurrence) => ({
            todoId: todo.id,
            occurrenceDate: occurrence.occurrenceDate,
            status: occurrence.status,
            active: true,
            resolvedAt: occurrence.resolvedAt,
          })),
          tx,
        );

        if (uploadedImages.length > 0) {
          const shouldAssignFirstUploadAsPrimary = todo.images.length === 0;

          await this.todosRepository.createTodoImages(
            uploadedImages.map((image, index) =>
              this.buildTodoImageCreateInput(
                todo.id,
                image,
                shouldAssignFirstUploadAsPrimary && index === 0,
              ),
            ),
            tx,
          );
        }

        if (payload.primaryImageId !== undefined) {
          await this.todosRepository.updateManyImages(
            todo.id,
            { isPrimary: false },
            tx,
          );
          await this.todosRepository.updateImage(
            payload.primaryImageId,
            { isPrimary: true },
            tx,
          );
        }
      });
    } catch (error) {
      await this.todoImageStorageService.cleanupUploadedImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  async deleteCurrentUserTodo(userId: string, todoId: string): Promise<void> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await this.todosRepository.update(todo.id, { deletedAt }, tx);
      await this.todosRepository.softDeleteImagesByTodoId(
        todo.id,
        deletedAt,
        tx,
      );
    });
  }

  async deleteCurrentUserTodoImage(
    userId: string,
    todoId: string,
    imageId: string,
  ): Promise<TodoWithImages> {
    await this.usersService.findActiveByIdOrThrow(userId);

    const todo = await this.findVisibleTodoOrThrow(userId, todoId);
    const image = todo.images.find((entry) => entry.id === imageId);

    if (!image) {
      throw new NotFoundException('Todo image was not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.todosRepository.updateImage(
        image.id,
        {
          deletedAt: new Date(),
          isPrimary: false,
        },
        tx,
      );

      if (image.isPrimary) {
        const nextPrimary = await this.todosRepository.findNextPrimaryImage(
          todo.id,
          image.id,
          tx,
        );

        if (nextPrimary) {
          await this.todosRepository.updateImage(
            nextPrimary.id,
            {
              isPrimary: true,
            },
            tx,
          );
        }
      }
    });

    return this.findOwnedTodoOrThrow(userId, todo.id);
  }

  private resolveSchedule(input: {
    frequency: TodoFrequency;
    startDateInput?: string;
    frequencyDays?: number[];
    occurrenceDates?: string[];
  }): ResolvedRecurringSchedule {
    const startDate = this.parseDateOnly(
      input.startDateInput ?? this.getTodayDateString(),
    );
    const endDate = this.computeEndDate(startDate, input.frequency);

    if (input.frequency === TodoFrequency.ONCE) {
      const isoDate = this.toIsoDate(startDate);

      return {
        frequency: input.frequency,
        startDate,
        endDate,
        frequencyDays: [],
        occurrenceDates: [isoDate],
      };
    }

    if (input.frequency === TodoFrequency.WEEKLY) {
      const frequencyDays = this.normalizeFrequencyDays(input.frequencyDays);
      const occurrenceDates = this.buildWeeklyOccurrenceDates(
        startDate,
        endDate,
        frequencyDays,
      );

      if (occurrenceDates.length === 0) {
        throw new BadRequestException(
          'The selected weekly days do not produce any occurrence in the current schedule window.',
        );
      }

      return {
        frequency: input.frequency,
        startDate,
        endDate,
        frequencyDays,
        occurrenceDates,
      };
    }

    const occurrenceDates = this.normalizeOccurrenceDates(
      input.occurrenceDates,
    );
    if (occurrenceDates.length === 0) {
      throw new BadRequestException(
        'Select at least one occurrence date for this recurring todo.',
      );
    }

    this.assertOccurrenceDatesInRange(occurrenceDates, startDate, endDate);

    return {
      frequency: input.frequency,
      startDate,
      endDate,
      frequencyDays: [],
      occurrenceDates,
    };
  }

  private normalizeFrequencyDays(frequencyDays?: number[]): number[] {
    if (!frequencyDays || frequencyDays.length === 0) {
      throw new BadRequestException(
        'Select at least one weekday for weekly todos.',
      );
    }

    const normalized = Array.from(new Set(frequencyDays)).sort((a, b) => a - b);
    const invalid = normalized.filter((day) => day < 0 || day > 6);

    if (invalid.length > 0) {
      throw new BadRequestException(
        'Weekly recurrence days must be between 0 (Sun) and 6 (Sat).',
      );
    }

    return normalized;
  }

  private normalizeOccurrenceDates(occurrenceDates?: string[]): string[] {
    if (!occurrenceDates) {
      return [];
    }

    const normalized = Array.from(
      new Set(
        occurrenceDates
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    );

    return this.sortIsoDates(normalized);
  }

  private assertOccurrenceDatesInRange(
    occurrenceDates: string[],
    startDate: Date,
    endDate: Date,
  ): void {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    for (const dateValue of occurrenceDates) {
      const date = this.parseDateOnly(dateValue);
      const time = date.getTime();

      if (time < startTime || time >= endTime) {
        throw new BadRequestException(
          'Occurrence dates must stay inside the current schedule window.',
        );
      }
    }
  }

  private buildWeeklyOccurrenceDates(
    startDate: Date,
    endDate: Date,
    weekdays: number[],
  ): string[] {
    const dates: string[] = [];

    for (
      let cursor = new Date(startDate);
      cursor.getTime() < endDate.getTime();
      cursor = this.addDays(cursor, 1)
    ) {
      if (weekdays.includes(cursor.getUTCDay())) {
        dates.push(this.toIsoDate(cursor));
      }
    }

    return dates;
  }

  private prepareTodoRecordingMutation(
    todo: TodoRecordingMutationTarget,
    occurrenceIsoDate: string,
    chargedAmount: Prisma.Decimal,
  ): PreparedTodoRecordingMutation {
    if (todo.frequency === TodoFrequency.ONCE && todo._count.recordings > 0) {
      throw new BadRequestException(
        'This one-time todo already has a recorded expense.',
      );
    }

    const plannedAmount = this.resolvePlannedRecordingAmount(todo);
    let nextRecordedOccurrenceDates = [...todo.recordedOccurrenceDates];
    let nextRemainingAmount = todo.remainingAmount;
    const occurrence = todo.occurrences.find(
      (entry) => this.toIsoDate(entry.occurrenceDate) === occurrenceIsoDate,
    );

    if (!occurrence) {
      throw new BadRequestException(
        'The selected occurrence date is not part of this todo schedule.',
      );
    }

    if (todo.frequency !== TodoFrequency.ONCE) {
      if (nextRemainingAmount === null) {
        throw new BadRequestException(
          'Recurring todos must keep a remaining amount.',
        );
      }

      const currentStatus = this.resolveEffectiveOccurrenceStatus(occurrence);

      if (
        currentStatus !== TodoOccurrenceStatus.SCHEDULED &&
        currentStatus !== TodoOccurrenceStatus.OVERDUE
      ) {
        throw new BadRequestException(
          'This occurrence date has already been resolved.',
        );
      }

      if (chargedAmount.greaterThan(nextRemainingAmount)) {
        throw new BadRequestException(
          'Total charged amount cannot exceed the remaining recurring budget.',
        );
      }

      nextRecordedOccurrenceDates = this.prepareOccurrenceSync({
        currentOccurrences: todo.occurrences,
        nextOccurrenceDates: todo.occurrenceDates,
        recordedOccurrenceDate: occurrenceIsoDate,
      }).recordedOccurrenceDates;
      nextRemainingAmount = this.clampDecimalToZero(
        nextRemainingAmount.minus(chargedAmount),
      );
    } else {
      nextRecordedOccurrenceDates = [occurrenceIsoDate];
    }

    return {
      occurrence,
      nextRecordedOccurrenceDates,
      nextRemainingAmount,
      nextStatus: this.resolveRecordedTodoStatus({
        frequency: todo.frequency,
        remainingAmount: nextRemainingAmount,
        hasRecordedOccurrences: true,
        openOccurrenceCount:
          todo.frequency === TodoFrequency.ONCE
            ? 0
            : this.prepareOccurrenceSync({
                currentOccurrences: todo.occurrences,
                nextOccurrenceDates: todo.occurrenceDates,
                recordedOccurrenceDate: occurrenceIsoDate,
              }).openOccurrenceDates.length,
      }),
      occurrenceDate: this.parseDateOnly(occurrenceIsoDate),
      plannedAmount,
      varianceAmount: chargedAmount.minus(plannedAmount).toDecimalPlaces(2),
    };
  }

  private resolvePlannedRecordingAmount(
    todo: TodoRecordingMutationTarget,
  ): Prisma.Decimal {
    if (todo.frequency === TodoFrequency.ONCE) {
      return todo.price.toDecimalPlaces(2);
    }

    const remainingDates = this.getOpenOccurrenceDatesFromStates(
      todo.occurrences,
    );
    const remainingAmount = todo.remainingAmount ?? todo.price;

    if (remainingDates.length === 0) {
      return remainingAmount.toDecimalPlaces(2);
    }

    return remainingAmount.dividedBy(remainingDates.length).toDecimalPlaces(2);
  }

  private resolveSpentAmount(todo: TodoWithImages): Prisma.Decimal {
    if (
      todo.frequency === TodoFrequency.ONCE ||
      todo.remainingAmount === null
    ) {
      return new Prisma.Decimal(0);
    }

    return todo.price.minus(todo.remainingAmount);
  }

  private clampDecimalToZero(value: Prisma.Decimal): Prisma.Decimal {
    return value.lessThanOrEqualTo(0) ? new Prisma.Decimal(0) : value;
  }

  private resolveRemainingAmountAfterReversal(
    todo: TodoWithImages,
    recording: Pick<TodoRecordingWithRelations, 'totalChargedAmount'>,
  ): Prisma.Decimal | null {
    if (todo.frequency === TodoFrequency.ONCE) {
      return null;
    }

    const currentRemainingAmount =
      todo.remainingAmount ?? new Prisma.Decimal(0);
    const restoredAmount = currentRemainingAmount
      .plus(recording.totalChargedAmount)
      .toDecimalPlaces(2);

    return restoredAmount.greaterThan(todo.price)
      ? todo.price.toDecimalPlaces(2)
      : restoredAmount;
  }

  private resolveOpenOccurrenceCountAfterReversal(
    todo: TodoWithImages,
    reversedOccurrenceId: string,
  ): number {
    return todo.occurrences.reduce((count, occurrence) => {
      if (occurrence.id === reversedOccurrenceId) {
        return count + 1;
      }

      const status = this.resolveEffectiveOccurrenceStatus(occurrence);
      return status === TodoOccurrenceStatus.SCHEDULED ||
        status === TodoOccurrenceStatus.OVERDUE
        ? count + 1
        : count;
    }, 0);
  }

  private normalizeRecordingReversalReason(reason?: string): string | null {
    const normalized = reason?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  private resolveInitialTodoStatus(status?: TodoStatus): TodoStatus {
    return status ?? TodoStatus.ACTIVE;
  }

  private resolveRecordedTodoStatus(input: {
    frequency: TodoFrequency;
    hasRecordedOccurrences: boolean;
    openOccurrenceCount: number;
    remainingAmount: Prisma.Decimal | null;
  }): TodoStatus {
    if (input.frequency === TodoFrequency.ONCE) {
      return TodoStatus.RECORDED;
    }

    if (
      input.remainingAmount?.lessThanOrEqualTo(0) === true ||
      input.openOccurrenceCount === 0
    ) {
      return TodoStatus.COMPLETED;
    }

    return input.hasRecordedOccurrences
      ? TodoStatus.RECORDED
      : TodoStatus.ACTIVE;
  }

  private resolveTodoStatusAfterRecordingReversal(input: {
    activeRecordingCountAfterReversal: number;
    frequency: TodoFrequency;
    remainingAmount: Prisma.Decimal | null;
    totalOpenOccurrenceCountAfterReversal: number;
  }): TodoStatus {
    if (input.frequency === TodoFrequency.ONCE) {
      return TodoStatus.ACTIVE;
    }

    if (
      input.remainingAmount?.lessThanOrEqualTo(0) === true ||
      input.totalOpenOccurrenceCountAfterReversal === 0
    ) {
      return TodoStatus.COMPLETED;
    }

    return input.activeRecordingCountAfterReversal > 0
      ? TodoStatus.RECORDED
      : TodoStatus.ACTIVE;
  }

  private resolveNextTodoStatus(input: {
    currentStatus: TodoStatus;
    explicitStatus?: TodoStatus;
    frequency: TodoFrequency;
    hasRecordedOccurrences: boolean;
    openOccurrenceCount: number;
    remainingAmount: Prisma.Decimal | null;
    wasRecordingMutation: boolean;
  }): TodoStatus {
    if (input.wasRecordingMutation) {
      return this.resolveRecordedTodoStatus({
        frequency: input.frequency,
        hasRecordedOccurrences: input.hasRecordedOccurrences,
        openOccurrenceCount: input.openOccurrenceCount,
        remainingAmount: input.remainingAmount,
      });
    }

    const nextBaseStatus = input.explicitStatus ?? input.currentStatus;

    if (
      nextBaseStatus === TodoStatus.SKIPPED ||
      nextBaseStatus === TodoStatus.ARCHIVED
    ) {
      return nextBaseStatus;
    }

    if (input.frequency === TodoFrequency.ONCE) {
      return nextBaseStatus;
    }

    const isAutoCompleted =
      input.remainingAmount?.lessThanOrEqualTo(0) === true ||
      input.openOccurrenceCount === 0;

    if (isAutoCompleted) {
      return TodoStatus.COMPLETED;
    }

    if (input.explicitStatus === TodoStatus.COMPLETED) {
      return TodoStatus.COMPLETED;
    }

    if (input.explicitStatus === TodoStatus.ACTIVE) {
      return TodoStatus.ACTIVE;
    }

    if (input.explicitStatus === TodoStatus.RECORDED) {
      return input.hasRecordedOccurrences
        ? TodoStatus.RECORDED
        : TodoStatus.ACTIVE;
    }

    return input.hasRecordedOccurrences
      ? TodoStatus.RECORDED
      : TodoStatus.ACTIVE;
  }

  private computeEndDate(startDate: Date, frequency: TodoFrequency): Date {
    switch (frequency) {
      case TodoFrequency.WEEKLY:
        return this.addDays(startDate, 7);
      case TodoFrequency.MONTHLY:
        return this.addMonths(startDate, 1);
      case TodoFrequency.YEARLY:
        return this.addYears(startDate, 1);
      case TodoFrequency.ONCE:
      default:
        return new Date(startDate);
    }
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private addMonths(date: Date, months: number): Date {
    const next = new Date(date);
    next.setUTCMonth(next.getUTCMonth() + months);
    return next;
  }

  private addYears(date: Date, years: number): Date {
    const next = new Date(date);
    next.setUTCFullYear(next.getUTCFullYear() + years);
    return next;
  }

  private parseDateOnly(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      throw new BadRequestException(
        'Dates must use the YYYY-MM-DD ISO format.',
      );
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException('One of the provided dates is invalid.');
    }

    return parsed;
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private sortIsoDates(values: string[]): string[] {
    return [...values].sort((left, right) => left.localeCompare(right, 'en'));
  }

  private buildTodoOccurrenceCreateInputs(
    todoId: string,
    occurrenceDates: string[],
  ): Prisma.TodoOccurrenceUncheckedCreateInput[] {
    return this.sortIsoDates(occurrenceDates).map((occurrenceDate) => ({
      todoId,
      occurrenceDate: this.parseDateOnly(occurrenceDate),
      status: TodoOccurrenceStatus.SCHEDULED,
      active: true,
      resolvedAt: null,
    }));
  }

  private toOccurrenceIsoDate(
    occurrence: Pick<TodoOccurrenceStateLike, 'occurrenceDate'>,
  ): string {
    return typeof occurrence.occurrenceDate === 'string'
      ? occurrence.occurrenceDate
      : this.toIsoDate(occurrence.occurrenceDate);
  }

  private resolveEffectiveOccurrenceStatus(
    occurrence: Pick<TodoOccurrenceStateLike, 'occurrenceDate' | 'status'>,
  ): TodoOccurrenceStatus {
    if (occurrence.status !== TodoOccurrenceStatus.SCHEDULED) {
      return occurrence.status;
    }

    return this.toOccurrenceIsoDate(occurrence) < this.getTodayDateString()
      ? TodoOccurrenceStatus.OVERDUE
      : TodoOccurrenceStatus.SCHEDULED;
  }

  private getOccurrenceDatesFromStates(
    occurrences: TodoOccurrenceStateLike[],
  ): string[] {
    return this.sortIsoDates(
      occurrences.map((occurrence) => this.toOccurrenceIsoDate(occurrence)),
    );
  }

  private getRecordedOccurrenceDatesFromStates(
    occurrences: TodoOccurrenceStateLike[],
  ): string[] {
    return this.sortIsoDates(
      occurrences
        .filter(
          (occurrence) =>
            this.resolveEffectiveOccurrenceStatus(occurrence) ===
            TodoOccurrenceStatus.RECORDED,
        )
        .map((occurrence) => this.toOccurrenceIsoDate(occurrence)),
    );
  }

  private getOpenOccurrenceDatesFromStates(
    occurrences: TodoOccurrenceStateLike[],
  ): string[] {
    return this.sortIsoDates(
      occurrences
        .filter((occurrence) => {
          const status = this.resolveEffectiveOccurrenceStatus(occurrence);
          return (
            status === TodoOccurrenceStatus.SCHEDULED ||
            status === TodoOccurrenceStatus.OVERDUE
          );
        })
        .map((occurrence) => this.toOccurrenceIsoDate(occurrence)),
    );
  }

  private prepareOccurrenceSync(input: {
    currentOccurrences: TodoOccurrenceWithRecording[];
    explicitStatus?: TodoStatus;
    nextOccurrenceDates: string[];
    recordedOccurrenceDate?: string;
  }): PreparedOccurrenceSync {
    const desiredDates = this.sortIsoDates(input.nextOccurrenceDates);
    const desiredDateSet = new Set(desiredDates);
    const retainedOccurrenceIds = new Set<string>();
    const currentOccurrenceById = new Map(
      input.currentOccurrences.map((occurrence) => [occurrence.id, occurrence]),
    );
    const currentOccurrenceByDate = new Map<
      string,
      TodoOccurrenceWithRecording
    >();

    for (const occurrence of input.currentOccurrences) {
      const isoDate = this.toIsoDate(occurrence.occurrenceDate);

      if (
        desiredDateSet.has(isoDate) &&
        !currentOccurrenceByDate.has(isoDate)
      ) {
        currentOccurrenceByDate.set(isoDate, occurrence);
        retainedOccurrenceIds.add(occurrence.id);
      }
    }

    const preparedOccurrences: TodoOccurrenceStateLike[] = desiredDates.map(
      (occurrenceDate) => {
        const current = currentOccurrenceByDate.get(occurrenceDate);

        return current
          ? {
              id: current.id,
              occurrenceDate: current.occurrenceDate,
              resolvedAt: current.resolvedAt ?? null,
              status: current.status,
              recording: current.recording
                ? {
                    id: current.recording.id,
                    expenseId: current.recording.expenseId,
                  }
                : null,
            }
          : {
              id: null,
              occurrenceDate,
              resolvedAt: null,
              status: TodoOccurrenceStatus.SCHEDULED,
              recording: null,
            };
      },
    );

    const resolvedAt = new Date();

    if (input.explicitStatus === TodoStatus.ACTIVE) {
      for (const occurrence of preparedOccurrences) {
        if (
          occurrence.recording === null &&
          (occurrence.status === TodoOccurrenceStatus.SKIPPED ||
            occurrence.status === TodoOccurrenceStatus.COMPLETED)
        ) {
          occurrence.status = TodoOccurrenceStatus.SCHEDULED;
          occurrence.resolvedAt = null;
        }
      }
    }

    if (
      input.explicitStatus === TodoStatus.COMPLETED ||
      input.explicitStatus === TodoStatus.SKIPPED
    ) {
      const targetStatus =
        input.explicitStatus === TodoStatus.COMPLETED
          ? TodoOccurrenceStatus.COMPLETED
          : TodoOccurrenceStatus.SKIPPED;

      for (const occurrence of preparedOccurrences) {
        const currentStatus = this.resolveEffectiveOccurrenceStatus(occurrence);

        if (
          occurrence.recording === null &&
          (currentStatus === TodoOccurrenceStatus.SCHEDULED ||
            currentStatus === TodoOccurrenceStatus.OVERDUE)
        ) {
          occurrence.status = targetStatus;
          occurrence.resolvedAt = resolvedAt;
        }
      }
    }

    if (input.recordedOccurrenceDate !== undefined) {
      const occurrence = preparedOccurrences.find(
        (entry) =>
          this.toOccurrenceIsoDate(entry) === input.recordedOccurrenceDate,
      );

      if (!occurrence) {
        throw new BadRequestException(
          'The selected occurrence date is not part of this todo schedule.',
        );
      }

      const currentStatus = this.resolveEffectiveOccurrenceStatus(occurrence);

      if (
        occurrence.recording !== null ||
        (currentStatus !== TodoOccurrenceStatus.SCHEDULED &&
          currentStatus !== TodoOccurrenceStatus.OVERDUE)
      ) {
        throw new BadRequestException(
          'This occurrence date has already been resolved.',
        );
      }

      occurrence.status = TodoOccurrenceStatus.RECORDED;
      occurrence.resolvedAt = resolvedAt;
    }

    const updatedOccurrences = preparedOccurrences
      .filter((occurrence) => {
        if (occurrence.id === null) {
          return false;
        }

        const current = currentOccurrenceById.get(occurrence.id);
        if (!current) {
          return false;
        }

        const currentResolvedAt = current.resolvedAt?.getTime() ?? null;
        const nextResolvedAt = occurrence.resolvedAt?.getTime() ?? null;

        return (
          current.status !== occurrence.status ||
          currentResolvedAt !== nextResolvedAt
        );
      })
      .map((occurrence) => ({
        id: occurrence.id!,
        status: occurrence.status,
        resolvedAt: occurrence.resolvedAt ?? null,
      }));

    const createdOccurrences = preparedOccurrences
      .filter((occurrence) => occurrence.id === null)
      .map((occurrence) => ({
        occurrenceDate: this.parseDateOnly(
          this.toOccurrenceIsoDate(occurrence),
        ),
        status: occurrence.status,
        resolvedAt: occurrence.resolvedAt ?? null,
      }));

    return {
      activeOccurrences: preparedOccurrences,
      createdOccurrences,
      deactivatedOccurrenceIds: input.currentOccurrences
        .filter((occurrence) => !retainedOccurrenceIds.has(occurrence.id))
        .map((occurrence) => occurrence.id),
      occurrenceDates: this.getOccurrenceDatesFromStates(preparedOccurrences),
      recordedOccurrenceDates:
        this.getRecordedOccurrenceDatesFromStates(preparedOccurrences),
      openOccurrenceDates:
        this.getOpenOccurrenceDatesFromStates(preparedOccurrences),
      updatedOccurrences,
    };
  }

  private sortTodoListItems(
    items: TodoWithImages[],
    sortBy: TodoSortBy,
  ): TodoWithImages[] {
    if (sortBy === TodoSortBy.CREATED_AT_DESC) {
      return [...items].sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() ||
          left.name.localeCompare(right.name, 'en'),
      );
    }

    return [...items].sort((left, right) => {
      const leftNextOccurrence = this.resolveNextOpenOccurrenceTimestamp(left);
      const rightNextOccurrence =
        this.resolveNextOpenOccurrenceTimestamp(right);

      if (leftNextOccurrence !== rightNextOccurrence) {
        return leftNextOccurrence - rightNextOccurrence;
      }

      return (
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.name.localeCompare(right.name, 'en')
      );
    });
  }

  private resolveNextOpenOccurrenceTimestamp(
    todo: Pick<TodoWithImages, 'occurrences'>,
  ): number {
    const nextOpenOccurrence = todo.occurrences.find((occurrence) => {
      const status = this.resolveEffectiveOccurrenceStatus(occurrence);
      return (
        status === TodoOccurrenceStatus.SCHEDULED ||
        status === TodoOccurrenceStatus.OVERDUE
      );
    });

    return nextOpenOccurrence
      ? nextOpenOccurrence.occurrenceDate.getTime()
      : Number.POSITIVE_INFINITY;
  }

  private async findTodoRecordingTargetByIdAndUserIds(
    todoId: string,
    visibleUserIds: string[],
    tx: Prisma.TransactionClient,
  ): Promise<TodoRecordingMutationTarget | TodoWithImages | null> {
    const repository = this.todosRepository as TodosRepository & {
      findRecordingTargetByIdAndUserIds?: (
        id: string,
        userIds: string[],
        db: Prisma.TransactionClient,
      ) => Promise<TodoRecordingMutationTarget | null>;
    };

    if (repository.findRecordingTargetByIdAndUserIds) {
      return repository.findRecordingTargetByIdAndUserIds(
        todoId,
        visibleUserIds,
        tx,
      );
    }

    return this.todosRepository.findActiveByIdAndUserIds(
      todoId,
      visibleUserIds,
      tx,
    );
  }

  private async createExpenseRecordingSnapshot(
    data: Prisma.ExpenseUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<{
    amountRwf: Prisma.Decimal;
    feeAmountRwf: Prisma.Decimal;
    id: string;
    mobileMoneyChannel: ExpenseMobileMoneyChannel | null;
    mobileMoneyNetwork: ExpenseMobileMoneyNetwork | null;
    paymentMethod: ExpensePaymentMethod;
    totalAmountRwf: Prisma.Decimal;
  }> {
    const repository = this.expensesRepository as ExpensesRepository & {
      createRecordingSnapshot?: (
        createData: Prisma.ExpenseUncheckedCreateInput,
        db: Prisma.TransactionClient,
      ) => Promise<{
        amountRwf: Prisma.Decimal;
        feeAmountRwf: Prisma.Decimal;
        id: string;
        mobileMoneyChannel: ExpenseMobileMoneyChannel | null;
        mobileMoneyNetwork: ExpenseMobileMoneyNetwork | null;
        paymentMethod: ExpensePaymentMethod;
        totalAmountRwf: Prisma.Decimal;
      }>;
    };

    if (repository.createRecordingSnapshot) {
      return repository.createRecordingSnapshot(data, tx);
    }

    return this.expensesRepository.create(data, tx);
  }

  private async createTodoRecordingInTransaction(
    data: Prisma.TodoRecordingUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<TodoRecordingWithRelations | { id: string }> {
    const repository = this.todosRepository as TodosRepository & {
      createRecordingId?: (
        createData: Prisma.TodoRecordingUncheckedCreateInput,
        db: Prisma.TransactionClient,
      ) => Promise<{ id: string }>;
    };

    if (repository.createRecordingId) {
      return repository.createRecordingId(data, tx);
    }

    return this.todosRepository.createRecording(data, tx);
  }

  private isHydratedTodoRecording(
    value: TodoRecordingWithRelations | { id: string },
  ): value is TodoRecordingWithRelations {
    return 'recordedAt' in value;
  }

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private async listSummaryRowsForUser(
    userId: string,
    query: Pick<
      ListTodosQueryDto,
      | 'frequency'
      | 'cadence'
      | 'priority'
      | 'status'
      | 'type'
      | 'operationalState'
      | 'hasLinkedExpense'
      | 'feeBearingOnly'
      | 'remainingBudgetLte'
      | 'search'
      | 'dateFrom'
      | 'dateTo'
    >,
  ): Promise<TodoSummaryRow[]> {
    await this.usersService.findActiveByIdOrThrow(userId);
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const dateRange = resolveListDateRange(query);

    return this.todosRepository.findSummaryRowsByUserIds(visibleUserIds, {
      frequency: query.frequency,
      cadence: query.cadence,
      priority: query.priority,
      status: query.status,
      type: query.type,
      operationalState: query.operationalState,
      hasLinkedExpense: query.hasLinkedExpense,
      feeBearingOnly: query.feeBearingOnly,
      remainingBudgetLte: query.remainingBudgetLte,
      search: normalizeListSearch(query.search),
      occurrenceDates: dateRange?.isoDates,
    });
  }

  private async buildTodoReportingSnapshot(
    rows: TodoSummaryRow[],
    options?: {
      occurrenceDateFrom?: Date;
      occurrenceDateTo?: Date;
    },
  ): Promise<TodoReportingSnapshot> {
    const recordingAggregate =
      await this.todosRepository.aggregateRecordingsByTodoIds(
        rows.map((row) => row.id),
        options,
      );

    let completedCount = 0;
    let openCount = 0;
    let recurringCount = 0;
    let topPriorityCount = 0;
    let withImagesCount = 0;
    let plannedTotal = 0;
    let openPlannedTotal = 0;
    let totalRemainingAmount = 0;
    let remainingRecurringBudgetTotal = 0;
    let overdueCount = 0;
    let overdueOccurrenceCount = 0;
    let recurringBudgetTargetAmount = 0;
    let recurringBudgetUsedAmount = 0;
    const typeBreakdown = new Map<
      TodoType,
      Omit<TodoTypeBreakdownSnapshot, 'type'>
    >(
      Object.values(TodoType).map((type) => [
        type,
        {
          totalCount: 0,
          openCount: 0,
          plannedTotal: 0,
          remainingTotal: 0,
        },
      ]),
    );
    const completionByFrequency = new Map<
      TodoFrequency,
      { completedCount: number; totalCount: number }
    >(
      Object.values(TodoFrequency).map((frequency) => [
        frequency,
        {
          totalCount: 0,
          completedCount: 0,
        },
      ]),
    );

    for (const row of rows) {
      const price = Number(row.price);
      const isClosed = this.isTodoClosed(row.status);
      const overdueOccurrencesForRow = row.occurrences.filter(
        (occurrence) =>
          this.resolveEffectiveOccurrenceStatus(occurrence) ===
          TodoOccurrenceStatus.OVERDUE,
      ).length;
      const frequencyMetrics = completionByFrequency.get(row.frequency)!;
      const typeMetrics = typeBreakdown.get(row.type)!;

      frequencyMetrics.totalCount += 1;
      plannedTotal += price;
      typeMetrics.totalCount += 1;
      typeMetrics.plannedTotal += price;

      if (row.status === TodoStatus.COMPLETED) {
        completedCount += 1;
        frequencyMetrics.completedCount += 1;
      }

      if (!isClosed) {
        openCount += 1;
        openPlannedTotal += price;
        const remainingAmount = this.resolveTodoRemainingAmount(row);
        totalRemainingAmount += remainingAmount;
        typeMetrics.openCount += 1;
        typeMetrics.remainingTotal += remainingAmount;

        if (
          this.isOperationalTodoType(row.type) &&
          overdueOccurrencesForRow > 0
        ) {
          overdueCount += 1;
        }
      }

      if (this.isOperationalTodoType(row.type)) {
        overdueOccurrenceCount += overdueOccurrencesForRow;
      }

      if (row.frequency !== TodoFrequency.ONCE) {
        const targetAmount = price;
        const remainingAmount = Number(row.remainingAmount ?? row.price);
        const usedAmount = Math.max(targetAmount - remainingAmount, 0);

        recurringCount += 1;
        recurringBudgetTargetAmount += targetAmount;
        recurringBudgetUsedAmount += usedAmount;
        remainingRecurringBudgetTotal += remainingAmount;
      }

      if (row.priority === 'TOP_PRIORITY') {
        topPriorityCount += 1;
      }

      if (row.hasActiveImage) {
        withImagesCount += 1;
      }
    }

    const dueNext7Days = this.computeScheduledWindowSnapshot(rows, 7);
    const dueNext30Days = this.computeScheduledWindowSnapshot(rows, 30);
    const recurringBudgetRemainingAmount = this.roundCurrency(
      remainingRecurringBudgetTotal,
    );
    const recurringBudgetUsagePercentage =
      recurringBudgetTargetAmount <= 0
        ? 0
        : Math.round(
            (recurringBudgetUsedAmount / recurringBudgetTargetAmount) * 100,
          );

    return {
      totalCount: rows.length,
      openCount,
      completedCount,
      recurringCount,
      topPriorityCount,
      withImagesCount,
      completionPercentage:
        rows.length === 0
          ? 0
          : Math.round((completedCount / rows.length) * 100),
      imageCoveragePercentage:
        rows.length === 0
          ? 0
          : Math.round((withImagesCount / rows.length) * 100),
      plannedTotal: this.roundCurrency(plannedTotal),
      openPlannedTotal: this.roundCurrency(openPlannedTotal),
      totalRemainingAmount: this.roundCurrency(totalRemainingAmount),
      remainingRecurringBudgetTotal: recurringBudgetRemainingAmount,
      recordedCount: recordingAggregate.totalCount,
      recordedBaseTotalAmount: this.roundCurrency(
        Number(recordingAggregate.totalBaseAmount),
      ),
      recordedFeeTotalAmount: this.roundCurrency(
        Number(recordingAggregate.totalFeeAmount),
      ),
      recordedTotalAmount: this.roundCurrency(
        Number(recordingAggregate.totalChargedAmount),
      ),
      recordedVarianceTotalAmount: this.roundCurrency(
        Number(recordingAggregate.totalVarianceAmount),
      ),
      feeBearingRecordingCount: recordingAggregate.feeBearingCount,
      overdueCount,
      overdueOccurrenceCount,
      dueNext7DaysCount: dueNext7Days.count,
      dueNext7DaysAmount: dueNext7Days.amount,
      dueNext30DaysCount: dueNext30Days.count,
      dueNext30DaysAmount: dueNext30Days.amount,
      recurringBudgetBurnDown: {
        targetAmount: this.roundCurrency(recurringBudgetTargetAmount),
        usedAmount: this.roundCurrency(recurringBudgetUsedAmount),
        remainingAmount: recurringBudgetRemainingAmount,
        usagePercentage: recurringBudgetUsagePercentage,
      },
      completionByFrequency: Object.values(TodoFrequency).map((frequency) => {
        const metrics = completionByFrequency.get(frequency)!;

        return {
          frequency,
          totalCount: metrics.totalCount,
          completedCount: metrics.completedCount,
          completionPercentage:
            metrics.totalCount === 0
              ? 0
              : Math.round((metrics.completedCount / metrics.totalCount) * 100),
        };
      }),
      typeBreakdown: Object.values(TodoType).map((type) => {
        const metrics = typeBreakdown.get(type)!;

        return {
          type,
          totalCount: metrics.totalCount,
          openCount: metrics.openCount,
          plannedTotal: this.roundCurrency(metrics.plannedTotal),
          remainingTotal: this.roundCurrency(metrics.remainingTotal),
        };
      }),
    };
  }

  private computeScheduledWindowSnapshot(
    rows: TodoSummaryRow[],
    windowDays: number,
  ): { amount: number; count: number } {
    const today = this.parseDateOnly(this.getTodayDateString());
    const windowEnd = this.toIsoDate(this.addDays(today, windowDays - 1));
    const todayIsoDate = this.toIsoDate(today);
    let total = 0;
    let count = 0;

    for (const row of rows) {
      if (!this.isOperationalTodoType(row.type)) {
        continue;
      }

      if (this.isTodoClosed(row.status)) {
        continue;
      }

      const remainingDates = this.getRemainingOccurrenceDates(row);
      if (remainingDates.length === 0) {
        continue;
      }

      const matchingOccurrenceCount = remainingDates.filter(
        (date) => date >= todayIsoDate && date <= windowEnd,
      ).length;

      if (matchingOccurrenceCount === 0) {
        continue;
      }

      count += matchingOccurrenceCount;
      total +=
        this.resolveUpcomingOccurrenceAmount(row, remainingDates) *
        matchingOccurrenceCount;
    }

    return {
      count,
      amount: this.roundCurrency(total),
    };
  }

  private getRemainingOccurrenceDates(row: TodoSummaryRow): string[] {
    return this.getOpenOccurrenceDatesFromStates(row.occurrences);
  }

  private resolveUpcomingOccurrenceAmount(
    row: TodoSummaryRow,
    remainingDates: string[],
  ): number {
    if (row.frequency === 'ONCE') {
      return Number(row.price);
    }

    const remainingAmount = Number(row.remainingAmount ?? row.price);
    if (remainingDates.length === 0) {
      return this.roundCurrency(remainingAmount);
    }

    return this.roundCurrency(remainingAmount / remainingDates.length);
  }

  private resolveTodoRemainingAmount(row: TodoSummaryRow): number {
    if (this.isTodoClosed(row.status)) {
      return 0;
    }

    if (row.frequency === TodoFrequency.ONCE) {
      return row.status === TodoStatus.ACTIVE ? Number(row.price) : 0;
    }

    return Number(row.remainingAmount ?? row.price);
  }

  private resolveTodoFinancialDefaults(input: {
    defaultExpenseCategory?: ExpenseCategory | null;
    defaultPaymentMethod?: ExpensePaymentMethod | null;
    defaultMobileMoneyChannel?: ExpenseMobileMoneyChannel | null;
    defaultMobileMoneyNetwork?: ExpenseMobileMoneyNetwork | null;
    payee?: string | null;
    expenseNote?: string | null;
  }): {
    defaultExpenseCategory: ExpenseCategory | null;
    defaultPaymentMethod: ExpensePaymentMethod | null;
    defaultMobileMoneyChannel: ExpenseMobileMoneyChannel | null;
    defaultMobileMoneyNetwork: ExpenseMobileMoneyNetwork | null;
    payee: string | null;
    expenseNote: string | null;
  } {
    const paymentMethod = input.defaultPaymentMethod ?? null;
    const channel = input.defaultMobileMoneyChannel ?? null;
    const network = input.defaultMobileMoneyNetwork ?? null;

    if (paymentMethod === null) {
      if (channel !== null || network !== null) {
        throw new BadRequestException(
          'Default mobile money metadata requires a default mobile money payment method.',
        );
      }
    } else if (paymentMethod !== ExpensePaymentMethod.MOBILE_MONEY) {
      if (channel !== null || network !== null) {
        throw new BadRequestException(
          'Default mobile money metadata can only be set when the default payment method is MOBILE_MONEY.',
        );
      }
    } else {
      if (channel === null) {
        throw new BadRequestException(
          'Default mobile money payments require a default mobile money channel.',
        );
      }

      if (
        channel === ExpenseMobileMoneyChannel.P2P_TRANSFER &&
        network === null
      ) {
        throw new BadRequestException(
          'Default P2P mobile money payments require a default mobile money network.',
        );
      }
    }

    return {
      defaultExpenseCategory: input.defaultExpenseCategory ?? null,
      defaultPaymentMethod: paymentMethod,
      defaultMobileMoneyChannel:
        paymentMethod === ExpensePaymentMethod.MOBILE_MONEY ? channel : null,
      defaultMobileMoneyNetwork:
        paymentMethod === ExpensePaymentMethod.MOBILE_MONEY &&
        channel === ExpenseMobileMoneyChannel.P2P_TRANSFER
          ? network
          : null,
      payee: input.payee ?? null,
      expenseNote: input.expenseNote ?? null,
    };
  }

  private async resolveResponsibleUserId(
    userId: string,
    responsibleUserId?: string | null,
  ): Promise<string> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const resolvedUserId = responsibleUserId ?? userId;

    if (!visibleUserIds.includes(resolvedUserId)) {
      throw new BadRequestException(
        'Responsible user must be visible in the current shared workspace.',
      );
    }

    return resolvedUserId;
  }

  private resolveTodoType(
    requestedType: TodoType | undefined,
    frequency: TodoFrequency,
    mode: 'create' | 'update',
  ): TodoType {
    const resolvedType =
      requestedType ??
      (frequency === TodoFrequency.ONCE
        ? TodoType.WISHLIST
        : TodoType.RECURRING_OBLIGATION);

    if (
      resolvedType === TodoType.RECURRING_OBLIGATION &&
      frequency === TodoFrequency.ONCE
    ) {
      throw new BadRequestException(
        `${mode === 'create' ? 'Recurring obligations' : 'A recurring obligation'} must use WEEKLY, MONTHLY, or YEARLY frequency.`,
      );
    }

    if (
      (resolvedType === TodoType.WISHLIST ||
        resolvedType === TodoType.PLANNED_SPEND) &&
      frequency !== TodoFrequency.ONCE
    ) {
      throw new BadRequestException(
        `${resolvedType === TodoType.WISHLIST ? 'Wishlist items' : 'Planned one-off spends'} must use ONCE frequency.`,
      );
    }

    return resolvedType;
  }

  private isOperationalTodoType(type: TodoType): boolean {
    return (
      type === TodoType.PLANNED_SPEND || type === TodoType.RECURRING_OBLIGATION
    );
  }

  private isTodoClosed(status: TodoStatus): boolean {
    return (
      status === 'COMPLETED' || status === 'SKIPPED' || status === 'ARCHIVED'
    );
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private async findOwnedTodoOrThrow(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    return this.findVisibleTodoOrThrow(userId, todoId);
  }

  private async findVisibleTodoOrThrow(
    userId: string,
    todoId: string,
  ): Promise<TodoWithImages> {
    const visibleUserIds =
      await this.partnershipsService.getVisibleUserIds(userId);
    const todo = await this.todosRepository.findActiveByIdAndUserIds(
      todoId,
      visibleUserIds,
    );

    if (!todo) {
      throw new NotFoundException('Todo item was not found.');
    }

    return todo;
  }

  private async uploadTodoImages(
    todoId: string,
    todoName: string,
    files: TodoUploadFile[],
  ): Promise<StoredTodoImage[]> {
    this.assertImageLimit(files.length);

    const uploadedImages: StoredTodoImage[] = [];

    try {
      for (const file of files) {
        const uploadedImage =
          await this.todoImageStorageService.uploadTodoImage({
            todoId,
            todoName,
            file,
          });

        uploadedImages.push(uploadedImage);
      }
    } catch (error) {
      await this.todoImageStorageService.cleanupUploadedImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }

    return uploadedImages;
  }

  private buildTodoImageCreateInput(
    todoId: string,
    image: StoredTodoImage,
    isPrimary: boolean,
  ): Prisma.TodoImageUncheckedCreateInput {
    return {
      todoId,
      publicId: image.publicId,
      imageUrl: image.imageUrl,
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      format: image.format,
      isPrimary,
    };
  }

  private assertImageLimit(imageCount: number): void {
    if (imageCount > MAX_TODO_IMAGES) {
      throw new BadRequestException(
        `A todo item supports up to ${MAX_TODO_IMAGES} images.`,
      );
    }
  }
}
