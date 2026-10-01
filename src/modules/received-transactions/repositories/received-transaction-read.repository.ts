import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

export interface ListOwnedReceivedTransactionsInput {
  userId: string;

  page: number;

  limit: number;

  status?: ReceivedTransactionStatus;

  evidenceSource?: ReceivedTransactionEvidenceSource;

  classification?: ReceivedTransactionClassification;

  occurredFrom?: Date;

  occurredTo?: Date;

  search?: string;
}

export interface ListOwnedReceivedTransactionsResult {
  items: ReceivedTransaction[];

  total: number;
}

@Injectable()
export class ReceivedTransactionReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedById(
    userId: string,
    receivedTransactionId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<ReceivedTransaction | null> {
    return db.receivedTransaction.findFirst({
      where: {
        id: receivedTransactionId,

        userId,
      },
    });
  }

  async findByClientEventId(
    userId: string,
    clientEventId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<ReceivedTransaction | null> {
    return db.receivedTransaction.findUnique({
      where: {
        userId_clientEventId: {
          userId,

          clientEventId,
        },
      },
    });
  }

  async findByProviderReference(
    userId: string,
    providerReference: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<ReceivedTransaction | null> {
    return db.receivedTransaction.findUnique({
      where: {
        userId_providerReference: {
          userId,

          providerReference,
        },
      },
    });
  }

  async listOwned(
    input: ListOwnedReceivedTransactionsInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<ListOwnedReceivedTransactionsResult> {
    const where: Prisma.ReceivedTransactionWhereInput = {
      userId: input.userId,

      ...(input.status
        ? {
            status: input.status,
          }
        : {}),

      ...(input.evidenceSource
        ? {
            evidenceSource: input.evidenceSource,
          }
        : {}),

      ...(input.classification
        ? {
            classification: input.classification,
          }
        : {}),

      ...(input.occurredFrom || input.occurredTo
        ? {
            occurredAt: {
              ...(input.occurredFrom
                ? {
                    gte: input.occurredFrom,
                  }
                : {}),

              ...(input.occurredTo
                ? {
                    lte: input.occurredTo,
                  }
                : {}),
            },
          }
        : {}),

      ...(input.search
        ? {
            OR: [
              {
                reference: {
                  contains: input.search,

                  mode: 'insensitive',
                },
              },
              {
                providerReference: {
                  contains: input.search,

                  mode: 'insensitive',
                },
              },
              {
                senderIdentifier: {
                  contains: input.search,

                  mode: 'insensitive',
                },
              },
              {
                senderName: {
                  contains: input.search,

                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;

    const [items, total] = await Promise.all([
      db.receivedTransaction.findMany({
        where,

        orderBy: [
          {
            occurredAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        skip,

        take: input.limit,
      }),

      db.receivedTransaction.count({
        where,
      }),
    ]);

    return {
      items,

      total,
    };
  }
}
