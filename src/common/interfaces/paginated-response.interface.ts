import { DEFAULT_PAGE_LIMIT } from '../constants/pagination.constants';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ResolvedPaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export function resolvePaginationOptions(
  options: PaginationOptions,
): ResolvedPaginationOptions {
  const page = options.page ?? 1;
  const limit = options.limit ?? DEFAULT_PAGE_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function createPaginatedResponse<T>(
  items: T[],
  totalItems: number,
  pagination: Pick<ResolvedPaginationOptions, 'page' | 'limit'>,
): PaginatedResponse<T> {
  const totalPages =
    totalItems === 0 ? 1 : Math.ceil(totalItems / pagination.limit);

  return {
    items,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPreviousPage: pagination.page > 1,
    },
  };
}
