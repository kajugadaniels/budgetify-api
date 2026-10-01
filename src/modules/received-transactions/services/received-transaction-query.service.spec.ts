import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';

import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionQueryService } from './received-transaction-query.service';

describe('ReceivedTransactionQueryService', () => {
  let repository: jest.Mocked<ReceivedTransactionReadRepository>;

  let service: ReceivedTransactionQueryService;

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
    repository = {
      findOwnedById: jest.fn(),

      listOwned: jest.fn(),
    } as unknown as jest.Mocked<ReceivedTransactionReadRepository>;

    service = new ReceivedTransactionQueryService(repository);
  });

  it('lists owned received transactions', async () => {
    repository.listOwned.mockResolvedValue({
      items: [transaction],

      total: 1,
    });

    const result = await service.list(transaction.userId, {
      page: 1,

      limit: 20,
    });

    expect(result.items).toEqual([transaction]);

    expect(result.pagination).toEqual({
      page: 1,

      limit: 20,

      total: 1,

      totalPages: 1,

      hasNextPage: false,

      hasPreviousPage: false,
    });
  });

  it('rejects an invalid list date range', async () => {
    await expect(
      service.list(transaction.userId, {
        page: 1,

        limit: 20,

        from: '2026-09-30T23:59:59.999Z',

        to: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.listOwned.mock.calls).toHaveLength(0);
  });

  it('returns an owned transaction detail', async () => {
    repository.findOwnedById.mockResolvedValue(transaction);

    await expect(
      service.getDetail(transaction.userId, transaction.id),
    ).resolves.toEqual(transaction);
  });

  it('returns not found for a transaction the user does not own', async () => {
    repository.findOwnedById.mockResolvedValue(null);

    await expect(
      service.getDetail(transaction.userId, transaction.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
