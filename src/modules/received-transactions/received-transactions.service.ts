import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  Prisma,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

import { ListReceivedTransactionsQueryDto } from './dto/list-received-transactions.query.dto';
import { RecordReceivedProviderSmsRequestDto } from './dto/record-received-provider-sms.request.dto';
import { ReceivedTransactionsRepository } from './received-transactions.repository';

interface ReceivedTransactionListResult {
  items: ReceivedTransaction[];

  pagination: {
    page: number;

    limit: number;

    total: number;

    totalPages: number;

    hasNextPage: boolean;

    hasPreviousPage: boolean;
  };
}

@Injectable()
export class ReceivedTransactionsService {
  constructor(
    private readonly receivedTransactionsRepository: ReceivedTransactionsRepository,
  ) {}

  async list(
    userId: string,
    query: ListReceivedTransactionsQueryDto,
  ): Promise<ReceivedTransactionListResult> {
    const occurredFrom = query.from ? new Date(query.from) : undefined;

    const occurredTo = query.to ? new Date(query.to) : undefined;

    if (
      occurredFrom &&
      occurredTo &&
      occurredFrom.getTime() > occurredTo.getTime()
    ) {
      throw new BadRequestException(
        'From date must be earlier than or equal to the to date.',
      );
    }

    const result = await this.receivedTransactionsRepository.listOwned({
      userId,

      page: query.page,

      limit: query.limit,

      status: query.status,

      evidenceSource: query.evidenceSource,

      classification: query.classification,

      occurredFrom,

      occurredTo,

      search: query.search,
    });

    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    return {
      items: result.items,

      pagination: {
        page: query.page,

        limit: query.limit,

        total: result.total,

        totalPages,

        hasNextPage: query.page * query.limit < result.total,

        hasPreviousPage: query.page > 1,
      },
    };
  }

  async getDetail(
    userId: string,
    receivedTransactionId: string,
  ): Promise<ReceivedTransaction> {
    const transaction = await this.receivedTransactionsRepository.findOwnedById(
      userId,
      receivedTransactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Received transaction not found.');
    }

    return transaction;
  }

  async recordProviderSms(
    userId: string,
    body: RecordReceivedProviderSmsRequestDto,
  ): Promise<ReceivedTransaction> {
    const occurredAt = new Date(body.occurredAt);

    this.assertProviderSmsInput(body, occurredAt);

    const senderIdentifier = this.normalizeSenderIdentifier(
      body.senderIdentifier,
    );

    const existingByClientEvent =
      await this.receivedTransactionsRepository.findByClientEventId(
        userId,
        body.clientEventId,
      );

    if (existingByClientEvent) {
      this.assertClientEventMatches(existingByClientEvent, body, occurredAt);

      return existingByClientEvent;
    }

    const existingByProviderReference =
      await this.receivedTransactionsRepository.findByProviderReference(
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
      return await this.receivedTransactionsRepository.create({
        userId,

        reference: this.createReference(),

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
        const racedByClientEvent =
          await this.receivedTransactionsRepository.findByClientEventId(
            userId,
            body.clientEventId,
          );

        if (racedByClientEvent) {
          this.assertClientEventMatches(racedByClientEvent, body, occurredAt);

          return racedByClientEvent;
        }

        const racedByProviderReference =
          await this.receivedTransactionsRepository.findByProviderReference(
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

      throw error;
    }
  }

  private assertProviderSmsInput(
    body: RecordReceivedProviderSmsRequestDto,
    occurredAt: Date,
  ): void {
    if (!body.senderIdentifier && !body.senderName) {
      throw new BadRequestException(
        'Received transaction evidence must include a sender name or sender identifier.',
      );
    }

    const maximumFutureTime = Date.now() + 5 * 60 * 1000;

    if (occurredAt.getTime() > maximumFutureTime) {
      throw new BadRequestException(
        'Received transaction time cannot be in the future.',
      );
    }
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

  private normalizeSenderIdentifier(value?: string): string | null {
    if (!value) {
      return null;
    }

    const compact = value.replace(/[\s()+-]/g, '');

    if (/^07\d{8}$/.test(compact)) {
      return `+250${compact.slice(1)}`;
    }

    if (/^2507\d{8}$/.test(compact)) {
      return `+${compact}`;
    }

    if (/^7\d{8}$/.test(compact)) {
      return `+250${compact}`;
    }

    return value;
  }

  private createReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();

    const entropy = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

    return `BGR-${timestamp}-${entropy}`;
  }
}
