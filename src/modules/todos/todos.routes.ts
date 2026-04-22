export const TODOS_ROUTES = {
  base: 'todos',
  summary: 'summary',
  upcoming: 'upcoming',
  byId: ':todoId',
  recordings: ':todoId/recordings',
  images: ':todoId/images',
  imageById: ':todoId/images/:imageId',
} as const;
