import { ConflictException } from '@nestjs/common';
import {
  Currency,
  FinancialMessageChannel,
  FinancialMessageDirection,
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
  IncomeCategory,
  Prisma,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';
import type { FinancialMessageImport } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessageCryptoService } from './financial-message-crypto.service';
import { FinancialMessageReviewService } from './financial-message-review.service';

describe('FinancialMessageReviewService pilot confirmation', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');
  const importId = '96cf0fae-1793-41d7-8294-b83555db641f';
  const row: FinancialMessageImport = {
    id: importId,
    userId: 'owner-id',
    credentialId: 'credential-id',
    clientEventId: 'd7684993-5ef0-476b-af00-7407ea26b613',
    sourceHint: 'MTN_MOMO',
    providerCode: 'MTN_MOMO_RW',
    channel: FinancialMessageChannel.SMS,
    direction: FinancialMessageDirection.CREDIT,
    parseStatus: FinancialMessageParseStatus.PARSED,
    status: FinancialMessageImportStatus.PENDING,
    duplicateStatus: FinancialMessageDuplicateStatus.CLEAR,
    currency: Currency.RWF,
    amount: new Prisma.Decimal(25000),
    fee: null,
    messageReceivedAt: now,
    occurredAt: now,
    senderName: 'Test Sender',
    senderIdentifier: '0788123456',
    accountLastFour: null,
    providerReference: 'PILOT12345',
    fingerprint: 'a'.repeat(64),
    parserVersion: 'rw-financial-message-v1',
    parseConfidence: new Prisma.Decimal('1'),
    rawMessageCiphertext: 'encrypted-message',
    rawMessagePurgedAt: null,
    expiresAt: new Date('2026-11-29T12:00:00.000Z'),
    confirmedReceivedTransactionId: null,
    confirmedIncomeId: null,
    confirmedAt: null,
    dismissedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const financialMessageImport = {
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const receivedTransaction = { create: jest.fn() };
  const income = { create: jest.fn() };
  const transaction = jest.fn();
  const prisma = {
    financialMessageImport,
    receivedTransaction,
    income,
    $transaction: transaction,
  } as unknown as PrismaService;
  const crypto = new FinancialMessageCryptoService({
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  });
  const service = new FinancialMessageReviewService(prisma, crypto);

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    transaction.mockImplementation(
      (work: (tx: typeof prisma) => Promise<unknown>) => work(prisma),
    );
    financialMessageImport.updateMany.mockResolvedValue({ count: 0 });
    financialMessageImport.findFirst.mockResolvedValue({
      ...row,
      confirmedReceivedTransaction: null,
      confirmedIncome: null,
    });
    receivedTransaction.create.mockResolvedValue({
      id: 'received-id',
      classification: ReceivedTransactionClassification.INCOME,
      note: 'October salary',
    });
    income.create.mockResolvedValue({ id: 'income-id' });
    financialMessageImport.update.mockResolvedValue({
      ...row,
      status: FinancialMessageImportStatus.CONFIRMED,
      rawMessageCiphertext: null,
      confirmedReceivedTransactionId: 'received-id',
      confirmedIncomeId: 'income-id',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records a reviewed payment and income before purging raw evidence', async () => {
    const result = await service.confirm('owner-id', importId, {
      classification: ReceivedTransactionClassification.INCOME,
      createIncome: true,
      incomeCategory: IncomeCategory.SALARY,
      incomeLabel: 'October salary',
      note: 'October salary',
    });

    const [receivedArguments] = receivedTransaction.create.mock
      .calls[0] as unknown as [{ data: Record<string, unknown> }];
    const [importArguments] = financialMessageImport.update.mock
      .calls[0] as unknown as [{ data: Record<string, unknown> }];

    expect(receivedArguments.data.status).toBe(
      ReceivedTransactionStatus.COMPLETED,
    );
    expect(receivedArguments.data.evidenceSource).toBe(
      ReceivedTransactionEvidenceSource.PROVIDER_SMS,
    );
    expect(importArguments.data.rawMessageCiphertext).toBeNull();
    expect(importArguments.data.rawMessagePurgedAt).toEqual(now);
    expect(result.receivedTransactionId).toBe('received-id');
    expect(result.incomeId).toBe('income-id');
  });

  it('blocks a confirmed duplicate before creating financial records', async () => {
    financialMessageImport.findFirst.mockResolvedValue({
      ...row,
      duplicateStatus: FinancialMessageDuplicateStatus.CONFIRMED_DUPLICATE,
      confirmedReceivedTransaction: null,
      confirmedIncome: null,
    });

    await expect(
      service.confirm('owner-id', importId, {
        classification: ReceivedTransactionClassification.OTHER,
        createIncome: false,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(receivedTransaction.create).not.toHaveBeenCalled();
    expect(income.create).not.toHaveBeenCalled();
  });
});
