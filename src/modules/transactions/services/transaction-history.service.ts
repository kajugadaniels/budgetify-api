import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ReceivedTransaction,
  ReceivedTransactionStatus,
  Transaction,
  TransactionStatus,
} from '@prisma/client';

import { ListTransactionHistoryQueryDto } from '../dto/list-transaction-history.query.dto';
import {
  TransactionHistoryItemResponseDto,
  TransactionHistoryResponseDto,
} from '../dto/transaction-history.response.dto';
import { TransactionHistoryRepository } from '../transaction-history.repository';
import { TransactionHistoryDirection } from '../transaction-history.types';

@Injectable()
export class TransactionHistoryService {
  constructor(private readonly repository: TransactionHistoryRepository) {}

  async list(
    userId: string,
    query: ListTransactionHistoryQueryDto,
  ): Promise<TransactionHistoryResponseDto> {
    if (
      query.direction === TransactionHistoryDirection.RECEIVED &&
      query.transferType
    ) {
      throw new BadRequestException(
        'Transfer type can only be used with sent transaction history.',
      );
    }

    const result = await this.repository.getCandidates({
      userId,

      page: query.page,

      limit: query.limit,

      direction: query.direction,

      status: query.status,

      transferType: query.transferType,

      search: query.search,
    });

    const combined = [
      ...result.sent.map((transaction) => this.mapSent(transaction)),

      ...result.received.map((transaction) => this.mapReceived(transaction)),
    ];

    combined.sort((left, right) => {
      const time = right.activityAt.getTime() - left.activityAt.getTime();

      if (time !== 0) {
        return time;
      }

      if (left.direction !== right.direction) {
        return left.direction === TransactionHistoryDirection.SENT ? -1 : 1;
      }

      return right.id.localeCompare(left.id);
    });

    const offset = (query.page - 1) * query.limit;

    const items = combined.slice(offset, offset + query.limit);

    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / query.limit);

    return {
      items,

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

  private mapSent(transaction: Transaction): TransactionHistoryItemResponseDto {
    return {
      id: transaction.id,

      direction: TransactionHistoryDirection.SENT,

      reference: transaction.reference,

      status: transaction.status,

      currency: transaction.currency,

      amount: transaction.amount,

      feeAmount: transaction.feeAmount,

      totalAmount: transaction.totalAmount,

      counterpartyIdentifier: transaction.receiverIdentifier,

      counterpartyName: transaction.receiverName,

      providerReference: transaction.providerReference,

      transferType: transaction.transferType,

      category: transaction.category,

      classification: null,

      evidenceSource: null,

      processedAt: transaction.processedAt,

      activityAt: transaction.createdAt,

      createdAt: transaction.createdAt,
    };
  }

  private mapReceived(
    transaction: ReceivedTransaction,
  ): TransactionHistoryItemResponseDto {
    return {
      id: transaction.id,

      direction: TransactionHistoryDirection.RECEIVED,

      reference: transaction.reference,

      status: this.mapReceivedStatus(transaction.status),

      currency: transaction.currency,

      amount: transaction.amount,

      feeAmount: null,

      totalAmount: null,

      counterpartyIdentifier: transaction.senderIdentifier,

      counterpartyName: transaction.senderName,

      providerReference: transaction.providerReference,

      transferType: null,

      category: null,

      classification: transaction.classification,

      evidenceSource: transaction.evidenceSource,

      processedAt: null,

      activityAt: transaction.occurredAt,

      createdAt: transaction.createdAt,
    };
  }

  private mapReceivedStatus(
    status: ReceivedTransactionStatus,
  ): TransactionStatus {
    return status === ReceivedTransactionStatus.COMPLETED
      ? TransactionStatus.COMPLETED
      : TransactionStatus.REVERSED;
  }
}
