import { Injectable } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction | null> {
    return db.transaction.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    });
  }

  async create(
    data: Prisma.TransactionUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction> {
    return db.transaction.create({ data });
  }
}
