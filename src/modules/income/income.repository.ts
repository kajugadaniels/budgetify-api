import { Injectable } from '@nestjs/common';
import { Income, Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class IncomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      category?: Prisma.IncomeWhereInput['category'];
      received?: boolean;
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<Income>> {
    const where: Prisma.IncomeWhereInput = {
      userId,
      deletedAt: null,
      category: options?.category,
      received: options?.received,
      date:
        options?.dateFrom && options?.dateTo
          ? {
              gte: options.dateFrom,
              lt: options.dateTo,
            }
          : undefined,
    };

    const [items, totalItems] = await Promise.all([
      db.income.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.income.count({ where }),
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
  ): Promise<Income | null> {
    return db.income.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.IncomeUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Income> {
    return db.income.create({ data });
  }

  async update(
    id: string,
    data: Prisma.IncomeUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Income> {
    return db.income.update({
      where: { id },
      data,
    });
  }
}
