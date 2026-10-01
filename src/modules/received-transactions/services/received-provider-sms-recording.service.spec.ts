import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';
import { ReceivedProviderSmsRecordingService } from './received-provider-sms-recording.service';

describe('ReceivedProviderSmsRecordingService', () => {
  let readRepository: jest.Mocked<ReceivedTransactionReadRepository>;

  let writeRepository: jest.Mocked<ReceivedTransactionWriteRepository>;

  let service: ReceivedProviderSmsRecordingService;

  const transaction: ReceivedTransaction = {
    id: '26fb4ee5-c445-41e0-a023-7024479bbabc',

    userId: '4f94001f-a312-46b8-851e-0ac57e032025',

    reference: 'BGR-MJYD6U04-4BC719DA461E',

    clientEventId: 'received-sms-1759263000000-b19cd563fe834202',

    status: ReceivedTransactionStatus.COMPLETED,

    classification: ReceivedTransactionClassification.UNCLASSIFIED,

    evidenceSource: ReceivedTransactionEvidenceSource.PROVIDER_SMS,

    currency: Currency.RWF,

    amount: 25_000,

    senderIdentifier: '+250788123456',

    senderName: 'Jean Claude',

    providerReference: '18473920531',

    occurredAt: new Date('2026-09-30T19:35:20.000Z'),

    reversedAt: null,

    note: null,

    createdAt: new Date('2026-09-30T19:35:30.000Z'),

    updatedAt: new Date('2026-09-30T19:35:30.000Z'),
  };

  beforeEach(() => {
    readRepository = {
      findByClientEventId: jest.fn(),

      findByProviderReference: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionReadRepository>;

    writeRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionWriteRepository>;

    service = new ReceivedProviderSmsRecordingService(
      readRepository,
      writeRepository,
    );
  });

  it('records structured SMS evidence as an unclassified completed transaction', async () => {
    readRepository.findByClientEventId.mockResolvedValue(null);

    readRepository.findByProviderReference.mockResolvedValue(null);

    writeRepository.create.mockResolvedValue(transaction);

    const result = await service.record(transaction.userId, {
      clientEventId: transaction.clientEventId,

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderIdentifier: '0788123456',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(transaction);

    const createInput = writeRepository.create.mock.calls[0][0];

    expect(createInput.status).toBe(ReceivedTransactionStatus.COMPLETED);

    expect(createInput.classification).toBe(
      ReceivedTransactionClassification.UNCLASSIFIED,
    );

    expect(createInput.evidenceSource).toBe(
      ReceivedTransactionEvidenceSource.PROVIDER_SMS,
    );

    expect(createInput.senderIdentifier).toBe('+250788123456');
  });

  it('returns an existing matching client event', async () => {
    readRepository.findByClientEventId.mockResolvedValue(transaction);

    const result = await service.record(transaction.userId, {
      clientEventId: transaction.clientEventId,

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(transaction);

    expect(writeRepository.create.mock.calls).toHaveLength(0);
  });

  it('deduplicates the same provider reference', async () => {
    readRepository.findByClientEventId.mockResolvedValue(null);

    readRepository.findByProviderReference.mockResolvedValue(transaction);

    const result = await service.record(transaction.userId, {
      clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(transaction);
  });

  it('rejects conflicting evidence using the same provider reference', async () => {
    readRepository.findByClientEventId.mockResolvedValue(null);

    readRepository.findByProviderReference.mockResolvedValue(transaction);

    await expect(
      service.record(transaction.userId, {
        clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

        amount: 30_000,

        providerReference: '18473920531',

        occurredAt: '2026-09-30T19:35:20.000Z',

        senderName: 'Jean Claude',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires sender information', async () => {
    await expect(
      service.record(transaction.userId, {
        clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

        amount: 25_000,

        providerReference: '18473920531',

        occurredAt: '2026-09-30T19:35:20.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(writeRepository.create.mock.calls).toHaveLength(0);
  });
});
