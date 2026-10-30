import {
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessagePilotHealth } from './financial-message-pilot.dto';
import { FinancialMessagePilotService } from './financial-message-pilot.service';
import { FinancialMessageRolloutService } from './financial-message-rollout.service';

describe('FinancialMessagePilotService', () => {
  const config = {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
    mode: 'pilot' as const,
    enabledProviderCodes: ['MTN_MOMO_RW'],
    alertMinimumSampleSize: 2,
    alertNeedsReviewPercent: 30,
  };
  const findMany = jest.fn();
  const prisma = {
    financialMessageImport: { findMany },
  } as unknown as PrismaService;
  const service = new FinancialMessagePilotService(
    prisma,
    new FinancialMessageRolloutService(config),
    config,
  );

  beforeEach(() => jest.resetAllMocks());

  it('returns metadata-only health metrics scoped to the owner', async () => {
    const createdAt = new Date('2026-10-31T08:00:00.000Z');
    findMany.mockResolvedValue([
      {
        providerCode: 'MTN_MOMO_RW',
        status: FinancialMessageImportStatus.CONFIRMED,
        parseStatus: FinancialMessageParseStatus.PARSED,
        duplicateStatus: FinancialMessageDuplicateStatus.CLEAR,
        createdAt,
      },
      {
        providerCode: 'MTN_MOMO_RW',
        status: FinancialMessageImportStatus.PENDING,
        parseStatus: FinancialMessageParseStatus.NEEDS_DETAILS,
        duplicateStatus: FinancialMessageDuplicateStatus.POSSIBLE_DUPLICATE,
        createdAt,
      },
    ]);

    const result = await service.summary('owner-id', 30);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'owner-id' }) }),
    );
    expect(result).toMatchObject({
      total: 2,
      pending: 1,
      confirmed: 1,
      needsReview: 1,
      possibleDuplicates: 1,
      health: FinancialMessagePilotHealth.NEEDS_ATTENTION,
    });
    expect(result.providers[0]).toMatchObject({
      label: 'MTN MoMo',
      enabled: true,
      total: 2,
    });
    expect(result).not.toHaveProperty('rawMessage');
    expect(result).not.toHaveProperty('userId');
  });
});
