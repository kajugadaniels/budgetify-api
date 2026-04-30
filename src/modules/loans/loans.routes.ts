export const LOANS_ROUTES = {
  base: 'loans',
  byId: ':loanId',
  transactions: ':loanId/transactions',
  sendToExpense: ':loanId/send-to-expense',
} as const;
