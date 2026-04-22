import { Injectable } from '@nestjs/common';
import { Prisma, TodoFrequency, TodoImage, TodoStatus } from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

const TODO_RECORDING_EXPENSE_SELECT = {
  id: true,
  label: true,
  category: true,
  date: true,
  totalAmountRwf: true,
  feeAmountRwf: true,
} as const;

const TODO_RECORDING_INCLUDE = {
  recordedBy: { select: USER_SELECT },
  expense: { select: TODO_RECORDING_EXPENSE_SELECT },
} satisfies Prisma.TodoRecordingInclude;

const TODO_SUMMARY_ROW_SELECT = {
  id: true,
  name: true,
  price: true,
  priority: true,
  status: true,
  frequency: true,
  occurrenceDates: true,
  recordedOccurrenceDates: true,
  remainingAmount: true,
  createdAt: true,
  images: {
    where: { deletedAt: null },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.TodoSelect;

export const activeTodoInclude = {
  images: {
    where: { deletedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  user: { select: USER_SELECT },
  recordings: {
    orderBy: [{ recordedAt: 'desc' }],
    take: 5,
    include: TODO_RECORDING_INCLUDE,
  },
  _count: {
    select: {
      recordings: true,
    },
  },
} satisfies Prisma.TodoInclude;

/** @deprecated Use activeTodoInclude */
export const activeTodoImagesInclude = activeTodoInclude;

export type TodoWithImages = Prisma.TodoGetPayload<{
  include: typeof activeTodoInclude;
}>;

export type TodoRecordingWithRelations = Prisma.TodoRecordingGetPayload<{
  include: typeof TODO_RECORDING_INCLUDE;
}>;

type TodoSummaryRowRaw = Prisma.TodoGetPayload<{
  select: typeof TODO_SUMMARY_ROW_SELECT;
}>;

export type TodoSummaryRow = Omit<TodoSummaryRowRaw, 'images'> & {
  hasActiveImage: boolean;
};

export type TodoRecordingAggregate = {
  totalCount: number;
  totalChargedAmount: Prisma.Decimal;
};

@Injectable()
export class TodosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserIds(
    userIds: string[],
    options?: {
      frequency?: TodoFrequency;
      priority?: Prisma.TodoWhereInput['priority'];
      status?: TodoStatus;
      search?: string;
      occurrenceDates?: string[];
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<TodoWithImages>> {
    const where = this.buildWhere(userIds, options);

    const [items, totalItems] = await Promise.all([
      db.todo.findMany({
        where,
        include: activeTodoInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.todo.count({ where }),
    ]);

    return createPaginatedResponse(items, totalItems, {
      page: options?.page ?? 1,
      limit: options?.limit ?? Math.max(items.length, 1),
    });
  }

  async findSummaryRowsByUserIds(
    userIds: string[],
    options?: {
      frequency?: TodoFrequency;
      priority?: Prisma.TodoWhereInput['priority'];
      status?: TodoStatus;
      search?: string;
      occurrenceDates?: string[];
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoSummaryRow[]> {
    const items = await db.todo.findMany({
      where: this.buildWhere(userIds, options),
      select: TODO_SUMMARY_ROW_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });

    return items.map((item) => ({
      ...item,
      hasActiveImage: item.images.length > 0,
    }));
  }

  async aggregateRecordingsByTodoIds(
    todoIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoRecordingAggregate> {
    if (todoIds.length === 0) {
      return {
        totalCount: 0,
        totalChargedAmount: new Prisma.Decimal(0),
      };
    }

    const result = await db.todoRecording.aggregate({
      where: { todoId: { in: todoIds } },
      _count: { _all: true },
      _sum: { totalChargedAmount: true },
    });

    return {
      totalCount: result._count._all,
      totalChargedAmount:
        result._sum.totalChargedAmount ?? new Prisma.Decimal(0),
    };
  }

  async findActiveByIdAndUserId(
    id: string,
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages | null> {
    return this.findActiveByIdAndUserIds(id, [userId], db);
  }

  async findActiveByIdAndUserIds(
    id: string,
    userIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages | null> {
    return db.todo.findFirst({
      where: {
        id,
        userId: { in: userIds },
        deletedAt: null,
      },
      include: activeTodoInclude,
    });
  }

  async findActiveImageByIdAndTodoId(
    id: string,
    todoId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage | null> {
    return db.todoImage.findFirst({
      where: {
        id,
        todoId,
        deletedAt: null,
      },
    });
  }

  async findNextPrimaryImage(
    todoId: string,
    excludedImageId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage | null> {
    return db.todoImage.findFirst({
      where: {
        todoId,
        deletedAt: null,
        id: {
          not: excludedImageId,
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async create(
    data: Prisma.TodoUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages> {
    return db.todo.create({ data, include: activeTodoInclude });
  }

  async findRecordingByExpenseId(
    expenseId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoRecordingWithRelations | null> {
    return db.todoRecording.findUnique({
      where: { expenseId },
      include: TODO_RECORDING_INCLUDE,
    });
  }

  async findRecordingsByTodoId(
    todoId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoRecordingWithRelations[]> {
    return db.todoRecording.findMany({
      where: { todoId },
      include: TODO_RECORDING_INCLUDE,
      orderBy: [{ recordedAt: 'desc' }],
    });
  }

  async createRecording(
    data: Prisma.TodoRecordingUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoRecordingWithRelations> {
    return db.todoRecording.create({
      data,
      include: TODO_RECORDING_INCLUDE,
    });
  }

  async update(
    id: string,
    data: Prisma.TodoUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoWithImages> {
    return db.todo.update({
      where: { id },
      data,
      include: activeTodoInclude,
    });
  }

  async createTodoImages(
    data: Prisma.TodoImageUncheckedCreateInput[],
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage[]> {
    return Promise.all(
      data.map((image) =>
        db.todoImage.create({
          data: image,
        }),
      ),
    );
  }

  async updateImage(
    id: string,
    data: Prisma.TodoImageUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TodoImage> {
    return db.todoImage.update({
      where: { id },
      data,
    });
  }

  async updateManyImages(
    todoId: string,
    data: Prisma.TodoImageUpdateManyMutationInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.todoImage.updateMany({
      where: {
        todoId,
        deletedAt: null,
      },
      data,
    });
  }

  async softDeleteImagesByTodoId(
    todoId: string,
    deletedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<Prisma.BatchPayload> {
    return db.todoImage.updateMany({
      where: {
        todoId,
        deletedAt: null,
      },
      data: {
        deletedAt,
        isPrimary: false,
      },
    });
  }

  private buildWhere(
    userIds: string[],
    options?: {
      frequency?: TodoFrequency;
      priority?: Prisma.TodoWhereInput['priority'];
      status?: TodoStatus;
      search?: string;
      occurrenceDates?: string[];
    },
  ): Prisma.TodoWhereInput {
    const frequencyWhere =
      options?.frequency === TodoFrequency.ONCE
        ? {
            OR: [
              { frequency: TodoFrequency.ONCE },
              {
                AND: [
                  { startDate: null },
                  { endDate: null },
                  { frequencyDays: { isEmpty: true } },
                  { occurrenceDates: { isEmpty: true } },
                ],
              },
            ],
          }
        : options?.frequency !== undefined
          ? { frequency: options.frequency }
          : undefined;

    return {
      userId: { in: userIds },
      deletedAt: null,
      ...(frequencyWhere ?? {}),
      priority: options?.priority,
      status: options?.status,
      name:
        options?.search !== undefined
          ? {
              contains: options.search,
              mode: 'insensitive',
            }
          : undefined,
      occurrenceDates:
        options?.occurrenceDates && options.occurrenceDates.length > 0
          ? {
              hasSome: options.occurrenceDates,
            }
          : undefined,
    };
  }
}
