export const TODOS_ROUTES = {
  base: 'todos',
  byId: ':todoId',
  recordings: ':todoId/recordings',
  images: ':todoId/images',
  imageById: ':todoId/images/:imageId',
} as const;
