export const SAVINGS_ROUTES = {
  base: 'savings',
  byId: ':savingId',
  deposits: ':savingId/deposits',
  reverseDeposit: ':savingId/transactions/:transactionId/reverse',
  withdrawals: ':savingId/withdrawals',
  transactions: ':savingId/transactions',
} as const;
