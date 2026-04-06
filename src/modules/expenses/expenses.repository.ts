import { Injectable } from '@nestjs/common';
import { ExpenseCategory, Prisma } from '@prisma/client';

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

export type ExpenseWithCreator = Prisma.ExpenseGetPayload<{
  include: { user: { select: typeof USER_SELECT } };
}>;

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserIds(
    userIds: string[],
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      searchCategories?: ExpenseCategory[];
      category?: Prisma.ExpenseWhereInput['category'];
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<ExpenseWithCreator>> {
    const searchFilters: Prisma.ExpenseWhereInput[] = [];

    if (options?.search) {
      searchFilters.push({
        label: {
          contains: options.search,
          mode: 'insensitive',
        },
      });
      searchFilters.push({
        note: {
          contains: options.search,
          mode: 'insensitive',
        },
      });

      if (options.searchCategories && options.searchCategories.length > 0) {
        searchFilters.push({
          category: {
            in: options.searchCategories,
          },
        });
      }
    }

    const where: Prisma.ExpenseWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
      category: options?.category,
      AND:
        searchFilters.length > 0
          ? [
              {
                OR: searchFilters,
              },
            ]
          : undefined,
      date:
        options?.dateFrom && options?.dateTo
          ? {
              gte: options.dateFrom,
              lt: options.dateTo,
            }
          : undefined,
    };

    const [items, totalItems] = await Promise.all([
      db.expense.findMany({
        where,
        include: { user: { select: USER_SELECT } },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.expense.count({ where }),
    ]);

    return createPaginatedResponse(items, totalItems, {
      page: options?.page ?? 1,
      limit: options?.limit ?? Math.max(items.length, 1),
    });
  }

  async findActiveByIdAndUserId(
    id: string,
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<ExpenseWithCreator | null> {
    return this.findActiveByIdAndUserIds(id, [userId], db);
  }

  async findActiveByIdAndUserIds(
    id: string,
    userIds: string[],
    db: PrismaExecutor = this.prisma,
  ): Promise<ExpenseWithCreator | null> {
    return db.expense.findFirst({
      where: {
        id,
        userId: { in: userIds },
        deletedAt: null,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async create(
    data: Prisma.ExpenseUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<ExpenseWithCreator> {
    return db.expense.create({
      data,
      include: { user: { select: USER_SELECT } },
    });
  }

  async update(
    id: string,
    data: Prisma.ExpenseUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<ExpenseWithCreator> {
    return db.expense.update({
      where: { id },
      data,
      include: { user: { select: USER_SELECT } },
    });
  }
}
