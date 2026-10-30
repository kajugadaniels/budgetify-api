import {
  FinancialMessageDirection,
  FinancialMessageParseStatus,
} from '@prisma/client';

import { FinancialMessageParserService } from './financial-message-parser.service';

describe('FinancialMessageParserService', () => {
  const parser = new FinancialMessageParserService();
  const receivedAt = new Date('2026-10-30T12:00:00.000Z');

  it('parses conservative MTN MoMo incoming-payment evidence', () => {
    const result = parser.parse({
      messageSender: 'M-Money',
      message:
        'You have received RWF 25,000 from Jean Claude (0788123456). Transaction ID: ABC12345. MTN MoMo',
      messageReceivedAt: receivedAt,
    });

    expect(result.providerCode).toBe('MTN_MOMO_RW');
    expect(result.direction).toBe(FinancialMessageDirection.CREDIT);
    expect(result.parseStatus).toBe(FinancialMessageParseStatus.PARSED);
    expect(result.amount).toBe(25000);
    expect(result.senderName).toBe('Jean Claude');
    expect(result.senderIdentifier).toBe('0788123456');
    expect(result.providerReference).toBe('ABC12345');
  });

  it('parses bank credit evidence and retains only the last four account digits', () => {
    const result = parser.parse({
      messageSender: 'BK Bank',
      message:
        'BK Bank: Your account ending 1234 has been credited with RWF 50,000. Ref: BK123456.',
      messageReceivedAt: receivedAt,
    });

    expect(result.providerCode).toBe('BANK_OF_KIGALI_RW');
    expect(result.direction).toBe(FinancialMessageDirection.CREDIT);
    expect(result.amount).toBe(50000);
    expect(result.accountLastFour).toBe('1234');
  });

  it('rejects debit alerts from the incoming-payment parser', () => {
    const result = parser.parse({
      messageSender: 'Access Bank',
      message:
        'Access Bank debit alert: Your account was debited RWF 12,000. Ref: AC1234.',
      messageReceivedAt: receivedAt,
    });

    expect(result.direction).toBe(FinancialMessageDirection.DEBIT);
    expect(result.parseStatus).toBe(FinancialMessageParseStatus.REJECTED);
  });

  it('requires review when provider evidence is missing', () => {
    const result = parser.parse({
      message: 'You received RWF 4,000. Ref: OTHER123.',
      messageReceivedAt: receivedAt,
    });

    expect(result.providerCode).toBeNull();
    expect(result.parseStatus).toBe(FinancialMessageParseStatus.NEEDS_DETAILS);
  });
});
