import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Transaction,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { RecordManualResultRequestDto } from '../dto/record-manual-result.request.dto';
import { TransactionEventRepository } from '../repositories/transaction-event.repository';
import { TransactionReadRepository } from '../repositories/transaction-read.repository';
import { TransactionWriteRepository } from '../repositories/transaction-write.repository';

@Injectable()
export class TransactionManualResultService {
  constructor(
    private readonly transactionReadRepository: TransactionReadRepository,

    private readonly transactionWriteRepository: TransactionWriteRepository,

    private readonly transactionEventRepository: TransactionEventRepository,

    private readonly prisma: PrismaService,
  ) {}

  async record(
    userId: string,
    transactionId: string,
    body: RecordManualResultRequestDto,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      let transaction = await this.transactionReadRepository.findOwnedById(
        userId,
        transactionId,
        tx,
      );

      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      const existingEvent =
        await this.transactionEventRepository.findByClientEventId(
          transaction.id,
          body.clientEventId,
          tx,
        );

      if (existingEvent) {
        this.assertEventMatches(existingEvent, body);

        return transaction;
      }

      this.assertCanBeRecorded(transaction.status);

      const occurredAt = new Date();

      const fromStatus = transaction.status;

      const transitioned =
        await this.transactionWriteRepository.transitionToManualResult(
          {
            userId,

            transactionId: transaction.id,

            expectedStatus: transaction.status,

            toStatus: body.status,

            occurredAt,

            processedAt: transaction.processedAt ?? occurredAt,
          },
          tx,
        );

      if (!transitioned) {
        transaction = await this.transactionReadRepository.findOwnedById(
          userId,
          transaction.id,
          tx,
        );

        if (!transaction) {
          throw new NotFoundException('Transaction not found.');
        }

        const raceEvent =
          await this.transactionEventRepository.findByClientEventId(
            transaction.id,
            body.clientEventId,
            tx,
          );

        if (raceEvent) {
          this.assertEventMatches(raceEvent, body);

          return transaction;
        }

        throw new ConflictException(
          'Transaction status changed while the manual result was being recorded.',
        );
      }

      const event = await this.transactionEventRepository.upsertManualResult(
        {
          transactionId: transaction.id,

          clientEventId: body.clientEventId,

          fromStatus,

          toStatus: body.status,

          occurredAt,
        },
        tx,
      );

      this.assertEventMatches(event, body);

      transaction = await this.transactionReadRepository.findOwnedById(
        userId,
        transaction.id,
        tx,
      );

      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      return transaction;
    });
  }

  private assertCanBeRecorded(status: TransactionStatus): void {
    if (
      status === TransactionStatus.PENDING ||
      status === TransactionStatus.PROCESSING
    ) {
      return;
    }

    throw new ConflictException(
      `A manual result cannot be recorded for a ${status.toLowerCase()} transaction.`,
    );
  }

  private assertEventMatches(
    event: {
      type: TransactionEventType;

      source: TransactionEventSource;

      toStatus: TransactionStatus | null;

      providerReference: string | null;

      failureCode: string | null;

      failureReason: string | null;
    },
    body: RecordManualResultRequestDto,
  ): void {
    const matches =
      event.type === TransactionEventType.STATUS_CHANGED &&
      event.source === TransactionEventSource.MOBILE_APP &&
      event.toStatus === body.status &&
      event.providerReference === null &&
      event.failureCode === null &&
      event.failureReason === null;

    if (!matches) {
      throw new ConflictException(
        'This client event ID was already used for a different manual result.',
      );
    }
  }
}
