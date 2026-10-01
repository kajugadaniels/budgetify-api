import { ReceivedTransaction } from '@prisma/client';

export interface ReceivedTransactionListResult {
  items: ReceivedTransaction[];

  pagination: {
    page: number;

    limit: number;

    total: number;

    totalPages: number;

    hasNextPage: boolean;

    hasPreviousPage: boolean;
  };
}
