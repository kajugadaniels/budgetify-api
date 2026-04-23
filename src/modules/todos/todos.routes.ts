export const TODOS_ROUTES = {
  base: 'todos',
  summary: 'summary',
  audit: 'audit',
  upcoming: 'upcoming',
  recordingsIndex: 'recordings',
  byId: ':todoId',
  recordings: ':todoId/recordings',
  recordExpense: ':todoId/record-expense',
  images: ':todoId/images',
  imageById: ':todoId/images/:imageId',
} as const;
