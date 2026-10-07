import { ConflictException, Injectable } from '@nestjs/common';
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
        ...(classification !== ReceivedTransactionClassification.INCOME ? { income: null } : {}),
      },

      data: {
        classification,
      },
    });

    if (result.count === 0) {
      const linked = await db.receivedTransaction.findFirst({
        where: { id: receivedTransactionId, userId, income: { isNot: null } },
        select: { id: true },
      });
      if (linked) {
        throw new ConflictException('A payment linked to an income record must remain classified as income.');
      }
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
