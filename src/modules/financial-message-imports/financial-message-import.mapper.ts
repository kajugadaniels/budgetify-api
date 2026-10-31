import type { FinancialMessageImport } from '@prisma/client';

import { FinancialMessageImportResponseDto } from './financial-message-import.dto';
import { FinancialMessageSourceHint } from './financial-message-source.enum';

export class FinancialMessageImportMapper {
  static toResponse(
    row: FinancialMessageImport,
    isReplay = false,
  ): FinancialMessageImportResponseDto {
    return {
      id: row.id,
      clientEventId: row.clientEventId,
      shortcutVersion: row.shortcutVersion,
      sourceHint: row.sourceHint as FinancialMessageSourceHint,
      providerCode: row.providerCode,
      direction: row.direction,
      parseStatus: row.parseStatus,
      status: row.status,
      duplicateStatus: row.duplicateStatus,
      currency: row.currency,
      amount: row.amount?.toString() ?? null,
      fee: row.fee?.toString() ?? null,
      messageReceivedAt: row.messageReceivedAt,
      occurredAt: row.occurredAt,
      senderName: row.senderName,
      senderIdentifier: row.senderIdentifier,
      accountLastFour: row.accountLastFour,
      providerReference: row.providerReference,
      parseConfidence: row.parseConfidence?.toString() ?? null,
      expiresAt: row.expiresAt,
      confirmedReceivedTransactionId: row.confirmedReceivedTransactionId,
      confirmedIncomeId: row.confirmedIncomeId,
      createdAt: row.createdAt,
      isReplay,
    };
  }
}
