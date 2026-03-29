export const TODOS_ROUTES = {
  base: 'todos',
  byId: ':todoId',
  images: ':todoId/images',
  imageById: ':todoId/images/:imageId',
} as const;
