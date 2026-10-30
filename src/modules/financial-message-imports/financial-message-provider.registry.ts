export interface FinancialMessageProviderDefinition {
  readonly code: string;
  readonly displayName: string;
  readonly senderAliases: readonly string[];
  readonly messageEvidence: RegExp;
}

export const RWANDA_FINANCIAL_MESSAGE_PROVIDERS: readonly FinancialMessageProviderDefinition[] =
  [
    {
      code: 'MTN_MOMO_RW',
      displayName: 'MTN MoMo',
      senderAliases: ['M-Money', 'MTN', 'MoMo', 'MTN MoMo'],
      messageEvidence: /\b(?:mtn|momo|mobile money|m-money)\b/i,
    },
    {
      code: 'AIRTEL_MONEY_RW',
      displayName: 'Airtel Money',
      senderAliases: ['Airtel', 'Airtel Money', 'AirtelMoney'],
      messageEvidence: /\b(?:airtel|airtel money)\b/i,
    },
    {
      code: 'BANK_OF_KIGALI_RW',
      displayName: 'Bank of Kigali',
      senderAliases: ['BK', 'BK Bank', 'BKIR', 'Bank of Kigali'],
      messageEvidence: /\b(?:bank of kigali|bk bank|bkir)\b/i,
    },
    {
      code: 'ACCESS_BANK_RW',
      displayName: 'Access Bank',
      senderAliases: ['Access', 'Access Bank', 'AccessBank'],
      messageEvidence: /\baccess\s*bank\b/i,
    },
    {
      code: 'EQUITY_BANK_RW',
      displayName: 'Equity Bank',
      senderAliases: ['Equity', 'Equity Bank', 'EquityBank'],
      messageEvidence: /\bequity\s*bank\b/i,
    },
    {
      code: 'I_AND_M_BANK_RW',
      displayName: 'I&M Bank',
      senderAliases: ['I&M', 'I&M Bank', 'IM Bank', 'IMBANK'],
      messageEvidence: /\b(?:i\s*&\s*m|im\s*bank)\b/i,
    },
    {
      code: 'BPR_BANK_RW',
      displayName: 'BPR Bank',
      senderAliases: ['BPR', 'BPR Bank', 'BPR Atlas Mara'],
      messageEvidence: /\b(?:bpr bank|bpr atlas mara)\b/i,
    },
    {
      code: 'COGEBANQUE_RW',
      displayName: 'Cogebanque',
      senderAliases: ['Cogebanque'],
      messageEvidence: /\bcogebanque\b/i,
    },
    {
      code: 'ECOBANK_RW',
      displayName: 'Ecobank',
      senderAliases: ['Ecobank'],
      messageEvidence: /\becobank\b/i,
    },
    {
      code: 'GTBANK_RW',
      displayName: 'GTBank',
      senderAliases: ['GTBank', 'GT Bank', 'Guaranty Trust Bank'],
      messageEvidence: /\b(?:gt\s*bank|guaranty trust bank)\b/i,
    },
    {
      code: 'NCBA_RW',
      displayName: 'NCBA',
      senderAliases: ['NCBA', 'NCBA Bank'],
      messageEvidence: /\bncba(?: bank)?\b/i,
    },
    {
      code: 'BANK_OF_AFRICA_RW',
      displayName: 'Bank of Africa',
      senderAliases: ['BOA', 'BOA Rwanda', 'Bank of Africa'],
      messageEvidence: /\b(?:bank of africa|boa rwanda)\b/i,
    },
  ];

export function identifyFinancialMessageProvider(
  message: string,
  messageSender?: string,
): string | null {
  const sender = messageSender ? normalizeSender(messageSender) : null;
  if (sender) {
    const senderMatch = RWANDA_FINANCIAL_MESSAGE_PROVIDERS.find((provider) =>
      provider.senderAliases.some((alias) => normalizeSender(alias) === sender),
    );
    if (senderMatch) {
      return senderMatch.code;
    }
  }

  return (
    RWANDA_FINANCIAL_MESSAGE_PROVIDERS.find((provider) =>
      provider.messageEvidence.test(message),
    )?.code ?? null
  );
}

export function financialMessageProviderDisplayName(
  providerCode: string | null,
): string {
  if (!providerCode) {
    return 'Unknown provider';
  }

  return (
    RWANDA_FINANCIAL_MESSAGE_PROVIDERS.find(
      (provider) => provider.code === providerCode,
    )?.displayName ?? providerCode
  );
}

function normalizeSender(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
