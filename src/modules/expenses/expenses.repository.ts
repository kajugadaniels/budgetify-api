import { Injectable } from '@nestjs/common';
import { Expense, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ExpensesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Expense[]> {
    return db.expense.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
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
