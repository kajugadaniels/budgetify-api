import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from '@prisma/client';

import { ListTransactionsQueryDto } from '../dto/list-transactions.query.dto';
import { TransactionsRepository } from '../transactions.repository';

export interface TransactionListResult {
  items: Transaction[];

  pagination: {
    page: number;

    limit: number;

    total: number;

    totalPages: number;

    hasNextPage: boolean;

    hasPreviousPage: boolean;
  };
}

export interface TransactionDetailResult {
  transaction: Transaction;

  events: Awaited<
    ReturnType<TransactionsRepository['findEventsByTransactionId']>
  >;
}

@Injectable()
export class TransactionQueryService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
  ) {}

  async list(
    userId: string,
    query: ListTransactionsQueryDto,
  ): Promise<TransactionListResult> {
    const createdFrom = query.from ? new Date(query.from) : undefined;

    const createdTo = query.to ? new Date(query.to) : undefined;

    if (
      createdFrom &&
      createdTo &&
      createdFrom.getTime() > createdTo.getTime()
    ) {
      throw new BadRequestException(
        'From date must be earlier than or equal to the to date.',
      );
    }

    const result = await this.transactionsRepository.listOwned({
      userId,

      page: query.page,

      limit: query.limit,

      status: query.status,

      transferType: query.transferType,

      recipientType: query.recipientType,

      category: query.category,

      createdFrom,

      createdTo,

      search: query.search,
    });

    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    return {
      items: result.items,

      pagination: {
        page: query.page,

        limit: query.limit,

        total: result.total,

        totalPages,

        hasNextPage: query.page * query.limit < result.total,

        hasPreviousPage: query.page > 1,
      },
    };
  }

  async getDetail(
    userId: string,
    transactionId: string,
  ): Promise<TransactionDetailResult> {
    const transaction = await this.transactionsRepository.findOwnedById(
      userId,
      transactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    const events = await this.transactionsRepository.findEventsByTransactionId(
      transaction.id,
    );

    return {
      transaction,

      events,
    };
  }
}
