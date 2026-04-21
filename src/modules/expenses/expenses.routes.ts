export const EXPENSES_ROUTES = {
  base: 'expenses',
  categories: 'categories',
  summary: 'summary',
  audit: 'audit',
  mobileMoneyQuote: 'mobile-money/quote',
  mobileMoneyTariffs: 'mobile-money/tariffs',
  mobileMoneyTariffById: 'mobile-money/tariffs/:tariffId',
  byId: ':expenseId',
} as const;
