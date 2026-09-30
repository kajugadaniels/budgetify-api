export const TRANSACTIONS_ROUTES = {
  base: 'transactions',
  quote: 'quote',
  detail: ':transactionId',
  ussdOpened: ':transactionId/ussd-opened',
  providerSmsResult: ':transactionId/provider-sms-result',
  manualResult: ':transactionId/manual-result',
} as const;
