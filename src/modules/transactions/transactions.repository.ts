import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Transaction,
  TransactionEvent,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

interface UssdOpenedEventInput {
  transactionId: string;
  clientEventId: string;
  fromStatus: TransactionStatus;
  toStatus: TransactionStatus;
  occurredAt: Date;
}

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

  async findEventByClientEventId(
    transactionId: string,
    clientEventId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TransactionEvent | null> {
    return db.transactionEvent.findUnique({
      where: {
        transactionId_clientEventId: {
          transactionId,
          clientEventId,
        },
      },
    });
  }

  async create(
    data: Prisma.TransactionUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction> {
    return db.transaction.create({
      data,
    });
  }

  async createEvent(
    data: Prisma.TransactionEventUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TransactionEvent> {
    return db.transactionEvent.create({
      data,
    });
  }

  async transitionPendingToProcessing(
    userId: string,
    transactionId: string,
    processedAt: Date,
    db: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    const result = await db.transaction.updateMany({
      where: {
        id: transactionId,
        userId,
        status: TransactionStatus.PENDING,
      },
      data: {
        status: TransactionStatus.PROCESSING,
        processedAt,
      },
    });

    return result.count === 1;
  }

  async upsertUssdOpenedEvent(
    input: UssdOpenedEventInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TransactionEvent> {
    return db.transactionEvent.upsert({
      where: {
        transactionId_clientEventId: {
          transactionId: input.transactionId,
          clientEventId: input.clientEventId,
        },
      },
      create: {
        transactionId: input.transactionId,
        type: TransactionEventType.USSD_OPENED,
        source: TransactionEventSource.MOBILE_APP,
        clientEventId: input.clientEventId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        occurredAt: input.occurredAt,
      },
      update: {},
    });
  }
}
