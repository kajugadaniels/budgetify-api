export const LOANS_ROUTES = {
  base: 'loans',
  summary: 'summary',
  audit: 'audit',
  aging: 'aging',
  transactionsIndex: 'transactions',
  byId: ':loanId',
  transactions: ':loanId/transactions',
  reverseTransaction: ':loanId/transactions/:transactionId/reverse',
  transactionToExpense: ':loanId/transactions/:transactionId/send-to-expense',
  transactionToIncome: ':loanId/transactions/:transactionId/send-to-income',
  sendToExpense: ':loanId/send-to-expense',
} as const;
