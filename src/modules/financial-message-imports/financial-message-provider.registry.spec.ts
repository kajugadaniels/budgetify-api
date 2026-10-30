import {
  FinancialMessageDirection,
  FinancialMessageParseStatus,
} from '@prisma/client';

import { FinancialMessageParserService } from './financial-message-parser.service';

interface ProviderPilotFixture {
  readonly provider: string;
  readonly sender: string;
  readonly message: string;
  readonly amount: number;
}

const receivedAt = new Date('2026-10-30T12:00:00.000Z');
const providerPilotFixtures: readonly ProviderPilotFixture[] = [
  {
    provider: 'MTN_MOMO_RW',
    sender: 'M-Money',
    message:
      'You have received RWF 25,000 from Test Sender (0788123456). Transaction ID: MOMO12345.',
    amount: 25000,
  },
  {
    provider: 'AIRTEL_MONEY_RW',
    sender: 'AirtelMoney',
    message:
      'Airtel Money: You received 12,500 RWF from Test Sender. Ref: AIR12345.',
    amount: 12500,
  },
  {
    provider: 'BANK_OF_KIGALI_RW',
    sender: 'BKIR',
    message:
      'Your account ending 4321 has been credited with RWF 80,000. Ref: BK12345.',
    amount: 80000,
  },
  {
    provider: 'ACCESS_BANK_RW',
    sender: 'AccessBank',
    message:
      'Credit alert: RWF 45,000 was deposited into account ending 7788. Ref: ACCESS123.',
    amount: 45000,
  },
  {
    provider: 'EQUITY_BANK_RW',
    sender: 'EquityBank',
    message:
      'Your account ending 2468 was credited RWF 31,000. Transaction ID: EQUITY123.',
    amount: 31000,
  },
  {
    provider: 'I_AND_M_BANK_RW',
    sender: 'IMBANK',
    message:
      'Incoming payment of 64,000 RWF credited to account ending 9753. Ref: IM12345.',
    amount: 64000,
  },
  {
    provider: 'BPR_BANK_RW',
    sender: 'BPR',
    message:
      'BPR Bank credit alert: RWF 18,000 deposited to account ending 1122. Ref: BPR12345.',
    amount: 18000,
  },
  {
    provider: 'COGEBANQUE_RW',
    sender: 'COGEBANQUE',
    message:
      'Your account ending 3344 has been credited with 22,000 RWF. Ref: COG12345.',
    amount: 22000,
  },
  {
    provider: 'ECOBANK_RW',
    sender: 'ECOBANK',
    message:
      'Credit alert: RWF 29,000 deposited to account ending 5566. Ref: ECO12345.',
    amount: 29000,
  },
  {
    provider: 'GTBANK_RW',
    sender: 'GT Bank',
    message: 'Your account ending 6677 was credited 37,000 RWF. Ref: GTB12345.',
    amount: 37000,
  },
  {
    provider: 'NCBA_RW',
    sender: 'NCBA Bank',
    message:
      'Incoming payment: RWF 52,000 credited to account ending 8899. Ref: NCBA1234.',
    amount: 52000,
  },
  {
    provider: 'BANK_OF_AFRICA_RW',
    sender: 'BOA Rwanda',
    message:
      'Bank of Africa credit alert: 41,000 RWF deposited to account ending 9900. Ref: BOA12345.',
    amount: 41000,
  },
];

describe('Rwanda financial message provider pilot fixtures', () => {
  const parser = new FinancialMessageParserService();

  it.each(providerPilotFixtures)(
    'parses a conservative $provider received-payment fixture',
    ({ provider, sender, message, amount }) => {
      const result = parser.parse({
        messageSender: sender,
        message,
        messageReceivedAt: receivedAt,
      });

      expect(result.providerCode).toBe(provider);
      expect(result.direction).toBe(FinancialMessageDirection.CREDIT);
      expect(result.parseStatus).toBe(FinancialMessageParseStatus.PARSED);
      expect(result.amount).toBe(amount);
    },
  );

  it('keeps an unrecognized sender in review instead of guessing a bank', () => {
    const result = parser.parse({
      messageSender: 'UNKNOWN-SENDER',
      message: 'Your account received RWF 10,000. Ref: SAFE1234.',
      messageReceivedAt: receivedAt,
    });

    expect(result.providerCode).toBeNull();
    expect(result.parseStatus).toBe(FinancialMessageParseStatus.NEEDS_DETAILS);
  });
});
