import { Injectable } from '@nestjs/common';
import { Prisma, Transaction, TransactionStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

type ProviderResultStatus =
  | typeof TransactionStatus.COMPLETED
  | typeof TransactionStatus.FAILED
  | typeof TransactionStatus.CANCELLED;

type ManualResultStatus =
  | typeof TransactionStatus.COMPLETED
  | typeof TransactionStatus.FAILED;

interface ProviderResultTransitionInput {
  userId: string;

  transactionId: string;

  expectedStatus: TransactionStatus;

  toStatus: ProviderResultStatus;

  occurredAt: Date;

  processedAt: Date;

  providerReference?: string;

  receiverName?: string;

  failureCode?: string;

  failureReason?: string;
}

interface ManualResultTransitionInput {
  userId: string;

  transactionId: string;

  expectedStatus: TransactionStatus;

  toStatus: ManualResultStatus;

  occurredAt: Date;

  processedAt: Date;
}

@Injectable()
export class TransactionWriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.TransactionUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<Transaction> {
    return db.transaction.create({
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

  async transitionToManualResult(
    input: ManualResultTransitionInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<boolean> {
    const isCompleted = input.toStatus === TransactionStatus.COMPLETED;

    const isFailed = input.toStatus === TransactionStatus.FAILED;

    const result = await db.transaction.updateMany({
      where: {
        id: input.transactionId,

        userId: input.userId,

        status: input.expectedStatus,
      },

      data: {
        status: input.toStatus,

        processedAt: input.processedAt,

        // A manual result has no provider-supplied
        // failure metadata.
        failureCode: null,

        failureReason: null,

        completedAt: isCompleted ? input.occurredAt : null,

        failedAt: isFailed ? input.occurredAt : null,

        cancelledAt: null,
      },
    });

    return result.count === 1;
  }
}
