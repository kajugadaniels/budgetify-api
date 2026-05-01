export const LOANS_ROUTES = {
  base: 'loans',
  byId: ':loanId',
  transactions: ':loanId/transactions',
  reverseTransaction: ':loanId/transactions/:transactionId/reverse',
  transactionToExpense: ':loanId/transactions/:transactionId/send-to-expense',
  transactionToIncome: ':loanId/transactions/:transactionId/send-to-income',
  sendToExpense: ':loanId/send-to-expense',
} as const;
