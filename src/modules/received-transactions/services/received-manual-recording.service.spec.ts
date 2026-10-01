import { BadRequestException } from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';
import { ReceivedManualRecordingService } from './received-manual-recording.service';

describe('ReceivedManualRecordingService', () => {
  let readRepository: jest.Mocked<ReceivedTransactionReadRepository>;

  let writeRepository: jest.Mocked<ReceivedTransactionWriteRepository>;

  let service: ReceivedManualRecordingService;

  const transaction: ReceivedTransaction = {
    id: '26fb4ee5-c445-41e0-a023-7024479bbabc',

    userId: '4f94001f-a312-46b8-851e-0ac57e032025',

    reference: 'BGR-MJYD6U04-4BC719DA461E',

    clientEventId: 'manual-received-1759263000000-b19cd563fe834202',

    status: ReceivedTransactionStatus.COMPLETED,

    classification: ReceivedTransactionClassification.UNCLASSIFIED,

    evidenceSource: ReceivedTransactionEvidenceSource.MANUAL,

    currency: Currency.RWF,

    amount: 25_000,

    senderIdentifier: '+250788123456',

    senderName: 'Jean Claude',

    providerReference: null,

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

    service = new ReceivedManualRecordingService(
      readRepository,
      writeRepository,
    );
  });

  it('records a manually reported received payment', async () => {
    readRepository.findByClientEventId.mockResolvedValue(null);

    writeRepository.create.mockResolvedValue(transaction);

    const result = await service.record(transaction.userId, {
      clientEventId: transaction.clientEventId,

      amount: 25_000,

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
      ReceivedTransactionEvidenceSource.MANUAL,
    );

    expect(createInput.providerReference).toBeNull();

    expect(createInput.senderIdentifier).toBe('+250788123456');
  });

  it('returns an existing matching client event', async () => {
    readRepository.findByClientEventId.mockResolvedValue(transaction);

    const result = await service.record(transaction.userId, {
      clientEventId: transaction.clientEventId,

      amount: 25_000,

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(transaction);

    expect(writeRepository.create.mock.calls).toHaveLength(0);
  });

  it('requires sender information', async () => {
    await expect(
      service.record(transaction.userId, {
        clientEventId: 'manual-received-1759263000000-aa21cd563fe834202',

        amount: 25_000,

        occurredAt: '2026-09-30T19:35:20.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deduplicates an optional provider reference', async () => {
    const referenced: ReceivedTransaction = {
      ...transaction,

      providerReference: '18473920531',
    };

    readRepository.findByClientEventId.mockResolvedValue(null);

    readRepository.findByProviderReference.mockResolvedValue(referenced);

    const result = await service.record(referenced.userId, {
      clientEventId: 'manual-received-1759263000000-cc21cd563fe834202',

      amount: 25_000,

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderName: 'Jean Claude',

      providerReference: '18473920531',
    });

    expect(result).toEqual(referenced);

    expect(writeRepository.create.mock.calls).toHaveLength(0);
  });
});
