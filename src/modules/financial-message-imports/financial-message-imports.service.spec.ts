import {
  Currency,
  FinancialMessageChannel,
  FinancialMessageDirection,
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
  Prisma,
} from '@prisma/client';
import type { FinancialMessageImport } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessageCryptoService } from './financial-message-crypto.service';
import { FinancialMessageImportsService } from './financial-message-imports.service';
import { FinancialMessageParserService } from './financial-message-parser.service';
import { FinancialMessageSourceHint } from './financial-message-source.enum';

describe('FinancialMessageImportsService', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');
  const body = {
    clientEventId: 'd7684993-5ef0-476b-af00-7407ea26b613',
    sourceHint: FinancialMessageSourceHint.MTN_MOMO,
    messageSender: 'M-Money',
    message:
      'You have received RWF 25,000 from Jean Claude (0788123456). Transaction ID: ABC12345. MTN MoMo',
    messageReceivedAt: now.toISOString(),
  };
  const row: FinancialMessageImport = {
    id: '96cf0fae-1793-41d7-8294-b83555db641f',
    userId: 'owner-id',
    credentialId: 'credential-id',
    clientEventId: body.clientEventId,
    sourceHint: body.sourceHint,
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
    senderName: 'Jean Claude',
    senderIdentifier: '0788123456',
    accountLastFour: null,
    providerReference: 'ABC12345',
    fingerprint: 'a'.repeat(64),
    parserVersion: 'rw-financial-message-v1',
    parseConfidence: new Prisma.Decimal('1.0'),
    rawMessageCiphertext: 'encrypted',
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
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    financialMessageImport,
    $transaction: transaction,
  } as unknown as PrismaService;
  const config = {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  };
  const service = new FinancialMessageImportsService(
    prisma,
    new FinancialMessageParserService(),
    new FinancialMessageCryptoService(config),
    config,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    transaction.mockImplementation(
      (work: (tx: typeof prisma) => Promise<unknown>) => work(prisma),
    );
    financialMessageImport.findUnique.mockResolvedValue(null);
    financialMessageImport.findFirst.mockResolvedValue(null);
    financialMessageImport.create.mockResolvedValue(row);
    financialMessageImport.update.mockResolvedValue(row);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates only a pending import and encrypts raw message text', async () => {
    const result = await service.ingest(
      { id: 'credential-id', userId: 'owner-id' },
      body,
    );
    const [createArguments] = financialMessageImport.create.mock
      .calls[0] as unknown as [{ data: Record<string, unknown> }];

    expect(result.status).toBe(FinancialMessageImportStatus.PENDING);
    expect(createArguments.data.channel).toBe(FinancialMessageChannel.SMS);
    expect(createArguments.data).not.toHaveProperty('rawMessage');
    expect(createArguments.data.rawMessageCiphertext).not.toBe(body.message);
    expect(createArguments.data).not.toHaveProperty(
      'confirmedReceivedTransactionId',
    );
    expect(createArguments.data).not.toHaveProperty('confirmedIncomeId');
  });

  it('returns an identical client-event retry without another insert', async () => {
    const crypto = new FinancialMessageCryptoService(config);
    financialMessageImport.findUnique.mockResolvedValue({
      ...row,
      fingerprint: crypto.fingerprint(body.message),
    });

    const result = await service.ingest(
      { id: 'credential-id', userId: 'owner-id' },
      body,
    );

    expect(result.isReplay).toBe(true);
    expect(financialMessageImport.create).not.toHaveBeenCalled();
  });

  it('flags repeated unreferenced content for review', async () => {
    financialMessageImport.findFirst.mockResolvedValueOnce({
      id: 'possible-duplicate',
    });

    await service.ingest(
      { id: 'credential-id', userId: 'owner-id' },
      {
        ...body,
        message: 'MTN MoMo: You received RWF 5,000.',
      },
    );
    const [createArguments] = financialMessageImport.create.mock
      .calls[0] as unknown as [{ data: Record<string, unknown> }];

    expect(createArguments.data.duplicateStatus).toBe(
      FinancialMessageDuplicateStatus.POSSIBLE_DUPLICATE,
    );
  });
});
