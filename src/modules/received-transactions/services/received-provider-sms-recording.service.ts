import { ConflictException, Injectable } from '@nestjs/common';
import {
  Currency,
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { RecordReceivedProviderSmsRequestDto } from '../dto/record-received-provider-sms.request.dto';
import {
  assertReceivedOccurrenceTime,
  assertReceivedSenderPresent,
  createReceivedTransactionReference,
  normalizeReceivedSenderIdentifier,
} from '../policies/received-transaction-recording.policy';
import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';

@Injectable()
export class ReceivedProviderSmsRecordingService {
  constructor(
    private readonly readRepository: ReceivedTransactionReadRepository,

    private readonly writeRepository: ReceivedTransactionWriteRepository,
  ) {}

  async record(
    userId: string,
    body: RecordReceivedProviderSmsRequestDto,
  ): Promise<ReceivedTransaction> {
    const occurredAt = new Date(body.occurredAt);

    assertReceivedSenderPresent(
      body.senderIdentifier,
      body.senderName,
      'Received transaction evidence must include a sender name or sender identifier.',
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

    try {
      return await this.writeRepository.create({
        userId,

        reference: createReceivedTransactionReference(),

        clientEventId: body.clientEventId,

        status: ReceivedTransactionStatus.COMPLETED,

        classification: ReceivedTransactionClassification.UNCLASSIFIED,

        evidenceSource: ReceivedTransactionEvidenceSource.PROVIDER_SMS,

        currency: Currency.RWF,

        amount: body.amount,

        senderIdentifier,

        senderName: body.senderName ?? null,

        providerReference: body.providerReference,

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
    body: RecordReceivedProviderSmsRequestDto,
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

    throw new ConflictException(
      'Received transaction evidence has already been recorded.',
    );
  }

  private assertClientEventMatches(
    existing: ReceivedTransaction,
    body: RecordReceivedProviderSmsRequestDto,
    occurredAt: Date,
  ): void {
    const matches =
      existing.evidenceSource ===
        ReceivedTransactionEvidenceSource.PROVIDER_SMS &&
      existing.providerReference === body.providerReference &&
      existing.amount === body.amount &&
      existing.occurredAt.getTime() === occurredAt.getTime();

    if (!matches) {
      throw new ConflictException(
        'This client event ID was already used for different received transaction evidence.',
      );
    }
  }

  private assertProviderReferenceMatches(
    existing: ReceivedTransaction,
    body: RecordReceivedProviderSmsRequestDto,
    occurredAt: Date,
  ): void {
    const matches =
      existing.evidenceSource ===
        ReceivedTransactionEvidenceSource.PROVIDER_SMS &&
      existing.amount === body.amount &&
      existing.occurredAt.getTime() === occurredAt.getTime();

    if (!matches) {
      throw new ConflictException(
        'This provider reference is already assigned to different received transaction evidence.',
      );
    }
  }
}
