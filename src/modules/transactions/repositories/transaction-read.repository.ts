import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Transaction,
  TransactionCategory,
  TransactionRecipientType,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

interface ListOwnedTransactionsInput {
  userId: string;

  page: number;

  limit: number;

  status?: TransactionStatus;

  transferType?: TransactionTransferType;

  recipientType?: TransactionRecipientType;

  category?: TransactionCategory;

  createdFrom?: Date;

  createdTo?: Date;

  search?: string;
}

interface ListOwnedTransactionsResult {
  items: Transaction[];

  total: number;
}

@Injectable()
export class TransactionReadRepository {
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

  async findOwnedById(
    userId: string,
    transactionId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction | null> {
    return db.transaction.findFirst({
      where: {
        id: transactionId,

        userId,
      },
    });
  }

  async findByProviderReference(
    providerReference: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction | null> {
    return db.transaction.findUnique({
      where: {
        providerReference,
      },
    });
  }

  async listOwned(
    input: ListOwnedTransactionsInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<ListOwnedTransactionsResult> {
    const where: Prisma.TransactionWhereInput = {
      userId: input.userId,

      ...(input.status
        ? {
            status: input.status,
          }
        : {}),

      ...(input.transferType
        ? {
            transferType: input.transferType,
          }
        : {}),

      ...(input.recipientType
        ? {
            recipientType: input.recipientType,
          }
        : {}),

      ...(input.category
        ? {
            category: input.category,
          }
        : {}),

      ...(input.createdFrom || input.createdTo
        ? {
            createdAt: {
              ...(input.createdFrom
                ? {
                    gte: input.createdFrom,
                  }
                : {}),

              ...(input.createdTo
                ? {
                    lte: input.createdTo,
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
                receiverIdentifier: {
                  contains: input.search,

                  mode: 'insensitive',
                },
              },
              {
                receiverName: {
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
            ],
          }
        : {}),
    };

    const skip = (input.page - 1) * input.limit;

    const [items, total] = await Promise.all([
      db.transaction.findMany({
        where,

        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        skip,

        take: input.limit,
      }),

      db.transaction.count({
        where,
      }),
    ]);

    return {
      items,

      total,
    };
  }
}
