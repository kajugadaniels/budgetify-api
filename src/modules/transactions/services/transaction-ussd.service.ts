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
import { RecordUssdOpenedRequestDto } from '../dto/record-ussd-opened.request.dto';
import { TransactionsRepository } from '../transactions.repository';

@Injectable()
export class TransactionUssdService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,

    private readonly prisma: PrismaService,
  ) {}

  async recordOpened(
    userId: string,
    transactionId: string,
    body: RecordUssdOpenedRequestDto,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      let transaction = await this.transactionsRepository.findOwnedById(
        userId,
        transactionId,
        tx,
      );

      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      const existingEvent =
        await this.transactionsRepository.findEventByClientEventId(
          transaction.id,
          body.clientEventId,
          tx,
        );

      if (existingEvent) {
        if (
          existingEvent.type !== TransactionEventType.USSD_OPENED ||
          existingEvent.source !== TransactionEventSource.MOBILE_APP
        ) {
          throw new ConflictException(
            'This client event ID was already used for another transaction event.',
          );
        }

        return transaction;
      }

      this.assertCanBeOpened(transaction.status);

      let eventFromStatus = transaction.status;

      const occurredAt = new Date();

      if (transaction.status === TransactionStatus.PENDING) {
        const transitioned =
          await this.transactionsRepository.transitionPendingToProcessing(
            userId,
            transaction.id,
            occurredAt,
            tx,
          );

        transaction = await this.transactionsRepository.findOwnedById(
          userId,
          transaction.id,
          tx,
        );

        if (!transaction) {
          throw new NotFoundException('Transaction not found.');
        }

        this.assertCanBeOpened(transaction.status);

        if (transaction.status !== TransactionStatus.PROCESSING) {
          throw new ConflictException(
            'Transaction could not be moved to processing.',
          );
        }

        if (!transitioned) {
          eventFromStatus = transaction.status;
        }
      }

      await this.transactionsRepository.upsertUssdOpenedEvent(
        {
          transactionId: transaction.id,

          clientEventId: body.clientEventId,

          fromStatus: eventFromStatus,

          toStatus: transaction.status,

          occurredAt,
        },
        tx,
      );

      return transaction;
    });
  }

  private assertCanBeOpened(status: TransactionStatus): void {
    if (
      status === TransactionStatus.PENDING ||
      status === TransactionStatus.PROCESSING
    ) {
      return;
    }

    throw new ConflictException(
      `USSD cannot be opened for a ${status.toLowerCase()} transaction.`,
    );
  }
}
