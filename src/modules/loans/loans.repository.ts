import { Injectable } from '@nestjs/common';
import { Loan, Prisma } from '@prisma/client';

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
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<Loan[]> {
    return db.loan.findMany({
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
