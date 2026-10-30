import { ServiceUnavailableException } from '@nestjs/common';
import {
  Currency,
  FinancialMessageDirection,
  FinancialMessageParseStatus,
} from '@prisma/client';

import type { FinancialMessageParserResult } from './financial-message-parser.types';
import { FinancialMessageRolloutService } from './financial-message-rollout.service';

const parsed: FinancialMessageParserResult = {
  providerCode: 'MTN_MOMO_RW',
  direction: FinancialMessageDirection.CREDIT,
  parseStatus: FinancialMessageParseStatus.PARSED,
  currency: Currency.RWF,
  amount: 5000,
  fee: null,
  occurredAt: new Date('2026-10-31T08:00:00.000Z'),
  senderName: null,
  senderIdentifier: null,
  accountLastFour: null,
  providerReference: 'SAFE1234',
  parserVersion: 'test',
  parseConfidence: 1,
};

function config(mode: 'disabled' | 'pilot' | 'enabled', providers: string[]) {
  return {
    tokenPepper: 'test-pepper-that-is-longer-than-thirty-two-characters',
    messageEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
    mode,
    enabledProviderCodes: providers,
    alertMinimumSampleSize: 10,
    alertNeedsReviewPercent: 30,
  };
}

describe('FinancialMessageRolloutService', () => {
  it('rejects new Shortcut imports while the feature is disabled', () => {
    const service = new FinancialMessageRolloutService(config('disabled', []));

    expect(() => service.assertIngestionEnabled()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('keeps a provider outside the allowlist for manual review', () => {
    const service = new FinancialMessageRolloutService(config('pilot', []));

    expect(service.applyProviderRollout(parsed)).toMatchObject({
      providerCode: 'MTN_MOMO_RW',
      parseStatus: FinancialMessageParseStatus.NEEDS_DETAILS,
      parseConfidence: 0,
    });
  });

  it('preserves parsed data for an enabled provider', () => {
    const service = new FinancialMessageRolloutService(
      config('pilot', ['MTN_MOMO_RW']),
    );

    expect(service.applyProviderRollout(parsed)).toBe(parsed);
  });
});
