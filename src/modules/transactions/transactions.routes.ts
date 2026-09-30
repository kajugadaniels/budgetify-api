export const TRANSACTIONS_ROUTES = {
  base: 'transactions',
  quote: 'quote',
  ussdOpened: ':transactionId/ussd-opened',
  providerSmsResult: ':transactionId/provider-sms-result',
} as const;
