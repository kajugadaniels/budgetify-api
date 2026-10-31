import { FinancialMessageImportStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessageAlertService } from './financial-message-alert.service';
import { FinancialMessageRetentionService } from './financial-message-retention.service';

describe('FinancialMessageRetentionService', () => {
  const updateMany = jest
    .fn()
    .mockResolvedValueOnce({ count: 2 })
    .mockResolvedValueOnce({ count: 1 });
  const transaction = jest.fn((operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );
  const prisma = {
    financialMessageImport: { updateMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const service = new FinancialMessageRetentionService(
    prisma,
    { notify: jest.fn() } as unknown as FinancialMessageAlertService,
    {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
    mode: 'pilot',
    enabledProviderCodes: ['MTN_MOMO_RW'],
    alertMinimumSampleSize: 10,
    alertNeedsReviewPercent: 30,
    currentShortcutVersion: 1,
    minimumShortcutVersion: 1,
    shortcutInstallUrl: null,
    cleanupIntervalMinutes: 360,
    alertWebhookUrl: null,
    },
  );

  it('expires pending imports and purges terminal raw messages', async () => {
    const result = await service.runOnce();

    expect(result).toEqual({
      expiredImports: 2,
      purgedTerminalMessages: 1,
    });
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: FinancialMessageImportStatus.PENDING,
        }),
        data: expect.objectContaining({ rawMessageCiphertext: null }),
      }),
    );
  });
});
