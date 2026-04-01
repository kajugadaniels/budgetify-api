import { Injectable } from '@nestjs/common';
import { Loan, Prisma } from '@prisma/client';

import {
  PaginatedResponse,
  createPaginatedResponse,
} from '../../common/interfaces/paginated-response.interface';
import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class LoansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
      paid?: boolean;
      skip?: number;
      take?: number;
      page: number;
      limit: number;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<PaginatedResponse<Loan>> {
    const where: Prisma.LoanWhereInput = {
      userId,
      deletedAt: null,
      paid: options?.paid,
      date:
        options?.dateFrom && options?.dateTo
          ? {
              gte: options.dateFrom,
              lt: options.dateTo,
            }
          : undefined,
    };

    const [items, totalItems] = await Promise.all([
      db.loan.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: options?.skip,
        take: options?.take,
      }),
      db.loan.count({ where }),
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
  ): Promise<Loan | null> {
    return db.loan.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.LoanUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Loan> {
    return db.loan.create({ data });
  }

  async update(
    id: string,
    data: Prisma.LoanUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Loan> {
    return db.loan.update({
      where: { id },
      data,
    });
  }
}
