import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionClassification,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ReceivedTransactionWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ReceivedTransactionUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<ReceivedTransaction> {
    return db.receivedTransaction.create({
      data,
    });
  }

  async updateOwnedClassification(
    userId: string,
    receivedTransactionId: string,
    classification: ReceivedTransactionClassification,
    db: PrismaExecutor = this.prisma,
  ): Promise<ReceivedTransaction | null> {
    const result = await db.receivedTransaction.updateMany({
      where: {
        id: receivedTransactionId,

        userId,
      },

      data: {
        classification,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return db.receivedTransaction.findFirst({
      where: {
        id: receivedTransactionId,

        userId,
      },
    });
  }
}
