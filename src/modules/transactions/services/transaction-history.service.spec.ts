import { BadRequestException } from '@nestjs/common';
import {
  Currency,
  ReceivedTransaction,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
  Transaction,
  TransactionCategory,
  TransactionRecipientType,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';

import { TransactionHistoryRepository } from '../transaction-history.repository';
import { TransactionHistoryDirection } from '../transaction-history.types';
import { TransactionHistoryService } from './transaction-history.service';

describe('TransactionHistoryService', () => {
  let repository: jest.Mocked<TransactionHistoryRepository>;

  let service: TransactionHistoryService;

  const sent: Transaction = {
    id: 'sent-1',

    userId: 'user-1',

    reference: 'BGT-SENT-1',

    idempotencyKey: null,

    transferType: TransactionTransferType.MOMO_TO_MOMO,

    status: TransactionStatus.COMPLETED,

    category: TransactionCategory.FAMILY,

    currency: Currency.RWF,

    amount: 10_000,

    feeAmount: 20,

    totalAmount: 10_020,

    recipientType: TransactionRecipientType.PHONE,

    receiverIdentifier: '+250788123456',

    receiverName: 'Alice',

    note: null,

    tariffVersion: 'test',

    tariffSource: 'test',

    providerReference: 'SENT-REF-1',

    failureCode: null,

    failureReason: null,

    processedAt: new Date('2026-09-30T19:59:00.000Z'),

    completedAt: new Date('2026-09-30T20:00:10.000Z'),

    failedAt: null,

    cancelledAt: null,

    reversedAt: null,

    createdAt: new Date('2026-09-30T20:00:00.000Z'),

    updatedAt: new Date('2026-09-30T20:00:10.000Z'),
  };

  const received: ReceivedTransaction = {
    id: 'received-1',

    userId: 'user-1',

    reference: 'BGR-RECEIVED-1',

    clientEventId: 'received-sms-event-1',

    status: ReceivedTransactionStatus.COMPLETED,

    classification: ReceivedTransactionClassification.UNCLASSIFIED,

    evidenceSource: ReceivedTransactionEvidenceSource.PROVIDER_SMS,

    currency: Currency.RWF,

    amount: 25_000,

    senderIdentifier: '+250791123456',

    senderName: 'Jean Claude',

    providerReference: 'RECEIVED-REF-1',

    occurredAt: new Date('2026-09-30T20:05:00.000Z'),

    reversedAt: null,

    note: null,

    createdAt: new Date('2026-09-30T20:06:00.000Z'),

    updatedAt: new Date('2026-09-30T20:06:00.000Z'),
  };

  beforeEach(() => {
    repository = {
      getCandidates: jest.fn(),
    } as unknown as jest.Mocked<TransactionHistoryRepository>;

    service = new TransactionHistoryService(repository);
  });

  it('merges sent and received transactions by activity time', async () => {
    repository.getCandidates.mockResolvedValue({
      sent: [sent],

      received: [received],

      total: 2,
    });

    const result = await service.list('user-1', {
      page: 1,

      limit: 20,
    });

    expect(result.items.map((item) => item.direction)).toEqual([
      TransactionHistoryDirection.RECEIVED,
      TransactionHistoryDirection.SENT,
    ]);

    expect(result.items[0].amount).toBe(25_000);

    expect(result.items[0].counterpartyName).toBe('Jean Claude');

    expect(result.items[1].counterpartyName).toBe('Alice');

    expect(result.pagination.total).toBe(2);
  });

  it('paginates after combining both directions', async () => {
    const laterSent: Transaction = {
      ...sent,

      id: 'sent-2',

      reference: 'BGT-SENT-2',

      createdAt: new Date('2026-09-30T20:10:00.000Z'),
    };

    repository.getCandidates.mockResolvedValue({
      sent: [laterSent, sent],

      received: [received],

      total: 3,
    });

    const result = await service.list('user-1', {
      page: 2,

      limit: 2,
    });

    expect(result.items).toHaveLength(1);

    expect(result.pagination.page).toBe(2);

    expect(result.pagination.hasNextPage).toBe(false);

    expect(result.pagination.hasPreviousPage).toBe(true);
  });

  it('rejects transfer type filtering for received-only history', async () => {
    await expect(
      service.list('user-1', {
        page: 1,

        limit: 20,

        direction: TransactionHistoryDirection.RECEIVED,

        transferType: TransactionTransferType.MOMO_TO_MOMO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.getCandidates.mock.calls).toHaveLength(0);
  });
});
