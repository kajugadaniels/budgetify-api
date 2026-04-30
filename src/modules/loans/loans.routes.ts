export const LOANS_ROUTES = {
  base: 'loans',
  byId: ':loanId',
  transactions: ':loanId/transactions',
  transactionToExpense: ':loanId/transactions/:transactionId/send-to-expense',
  transactionToIncome: ':loanId/transactions/:transactionId/send-to-income',
  sendToExpense: ':loanId/send-to-expense',
} as const;
