import { Injectable } from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      category?: Prisma.ExpenseWhereInput['category'];
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<Expense>> {
    const where: Prisma.ExpenseWhereInput = {
      userId,
      deletedAt: null,
      category: options?.category,
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
  ): Promise<Expense | null> {
    return db.expense.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.ExpenseUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Expense> {
    return db.expense.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ExpenseUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Expense> {
    return db.expense.update({
      where: { id },
      data,
    });
  }
}
