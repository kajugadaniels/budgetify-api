import { Injectable } from '@nestjs/common';
import { Prisma, Saving } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SavingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByUserId(
    userId: string,
    options?: {
      dateFrom?: Date;
      dateTo?: Date;
    },
    db: PrismaExecutor = this.prisma,
  ): Promise<Saving[]> {
    return db.saving.findMany({
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
  ): Promise<Saving | null> {
    return db.saving.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.SavingUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Saving> {
    return db.saving.create({ data });
  }

  async update(
    id: string,
    data: Prisma.SavingUpdateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Saving> {
    return db.saving.update({
      where: { id },
      data,
    });
  }
}
