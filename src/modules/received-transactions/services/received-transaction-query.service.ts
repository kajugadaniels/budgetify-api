import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReceivedTransaction } from '@prisma/client';

import { ListReceivedTransactionsQueryDto } from '../dto/list-received-transactions.query.dto';
import { ReceivedTransactionReadRepository } from '../repositories/received-transaction-read.repository';
import { ReceivedTransactionListResult } from '../types/received-transaction.types';

@Injectable()
export class ReceivedTransactionQueryService {
  constructor(
    private readonly readRepository: ReceivedTransactionReadRepository,
  ) {}

  async list(
    userId: string,
    query: ListReceivedTransactionsQueryDto,
  ): Promise<ReceivedTransactionListResult> {
    const occurredFrom = query.from ? new Date(query.from) : undefined;

    const occurredTo = query.to ? new Date(query.to) : undefined;

    if (
      occurredFrom &&
      occurredTo &&
      occurredFrom.getTime() > occurredTo.getTime()
    ) {
      throw new BadRequestException(
        'From date must be earlier than or equal to the to date.',
      );
    }

    const result = await this.readRepository.listOwned({
      userId,

      page: query.page,

      limit: query.limit,

      status: query.status,

      evidenceSource: query.evidenceSource,

      classification: query.classification,

      occurredFrom,

      occurredTo,

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
    receivedTransactionId: string,
  ): Promise<ReceivedTransaction> {
    const transaction = await this.readRepository.findOwnedById(
      userId,
      receivedTransactionId,
    );

    if (!transaction) {
      throw new NotFoundException('Received transaction not found.');
    }

    return transaction;
  }
}
