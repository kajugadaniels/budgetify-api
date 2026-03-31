import { Injectable } from '@nestjs/common';
import { Income, Prisma } from '@prisma/client';

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
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<Income[]> {
    return db.income.findMany({
      where: {
        userId,
        deletedAt: null,
        date:
          options?.dateFrom && options?.dateTo
            ? {
                gte: options.dateFrom,
                lt: options.dateTo,
              }
            : undefined,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
