import { TransactionTransferType } from '@prisma/client';

export const MIN_TRANSACTION_AMOUNT_RWF = 1;
export const MAX_TRANSACTION_AMOUNT_RWF = 10_000_000;

export interface TransactionFeeQuote {
  transferType: TransactionTransferType;
  currency: 'RWF';
  amount: number;
  feeAmount: number;
  totalAmount: number;
  tariffVersion: string;
  tariffSource: string;
}

interface FeeBand {
  minAmount: number;
  maxAmount: number;
  feeAmount: number;
}

export const MOMO_TO_MOMO_TARIFF_VERSION = 'MTN_RWANDA_2026-09-28';
export const MOMO_TO_EKASH_TARIFF_VERSION = 'BUDGETIFY_EKASH_2026-09-28';
export const MOMO_PAY_TARIFF_VERSION = 'MTN_RWANDA_MOMO_PAY_2026-09-30';
export const MOMO_TO_MOMO_TARIFF_SOURCE = 'MTN_RWANDA_PUBLIC_TARIFF';
export const MOMO_TO_EKASH_TARIFF_SOURCE = 'BUDGETIFY_PRODUCT_RULE';
export const MOMO_PAY_TARIFF_SOURCE = 'MTN_RWANDA_PUBLIC_TARIFF';

export const MOMO_TO_MOMO_FEE_BANDS: readonly FeeBand[] = [
  { minAmount: 1, maxAmount: 1_000, feeAmount: 20 },
  { minAmount: 1_001, maxAmount: 10_000, feeAmount: 100 },
  { minAmount: 10_001, maxAmount: 150_000, feeAmount: 250 },
  { minAmount: 150_001, maxAmount: 2_000_000, feeAmount: 1_500 },
  { minAmount: 2_000_001, maxAmount: 5_000_000, feeAmount: 3_000 },
  { minAmount: 5_000_001, maxAmount: 10_000_000, feeAmount: 5_000 },
] as const;

export const MOMO_TO_EKASH_FLAT_FEE_RWF = 20;
export const MOMO_PAY_CUSTOMER_FEE_RWF = 0;
