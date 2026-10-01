import { ConflictException, Injectable } from '@nestjs/common';
import {
  Currency,
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { RecordReceivedManualRequestDto } from '../dto/record-received-manual.request.dto';
import {
  assertReceivedOccurrenceTime,
  assertReceivedSenderPresent,
  createReceivedTransactionReference,
  normalizeReceivedSenderIdentifier,
} from '../policies/received-transaction-recording.policy';
import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';

@Injectable()
export class ReceivedManualRecordingService {
  constructor(
    private readonly readRepository: ReceivedTransactionReadRepository,

    private readonly writeRepository: ReceivedTransactionWriteRepository,
  ) {}

  async record(
    userId: string,
    body: RecordReceivedManualRequestDto,
  ): Promise<ReceivedTransaction> {
    const occurredAt = new Date(body.occurredAt);

    assertReceivedSenderPresent(
      body.senderIdentifier,
      body.senderName,
      'A manually recorded received transaction must include a sender name or sender identifier.',
    );

    assertReceivedOccurrenceTime(occurredAt);

    const senderIdentifier = normalizeReceivedSenderIdentifier(
      body.senderIdentifier,
    );

    const existingByClientEvent = await this.readRepository.findByClientEventId(
      userId,
      body.clientEventId,
    );

    if (existingByClientEvent) {
      this.assertClientEventMatches(existingByClientEvent, body, occurredAt);

      return existingByClientEvent;
    }

    if (body.providerReference) {
      const existingByProviderReference =
        await this.readRepository.findByProviderReference(
          userId,
          body.providerReference,
        );

      if (existingByProviderReference) {
        this.assertProviderReferenceMatches(
          existingByProviderReference,
          body,
          occurredAt,
        );

        return existingByProviderReference;
      }
    }

    try {
      return await this.writeRepository.create({
        userId,

        reference: createReceivedTransactionReference(),

        clientEventId: body.clientEventId,

        status: ReceivedTransactionStatus.COMPLETED,

        classification: ReceivedTransactionClassification.UNCLASSIFIED,

        evidenceSource: ReceivedTransactionEvidenceSource.MANUAL,

        currency: Currency.RWF,

        amount: body.amount,

        senderIdentifier,

        senderName: body.senderName ?? null,

        providerReference: body.providerReference ?? null,

        occurredAt,

        reversedAt: null,

        note: null,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return this.resolveUniqueRace(userId, body, occurredAt);
      }

      throw error;
    }
  }

  private async resolveUniqueRace(
    userId: string,
    body: RecordReceivedManualRequestDto,
    occurredAt: Date,
  ): Promise<ReceivedTransaction> {
    const racedByClientEvent = await this.readRepository.findByClientEventId(
      userId,
      body.clientEventId,
    );

    if (racedByClientEvent) {
      this.assertClientEventMatches(racedByClientEvent, body, occurredAt);

      return racedByClientEvent;
    }

    if (body.providerReference) {
      const racedByProviderReference =
        await this.readRepository.findByProviderReference(
          userId,
          body.providerReference,
        );

      if (racedByProviderReference) {
        this.assertProviderReferenceMatches(
          racedByProviderReference,
          body,
          occurredAt,
        );

        return racedByProviderReference;
      }
    }

    throw new ConflictException(
      'Received transaction has already been recorded.',
    );
  }

  private assertClientEventMatches(
    existing: ReceivedTransaction,
    body: RecordReceivedManualRequestDto,
    occurredAt: Date,
  ): void {
    const matches =
      existing.evidenceSource === ReceivedTransactionEvidenceSource.MANUAL &&
      existing.providerReference === (body.providerReference ?? null) &&
      existing.amount === body.amount &&
      existing.occurredAt.getTime() === occurredAt.getTime();

    if (!matches) {
      throw new ConflictException(
        'This client event ID was already used for a different received transaction.',
      );
    }
  }

  private assertProviderReferenceMatches(
    existing: ReceivedTransaction,
    body: RecordReceivedManualRequestDto,
    occurredAt: Date,
  ): void {
    const matches =
      existing.providerReference === body.providerReference &&
      existing.amount === body.amount &&
      existing.occurredAt.getTime() === occurredAt.getTime();

    if (!matches) {
      throw new ConflictException(
        'This provider reference is already assigned to a different received transaction.',
      );
    }
  }
}
