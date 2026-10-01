import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Transaction,
  TransactionEventSource,
  TransactionEventType,
  TransactionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { RecordProviderSmsResultRequestDto } from '../dto/record-provider-sms-result.request.dto';
import { TransactionsRepository } from '../transactions.repository';

@Injectable()
export class TransactionProviderSmsResultService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,

    private readonly prisma: PrismaService,
  ) {}

  async record(
    userId: string,
    transactionId: string,
    body: RecordProviderSmsResultRequestDto,
  ): Promise<Transaction> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        let transaction = await this.transactionsRepository.findOwnedById(
          userId,
          transactionId,
          tx,
        );

        if (!transaction) {
          throw new NotFoundException('Transaction not found.');
        }

        const occurredAt = new Date(body.occurredAt);

        const existingEvent =
          await this.transactionsRepository.findEventByClientEventId(
            transaction.id,
            body.clientEventId,
            tx,
          );

        if (existingEvent) {
          this.assertEventMatches(existingEvent, body);

          return transaction;
        }

        this.assertCanBeRecorded(transaction, body, occurredAt);

        if (body.providerReference) {
          const referenceOwner =
            await this.transactionsRepository.findByProviderReference(
              body.providerReference,
              tx,
            );

          if (referenceOwner && referenceOwner.id !== transaction.id) {
            throw new ConflictException(
              'Provider reference is already assigned to another transaction.',
            );
          }
        }

        const fromStatus = transaction.status;

        const transitioned =
          await this.transactionsRepository.transitionToProviderResult(
            {
              userId,

              transactionId: transaction.id,

              expectedStatus: transaction.status,

              toStatus: body.status,

              occurredAt,

              processedAt: transaction.processedAt ?? occurredAt,

              providerReference: body.providerReference,

              receiverName: body.receiverName,

              failureCode: body.failureCode,

              failureReason: body.failureReason,
            },
            tx,
          );

        if (!transitioned) {
          transaction = await this.transactionsRepository.findOwnedById(
            userId,
            transaction.id,
            tx,
          );

          if (!transaction) {
            throw new NotFoundException('Transaction not found.');
          }

          const raceEvent =
            await this.transactionsRepository.findEventByClientEventId(
              transaction.id,
              body.clientEventId,
              tx,
            );

          if (raceEvent) {
            this.assertEventMatches(raceEvent, body);

            return transaction;
          }

          throw new ConflictException(
            'Transaction status changed while the provider result was being recorded.',
          );
        }

        const event =
          await this.transactionsRepository.upsertProviderResultEvent(
            {
              transactionId: transaction.id,

              clientEventId: body.clientEventId,

              fromStatus,

              toStatus: body.status,

              occurredAt,

              providerReference: body.providerReference,

              failureCode: body.failureCode,

              failureReason: body.failureReason,
            },
            tx,
          );

        this.assertEventMatches(event, body);

        transaction = await this.transactionsRepository.findOwnedById(
          userId,
          transaction.id,
          tx,
        );

        if (!transaction) {
          throw new NotFoundException('Transaction not found.');
        }

        return transaction;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Provider transaction reference has already been recorded.',
        );
      }

      throw error;
    }
  }

  private assertCanBeRecorded(
    transaction: Transaction,
    body: RecordProviderSmsResultRequestDto,
    occurredAt: Date,
  ): void {
    if (
      transaction.status !== TransactionStatus.PENDING &&
      transaction.status !== TransactionStatus.PROCESSING
    ) {
      throw new ConflictException(
        `A provider result cannot be recorded for a ${transaction.status.toLowerCase()} transaction.`,
      );
    }

    if (body.amount !== transaction.amount) {
      throw new ConflictException(
        'Provider result amount does not match the transaction amount.',
      );
    }

    if (
      body.status === TransactionStatus.COMPLETED &&
      !body.providerReference
    ) {
      throw new BadRequestException(
        'Completed transactions require a provider reference.',
      );
    }

    if (
      body.status === TransactionStatus.COMPLETED &&
      (body.failureCode || body.failureReason)
    ) {
      throw new BadRequestException(
        'Completed transactions cannot contain failure information.',
      );
    }

    const maximumFutureTime = Date.now() + 5 * 60 * 1000;

    if (occurredAt.getTime() > maximumFutureTime) {
      throw new BadRequestException(
        'Provider result time cannot be in the future.',
      );
    }

    const earliestAllowedTime = transaction.createdAt.getTime() - 5 * 60 * 1000;

    if (occurredAt.getTime() < earliestAllowedTime) {
      throw new BadRequestException(
        'Provider result time cannot significantly predate the transaction.',
      );
    }
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
    body: RecordProviderSmsResultRequestDto,
  ): void {
    const matches =
      event.type === TransactionEventType.PROVIDER_RESULT_RECEIVED &&
      event.source === TransactionEventSource.PROVIDER_SMS &&
      event.toStatus === body.status &&
      event.providerReference === (body.providerReference ?? null) &&
      event.failureCode === (body.failureCode ?? null) &&
      event.failureReason === (body.failureReason ?? null);

    if (!matches) {
      throw new ConflictException(
        'This client event ID was already used for a different provider result.',
      );
    }
  }
}
