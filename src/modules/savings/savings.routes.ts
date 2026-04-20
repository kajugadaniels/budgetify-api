export const SAVINGS_ROUTES = {
  base: 'savings',
  byId: ':savingId',
  deposits: ':savingId/deposits',
  withdrawals: ':savingId/withdrawals',
  transactions: ':savingId/transactions',
} as const;
