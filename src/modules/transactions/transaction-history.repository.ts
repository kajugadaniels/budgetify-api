import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionStatus,
  Transaction,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { TransactionHistoryDirection } from './transaction-history.types';

interface TransactionHistoryRepositoryInput {
  userId: string;

  page: number;

  limit: number;

  direction?: TransactionHistoryDirection;

  status?: TransactionStatus;

  transferType?: TransactionTransferType;

  search?: string;
}

interface SourceResult<T> {
  items: T[];
  total: number;
}

export interface TransactionHistoryCandidates {
  sent: Transaction[];
  received: ReceivedTransaction[];
  total: number;
}

@Injectable()
export class TransactionHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCandidates(
    input: TransactionHistoryRepositoryInput,
  ): Promise<TransactionHistoryCandidates> {
    const take = input.page * input.limit;

    const includeSent =
      input.direction !== TransactionHistoryDirection.RECEIVED;

    const includeReceived =
      input.direction !== TransactionHistoryDirection.SENT &&
      input.transferType == null &&
      this.receivedSupportsStatus(input.status);

    const [sent, received] = await Promise.all([
      includeSent
        ? this.listSent(input, take)
        : Promise.resolve({
            items: [],
            total: 0,
          } as SourceResult<Transaction>),

      includeReceived
        ? this.listReceived(input, take)
        : Promise.resolve({
            items: [],
            total: 0,
          } as SourceResult<ReceivedTransaction>),
    ]);

    return {
      sent: sent.items,

      received: received.items,

      total: sent.total + received.total,
    };
  }

  private async listSent(
    input: TransactionHistoryRepositoryInput,
    take: number,
  ): Promise<SourceResult<Transaction>> {
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

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,

        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        take,
      }),

      this.prisma.transaction.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  private async listReceived(
    input: TransactionHistoryRepositoryInput,
    take: number,
  ): Promise<SourceResult<ReceivedTransaction>> {
    const status = this.toReceivedStatus(input.status);

    const where: Prisma.ReceivedTransactionWhereInput = {
      userId: input.userId,

      ...(status
        ? {
            status,
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

    const [items, total] = await Promise.all([
      this.prisma.receivedTransaction.findMany({
        where,

        orderBy: [
          {
            occurredAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],

        take,
      }),

      this.prisma.receivedTransaction.count({
        where,
      }),
    ]);

    return {
      items,
      total,
    };
  }

  private receivedSupportsStatus(status?: TransactionStatus): boolean {
    return (
      status == null ||
      status === TransactionStatus.COMPLETED ||
      status === TransactionStatus.REVERSED
    );
  }

  private toReceivedStatus(
    status?: TransactionStatus,
  ): ReceivedTransactionStatus | undefined {
    if (status === TransactionStatus.COMPLETED) {
      return ReceivedTransactionStatus.COMPLETED;
    }

    if (status === TransactionStatus.REVERSED) {
      return ReceivedTransactionStatus.REVERSED;
    }

    return undefined;
  }
}
