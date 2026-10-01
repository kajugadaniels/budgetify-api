import { NotFoundException } from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionWriteRepository } from '../repositories/received-transaction-write.repository';
import { ReceivedTransactionClassificationService } from './received-transaction-classification.service';

describe('ReceivedTransactionClassificationService', () => {
  let readRepository: jest.Mocked<ReceivedTransactionReadRepository>;

  let writeRepository: jest.Mocked<ReceivedTransactionWriteRepository>;

  let service: ReceivedTransactionClassificationService;

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
      findOwnedById: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionReadRepository>;

    writeRepository = {
      updateOwnedClassification: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionWriteRepository>;

    service = new ReceivedTransactionClassificationService(
      readRepository,
      writeRepository,
    );
  });

  it('updates the classification of an owned transaction', async () => {
    const updated: ReceivedTransaction = {
      ...transaction,

      classification: ReceivedTransactionClassification.REIMBURSEMENT,
    };

    readRepository.findOwnedById.mockResolvedValue(transaction);

    writeRepository.updateOwnedClassification.mockResolvedValue(updated);

    const result = await service.update(transaction.userId, transaction.id, {
      classification: ReceivedTransactionClassification.REIMBURSEMENT,
    });

    expect(result.classification).toBe(
      ReceivedTransactionClassification.REIMBURSEMENT,
    );

    expect(result.amount).toBe(transaction.amount);

    expect(result.evidenceSource).toBe(transaction.evidenceSource);
  });

  it('does not write when the requested classification is already set', async () => {
    const existing: ReceivedTransaction = {
      ...transaction,

      classification: ReceivedTransactionClassification.INCOME,
    };

    readRepository.findOwnedById.mockResolvedValue(existing);

    const result = await service.update(existing.userId, existing.id, {
      classification: ReceivedTransactionClassification.INCOME,
    });

    expect(result).toEqual(existing);

    expect(writeRepository.updateOwnedClassification.mock.calls).toHaveLength(
      0,
    );
  });

  it('rejects updates for a transaction the user does not own', async () => {
    readRepository.findOwnedById.mockResolvedValue(null);

    await expect(
      service.update(transaction.userId, transaction.id, {
        classification: ReceivedTransactionClassification.OTHER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns not found if the transaction disappears during the write', async () => {
    readRepository.findOwnedById.mockResolvedValue(transaction);

    writeRepository.updateOwnedClassification.mockResolvedValue(null);

    await expect(
      service.update(transaction.userId, transaction.id, {
        classification: ReceivedTransactionClassification.OWN_TRANSFER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
