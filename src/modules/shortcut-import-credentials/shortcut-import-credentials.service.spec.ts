import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ShortcutImportCredential } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { ShortcutImportCredentialStatus } from './shortcut-import-credential.dto';
import { ShortcutImportCredentialTokenService } from './shortcut-import-credential-token.service';
import { ShortcutImportCredentialsService } from './shortcut-import-credentials.service';

describe('ShortcutImportCredentialsService', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');
  const row: ShortcutImportCredential = {
    id: '8d769f92-a7b4-4902-90b0-84165bc16411',
    userId: 'owner',
    deviceName: "Daniels' iPhone",
    tokenPrefix: 'bfi_35c8e0a90d692fd1',
    tokenHash: 'a'.repeat(64),
    lastUsedAt: null,
    expiresAt: new Date('2027-10-30T12:00:00.000Z'),
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const shortcutImportCredential = {
    count: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const transaction = jest.fn();
  const prisma = {
    shortcutImportCredential,
    $transaction: transaction,
  } as unknown as PrismaService;
  const tokens = {
    generate: jest.fn(),
  } as unknown as ShortcutImportCredentialTokenService;
  const service = new ShortcutImportCredentialsService(prisma, tokens, {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 1).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    transaction.mockImplementation(
      (work: (tx: typeof prisma) => Promise<unknown>) => work(prisma),
    );
    shortcutImportCredential.count.mockResolvedValue(0);
    shortcutImportCredential.create.mockResolvedValue(row);
    shortcutImportCredential.findFirst.mockResolvedValue({
      id: row.id,
      revokedAt: null,
    });
    shortcutImportCredential.update.mockResolvedValue({
      ...row,
      revokedAt: now,
    });
    (tokens.generate as jest.Mock).mockReturnValue({
      token: `${row.tokenPrefix}_one-time-secret`,
      tokenPrefix: row.tokenPrefix,
      tokenHash: row.tokenHash,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the raw token once while persisting only its hash', async () => {
    const result = await service.create('owner', {
      deviceName: row.deviceName,
    });

    expect(result.token).toBe(`${row.tokenPrefix}_one-time-secret`);
    const [createArguments] = shortcutImportCredential.create.mock
      .calls[0] as unknown as [
      {
        data: Record<string, unknown>;
      },
    ];
    expect(createArguments.data.userId).toBe('owner');
    expect(createArguments.data.tokenPrefix).toBe(row.tokenPrefix);
    expect(createArguments.data.tokenHash).toBe(row.tokenHash);
    expect(createArguments.data).not.toHaveProperty('token');
  });

  it('rejects another iPhone when the active-device limit is reached', async () => {
    shortcutImportCredential.count.mockResolvedValue(3);

    await expect(
      service.create('owner', { deviceName: 'Another iPhone' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(shortcutImportCredential.create).not.toHaveBeenCalled();
  });

  it('lists only credential metadata and derives lifecycle status', async () => {
    shortcutImportCredential.findMany.mockResolvedValue([
      row,
      { ...row, id: 'expired', expiresAt: new Date('2026-10-29') },
      { ...row, id: 'revoked', revokedAt: now },
    ]);

    const result = await service.list('owner');

    const [findManyArguments] = shortcutImportCredential.findMany.mock
      .calls[0] as unknown as [{ where: { userId: string } }];
    expect(findManyArguments.where.userId).toBe('owner');
    expect(result.map((item) => item.status)).toEqual([
      ShortcutImportCredentialStatus.ACTIVE,
      ShortcutImportCredentialStatus.EXPIRED,
      ShortcutImportCredentialStatus.REVOKED,
    ]);
    expect(result[0]).not.toHaveProperty('tokenHash');
    expect(result[0]).not.toHaveProperty('token');
  });

  it('revokes only an owned credential and remains idempotent', async () => {
    await service.revoke('owner', row.id);
    expect(shortcutImportCredential.findFirst).toHaveBeenCalledWith({
      where: { id: row.id, userId: 'owner' },
      select: { id: true, revokedAt: true },
    });
    expect(shortcutImportCredential.update).toHaveBeenCalledTimes(1);

    shortcutImportCredential.findFirst.mockResolvedValue({
      id: row.id,
      revokedAt: now,
    });
    await service.revoke('owner', row.id);
    expect(shortcutImportCredential.update).toHaveBeenCalledTimes(1);
  });

  it('does not disclose whether another user owns a credential', async () => {
    shortcutImportCredential.findFirst.mockResolvedValue(null);

    await expect(service.revoke('other-user', row.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(shortcutImportCredential.update).not.toHaveBeenCalled();
  });
});
