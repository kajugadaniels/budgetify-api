import { ReceivedTransaction } from '@prisma/client';

import { ReceivedTransactionResponseDto } from './dto/received-transaction.response.dto';

export class ReceivedTransactionsMapper {
  static toResponse(
    transaction: ReceivedTransaction,
  ): ReceivedTransactionResponseDto {
    return {
      id: transaction.id,

      reference: transaction.reference,

      status: transaction.status,

      classification: transaction.classification,

      evidenceSource: transaction.evidenceSource,

      currency: transaction.currency,

      amount: transaction.amount,

      senderIdentifier: transaction.senderIdentifier,

      senderName: transaction.senderName,

      providerReference: transaction.providerReference,

      occurredAt: transaction.occurredAt,

      reversedAt: transaction.reversedAt,

      note: transaction.note,

      createdAt: transaction.createdAt,

      updatedAt: transaction.updatedAt,
    };
  }
}
