export const RECEIVED_TRANSACTIONS_ROUTES = {
  base: 'received-transactions',

  providerSms: 'provider-sms',

  manual: 'manual',

  classification: ':receivedTransactionId/classification',

  detail: ':receivedTransactionId',
} as const;
