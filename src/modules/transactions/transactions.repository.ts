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

interface ProviderResultTransitionInput {
  userId: string;
  transactionId: string;
  expectedStatus: TransactionStatus;
  toStatus:
    | TransactionStatus.COMPLETED
    | TransactionStatus.FAILED
    | TransactionStatus.CANCELLED;
  occurredAt: Date;
  processedAt: Date;
  providerReference?: string;
  receiverName?: string;
  failureCode?: string;
  failureReason?: string;
}

interface ProviderResultEventInput {
  transactionId: string;
  clientEventId: string;
  fromStatus: TransactionStatus;
  toStatus:
    | TransactionStatus.COMPLETED
    | TransactionStatus.FAILED
    | TransactionStatus.CANCELLED;
  occurredAt: Date;
  providerReference?: string;
  failureCode?: string;
  failureReason?: string;
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

  async transitionToProviderResult(
    input: ProviderResultTransitionInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    const isCompleted = input.toStatus === TransactionStatus.COMPLETED;

    const isFailed = input.toStatus === TransactionStatus.FAILED;

    const isCancelled = input.toStatus === TransactionStatus.CANCELLED;

    const result = await db.transaction.updateMany({
      where: {
        id: input.transactionId,
        userId: input.userId,
        status: input.expectedStatus,
      },
      data: {
        status: input.toStatus,
        processedAt: input.processedAt,

        ...(input.providerReference !== undefined
          ? {
              providerReference: input.providerReference,
            }
          : {}),

        ...(input.receiverName !== undefined
          ? {
              receiverName: input.receiverName,
            }
          : {}),

        failureCode: isCompleted ? null : (input.failureCode ?? null),

        failureReason: isCompleted ? null : (input.failureReason ?? null),

        completedAt: isCompleted ? input.occurredAt : null,

        failedAt: isFailed ? input.occurredAt : null,

        cancelledAt: isCancelled ? input.occurredAt : null,
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

  async upsertProviderResultEvent(
    input: ProviderResultEventInput,
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
        type: TransactionEventType.PROVIDER_RESULT_RECEIVED,
        source: TransactionEventSource.PROVIDER_SMS,
        clientEventId: input.clientEventId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        providerReference: input.providerReference,
        failureCode: input.failureCode,
        failureReason: input.failureReason,
        occurredAt: input.occurredAt,
      },
      update: {},
    });
  }
}
