import { Injectable } from '@nestjs/common';
import {
  Prisma,
  TransactionEvent,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

type PrismaExecutor = Prisma.TransactionClient | PrismaService;

type ProviderResultStatus =
  | typeof TransactionStatus.COMPLETED
  | typeof TransactionStatus.FAILED
  | typeof TransactionStatus.CANCELLED;

type ManualResultStatus =
  | typeof TransactionStatus.COMPLETED
  | typeof TransactionStatus.FAILED;

interface UssdOpenedEventInput {
  transactionId: string;

  clientEventId: string;

  fromStatus: TransactionStatus;

  toStatus: TransactionStatus;

  occurredAt: Date;
}

interface ProviderResultEventInput {
  transactionId: string;

  clientEventId: string;

  fromStatus: TransactionStatus;

  toStatus: ProviderResultStatus;

  occurredAt: Date;

  providerReference?: string;

  failureCode?: string;

  failureReason?: string;
}

interface ManualResultEventInput {
  transactionId: string;

  clientEventId: string;

  fromStatus: TransactionStatus;

  toStatus: ManualResultStatus;

  occurredAt: Date;
}

@Injectable()
export class TransactionEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByClientEventId(
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
    data: Prisma.TransactionEventUncheckedCreateInput,
    db: PrismaExecutor = this.prisma,
  ): Promise<TransactionEvent> {
    return db.transactionEvent.create({
      data,
    });
  }

  async upsertUssdOpened(
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

  async upsertProviderSmsResult(
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

  async upsertManualResult(
    input: ManualResultEventInput,
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

        type: TransactionEventType.STATUS_CHANGED,

        source: TransactionEventSource.MOBILE_APP,

        clientEventId: input.clientEventId,

        fromStatus: input.fromStatus,

        toStatus: input.toStatus,

        occurredAt: input.occurredAt,
      },

      update: {},
    });
  }

  async findByTransactionId(
    transactionId: string,
    db: PrismaExecutor = this.prisma,
  ): Promise<TransactionEvent[]> {
    return db.transactionEvent.findMany({
      where: {
        transactionId,
      },

      orderBy: [
        {
          occurredAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }
}
