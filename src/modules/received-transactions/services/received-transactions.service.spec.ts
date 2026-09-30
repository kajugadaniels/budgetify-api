import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { ReceivedTransactionsRepository } from '../received-transactions.repository';
import { ReceivedTransactionsService } from '../received-transactions.service';

describe('ReceivedTransactionsService', () => {
  let repository: jest.Mocked<ReceivedTransactionsRepository>;

  let service: ReceivedTransactionsService;

  const receivedTransaction: ReceivedTransaction = {
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
    repository = {
      findOwnedById: jest.fn(),

      findByClientEventId: jest.fn(),

      findByProviderReference: jest.fn(),

      create: jest.fn(),

      listOwned: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionsRepository>;

    service = new ReceivedTransactionsService(repository);
  });

  it('records structured provider SMS evidence as an unclassified completed transaction', async () => {
    repository.findByClientEventId.mockResolvedValue(null);

    repository.findByProviderReference.mockResolvedValue(null);

    repository.create.mockResolvedValue(receivedTransaction);

    const result = await service.recordProviderSms(receivedTransaction.userId, {
      clientEventId: receivedTransaction.clientEventId,

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderIdentifier: '0788123456',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(receivedTransaction);

    expect(repository.create.mock.calls).toHaveLength(1);

    const createInput = repository.create.mock.calls[0][0];

    expect(createInput.status).toBe(ReceivedTransactionStatus.COMPLETED);

    expect(createInput.classification).toBe(
      ReceivedTransactionClassification.UNCLASSIFIED,
    );

    expect(createInput.evidenceSource).toBe(
      ReceivedTransactionEvidenceSource.PROVIDER_SMS,
    );

    expect(createInput.senderIdentifier).toBe('+250788123456');
  });

  it('returns the existing record when the same client event is retried', async () => {
    repository.findByClientEventId.mockResolvedValue(receivedTransaction);

    const result = await service.recordProviderSms(receivedTransaction.userId, {
      clientEventId: receivedTransaction.clientEventId,

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderIdentifier: '0788123456',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(receivedTransaction);

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('deduplicates the same provider reference even when the client event ID changes', async () => {
    repository.findByClientEventId.mockResolvedValue(null);

    repository.findByProviderReference.mockResolvedValue(receivedTransaction);

    const result = await service.recordProviderSms(receivedTransaction.userId, {
      clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

      amount: 25_000,

      providerReference: '18473920531',

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderIdentifier: '0788123456',

      senderName: 'Jean Claude',
    });

    expect(result).toEqual(receivedTransaction);

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('rejects conflicting evidence using an existing provider reference', async () => {
    repository.findByClientEventId.mockResolvedValue(null);

    repository.findByProviderReference.mockResolvedValue(receivedTransaction);

    await expect(
      service.recordProviderSms(receivedTransaction.userId, {
        clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

        amount: 30_000,

        providerReference: '18473920531',

        occurredAt: '2026-09-30T19:35:20.000Z',

        senderName: 'Jean Claude',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('requires sender information', async () => {
    await expect(
      service.recordProviderSms(receivedTransaction.userId, {
        clientEventId: 'received-sms-1759263011111-aa21cd563fe834202',

        amount: 25_000,

        providerReference: '18473920531',

        occurredAt: '2026-09-30T19:35:20.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('rejects an invalid list date range', async () => {
    await expect(
      service.list(receivedTransaction.userId, {
        page: 1,

        limit: 20,

        from: '2026-09-30T23:59:59.999Z',

        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.listOwned.mock.calls).toHaveLength(0);
  });

  it('returns not found when a received transaction is not owned by the user', async () => {
    repository.findOwnedById.mockResolvedValue(null);

    await expect(
      service.getDetail(receivedTransaction.userId, receivedTransaction.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  const manualReceivedTransaction: ReceivedTransaction = {
    ...receivedTransaction,

    clientEventId: 'manual-received-1759263000000-b19cd563fe834202',

    evidenceSource: ReceivedTransactionEvidenceSource.MANUAL,

    providerReference: null,
  };

  it('records a manually reported received payment', async () => {
    repository.findByClientEventId.mockResolvedValue(null);

    repository.create.mockResolvedValue(manualReceivedTransaction);

    const result = await service.recordManual(
      manualReceivedTransaction.userId,
      {
        clientEventId: manualReceivedTransaction.clientEventId,

        amount: 25_000,

        occurredAt: '2026-09-30T19:35:20.000Z',

        senderIdentifier: '0788123456',

        senderName: 'Jean Claude',
      },
    );

    expect(result).toEqual(manualReceivedTransaction);

    const createInput = repository.create.mock.calls[0][0];

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

  it('reuses the same manually recorded client event', async () => {
    repository.findByClientEventId.mockResolvedValue(manualReceivedTransaction);

    const result = await service.recordManual(
      manualReceivedTransaction.userId,
      {
        clientEventId: manualReceivedTransaction.clientEventId,

        amount: 25_000,

        occurredAt: '2026-09-30T19:35:20.000Z',

        senderIdentifier: '0788123456',

        senderName: 'Jean Claude',
      },
    );

    expect(result).toEqual(manualReceivedTransaction);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('requires sender information for a manual received payment', async () => {
    await expect(
      service.recordManual(receivedTransaction.userId, {
        clientEventId: 'manual-received-1759263000000-aa21cd563fe834202',

        amount: 25_000,

        occurredAt: '2026-09-30T19:35:20.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('deduplicates manual entry by an optional provider reference', async () => {
    repository.findByClientEventId.mockResolvedValue(null);

    repository.findByProviderReference.mockResolvedValue(receivedTransaction);

    const result = await service.recordManual(receivedTransaction.userId, {
      clientEventId: 'manual-received-1759263000000-cc21cd563fe834202',

      amount: 25_000,

      occurredAt: '2026-09-30T19:35:20.000Z',

      senderName: 'Jean Claude',

      providerReference: '18473920531',
    });

    expect(result).toEqual(receivedTransaction);

    expect(repository.create).not.toHaveBeenCalled();
  });
});
