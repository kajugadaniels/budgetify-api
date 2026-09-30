import { Transaction, TransactionEvent } from '@prisma/client';

import { TransactionDetailResponseDto } from './dto/transaction-detail.response.dto';
import { TransactionEventResponseDto } from './dto/transaction-event.response.dto';
import { TransactionResponseDto } from './dto/transaction.response.dto';

export class TransactionsMapper {
  static toResponse(transaction: Transaction): TransactionResponseDto {
    return {
      id: transaction.id,
      reference: transaction.reference,
      transferType: transaction.transferType,
      status: transaction.status,
      category: transaction.category,
      currency: transaction.currency,
      amount: transaction.amount,
      feeAmount: transaction.feeAmount,
      totalAmount: transaction.totalAmount,
      recipientType: transaction.recipientType,
      receiverIdentifier: transaction.receiverIdentifier,
      receiverName: transaction.receiverName,
      note: transaction.note,
      tariffVersion: transaction.tariffVersion,
      tariffSource: transaction.tariffSource,
      providerReference: transaction.providerReference,
      failureCode: transaction.failureCode,
      failureReason: transaction.failureReason,
      processedAt: transaction.processedAt,
      completedAt: transaction.completedAt,
      failedAt: transaction.failedAt,
      cancelledAt: transaction.cancelledAt,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }

  static toEventResponse(event: TransactionEvent): TransactionEventResponseDto {
    return {
      id: event.id,
      type: event.type,
      source: event.source,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      providerReference: event.providerReference,
      failureCode: event.failureCode,
      failureReason: event.failureReason,
      occurredAt: event.occurredAt,
      createdAt: event.createdAt,
    };
  }

  static toDetailResponse(
    transaction: Transaction,
    events: TransactionEvent[],
  ): TransactionDetailResponseDto {
    return {
      ...this.toResponse(transaction),

      events: events.map((event) => this.toEventResponse(event)),
    };
  }
}
