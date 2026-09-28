import { Transaction } from '@prisma/client';

import { TransactionResponseDto } from './dto/transaction.response.dto';

export class TransactionsMapper {
  static toResponse(
    transaction: Transaction,
  ): TransactionResponseDto {
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
      createdAt: transaction.createdAt,
    };
  }
}
