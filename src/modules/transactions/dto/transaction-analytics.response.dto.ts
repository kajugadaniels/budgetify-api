import {
  Currency,
  ReceivedTransactionClassification,
  TransactionCategory,
  TransactionTransferType,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionAnalyticsPeriodResponseDto {
  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
  })
  from!: string;

  @ApiProperty({
    example: '2026-09-30T23:59:59.999Z',
  })
  to!: string;

  @ApiProperty({
    description:
      'Start of the immediately preceding comparison period with the same duration.',
    example: '2026-08-02T00:00:00.000Z',
  })
  previousFrom!: string;

  @ApiProperty({
    description:
      'End of the immediately preceding comparison period with the same duration.',
    example: '2026-08-31T23:59:59.999Z',
  })
  previousTo!: string;
}

export class TransactionAnalyticsSummaryResponseDto {
  @ApiProperty({
    description:
      'Sum of outgoing transfer principal from currently completed sent transactions in the selected period.',
    example: 485000,
  })
  sentAmount!: number;

  @ApiProperty({
    description:
      'Sum of currently completed received transactions whose occurrence time falls inside the selected period.',
    example: 235000,
  })
  receivedAmount!: number;

  @ApiProperty({
    description:
      'Sum of outgoing transaction fees from currently completed sent transactions in the selected period.',
    example: 6200,
  })
  feesPaid!: number;

  @ApiProperty({
    description:
      'Actual outgoing wallet movement from completed sent transactions: transfer principal plus fees.',
    example: 491200,
  })
  totalDebited!: number;

  @ApiProperty({
    description:
      'Net wallet cash movement for the period: receivedAmount minus totalDebited. A negative value means more money moved out than in.',
    example: -256200,
  })
  netCashMovement!: number;

  @ApiProperty({
    description:
      'Number of currently completed outgoing transactions whose completion occurred in the selected period.',
    example: 18,
  })
  completedTransactions!: number;

  @ApiProperty({
    description:
      'Number of currently completed received transactions whose occurrence time falls inside the selected period.',
    example: 7,
  })
  receivedTransactions!: number;

  @ApiProperty({
    description: 'Pending outgoing transactions created during the period.',
    example: 1,
  })
  pendingTransactions!: number;

  @ApiProperty({
    description:
      'Outgoing transactions currently processing whose processing began during the period.',
    example: 2,
  })
  processingTransactions!: number;

  @ApiProperty({
    description:
      'Pending plus processing outgoing transactions for the selected period.',
    example: 3,
  })
  needsConfirmation!: number;

  @ApiProperty({
    description:
      'Outgoing transactions currently failed whose failure occurred during the period.',
    example: 1,
  })
  failedTransactions!: number;

  @ApiProperty({
    description:
      'Outgoing transactions currently cancelled whose cancellation occurred during the period.',
    example: 1,
  })
  cancelledTransactions!: number;

  @ApiProperty({
    description:
      'Outgoing transactions currently reversed whose reversal occurred during the period.',
    example: 0,
  })
  reversedTransactions!: number;

  @ApiProperty({
    description:
      'Received transactions currently reversed whose reversal occurred during the period.',
    example: 1,
  })
  receivedReversedTransactions!: number;
}

export class TransactionAnalyticsComparisonResponseDto {
  @ApiProperty({
    example: 420000,
  })
  previousSentAmount!: number;

  @ApiProperty({
    description:
      'Percentage change in outgoing transfer principal compared with the preceding equal-length period. Null means the previous period was zero while the current period is non-zero.',
    example: 15.48,
    nullable: true,
  })
  sentAmountChangePercentage!: number | null;

  @ApiProperty({
    example: 180000,
  })
  previousReceivedAmount!: number;

  @ApiProperty({
    description:
      'Percentage change in received money compared with the preceding equal-length period. Null means the previous period was zero while the current period is non-zero.',
    example: 30.56,
    nullable: true,
  })
  receivedAmountChangePercentage!: number | null;

  @ApiProperty({
    example: 5300,
  })
  previousFeesPaid!: number;

  @ApiProperty({
    description:
      'Percentage change in outgoing fees compared with the preceding equal-length period.',
    example: 16.98,
    nullable: true,
  })
  feesPaidChangePercentage!: number | null;

  @ApiProperty({
    example: 425300,
  })
  previousTotalDebited!: number;

  @ApiProperty({
    description:
      'Percentage change in actual outgoing wallet movement compared with the preceding equal-length period.',
    example: 15.49,
    nullable: true,
  })
  totalDebitedChangePercentage!: number | null;

  @ApiProperty({
    description:
      'Net cash movement from the immediately preceding equal-length period.',
    example: -245300,
  })
  previousNetCashMovement!: number;

  @ApiProperty({
    description:
      'Absolute RWF change in net cash movement versus the previous period. This is intentionally not expressed as a percentage because net movement can cross zero.',
    example: -10900,
  })
  netCashMovementChange!: number;

  @ApiProperty({
    example: 15,
  })
  previousCompletedTransactions!: number;

  @ApiProperty({
    description:
      'Percentage change in completed outgoing transaction count compared with the preceding equal-length period.',
    example: 20,
    nullable: true,
  })
  completedTransactionsChangePercentage!: number | null;

  @ApiProperty({
    example: 5,
  })
  previousReceivedTransactions!: number;

  @ApiProperty({
    description:
      'Percentage change in completed received transaction count compared with the preceding equal-length period.',
    example: 40,
    nullable: true,
  })
  receivedTransactionsChangePercentage!: number | null;
}

export class TransactionAnalyticsConfirmationResponseDto {
  @ApiProperty({
    description:
      'Completed outgoing transactions whose result was derived from structured provider SMS evidence parsed on the user device. This is client-supplied evidence and is not independent provider API verification.',
    example: 10,
  })
  smsEvidence!: number;

  @ApiProperty({
    description:
      'Completed outgoing transactions independently backed by a provider API lifecycle result.',
    example: 4,
  })
  providerApiConfirmed!: number;

  @ApiProperty({
    description:
      'Completed outgoing transactions manually confirmed through Budgetify and without stronger provider API or SMS evidence.',
    example: 3,
  })
  manuallyConfirmed!: number;

  @ApiProperty({
    description:
      'Completed outgoing transactions whose completion provenance cannot be classified from the lifecycle ledger.',
    example: 1,
  })
  unclassified!: number;
}

export class ReceivedTransactionEvidenceAnalyticsResponseDto {
  @ApiProperty({
    description:
      'Completed received transactions created from structured MTN SMS evidence parsed on the user device.',
    example: 5,
  })
  smsEvidence!: number;

  @ApiProperty({
    description:
      'Completed received transactions created from independent provider API evidence.',
    example: 1,
  })
  providerApiEvidence!: number;

  @ApiProperty({
    description:
      'Completed received transactions manually entered by the user.',
    example: 1,
  })
  manualEntries!: number;
}

export class TransactionCategoryAnalyticsResponseDto {
  @ApiProperty({
    enum: TransactionCategory,
    example: TransactionCategory.TRANSPORT,
  })
  category!: TransactionCategory;

  @ApiProperty({
    example: 90000,
  })
  sentAmount!: number;

  @ApiProperty({
    example: 700,
  })
  feesPaid!: number;

  @ApiProperty({
    example: 90700,
  })
  totalDebited!: number;

  @ApiProperty({
    example: 6,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed outgoing transfer principal represented by this category.',
    example: 18.56,
  })
  percentage!: number;
}

export class TransactionTransferTypeAnalyticsResponseDto {
  @ApiProperty({
    enum: TransactionTransferType,
    example: TransactionTransferType.MOMO_TO_MOMO,
  })
  transferType!: TransactionTransferType;

  @ApiProperty({
    example: 350000,
  })
  sentAmount!: number;

  @ApiProperty({
    example: 4500,
  })
  feesPaid!: number;

  @ApiProperty({
    example: 354500,
  })
  totalDebited!: number;

  @ApiProperty({
    example: 12,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed outgoing transfer principal represented by this transfer type.',
    example: 72.16,
  })
  percentage!: number;
}

export class ReceivedTransactionClassificationAnalyticsResponseDto {
  @ApiProperty({
    enum: ReceivedTransactionClassification,
    example: ReceivedTransactionClassification.REIMBURSEMENT,
  })
  classification!: ReceivedTransactionClassification;

  @ApiProperty({
    example: 85000,
  })
  receivedAmount!: number;

  @ApiProperty({
    example: 3,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed received money represented by this classification.',
    example: 36.17,
  })
  percentage!: number;
}

export class TransactionAnalyticsResponseDto {
  @ApiProperty({
    enum: Currency,
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({
    type: TransactionAnalyticsPeriodResponseDto,
  })
  period!: TransactionAnalyticsPeriodResponseDto;

  @ApiProperty({
    type: TransactionAnalyticsSummaryResponseDto,
  })
  summary!: TransactionAnalyticsSummaryResponseDto;

  @ApiProperty({
    type: TransactionAnalyticsComparisonResponseDto,
  })
  comparison!: TransactionAnalyticsComparisonResponseDto;

  @ApiProperty({
    type: TransactionAnalyticsConfirmationResponseDto,
  })
  confirmation!: TransactionAnalyticsConfirmationResponseDto;

  @ApiProperty({
    type: ReceivedTransactionEvidenceAnalyticsResponseDto,
  })
  receivedEvidence!: ReceivedTransactionEvidenceAnalyticsResponseDto;

  @ApiProperty({
    type: [TransactionCategoryAnalyticsResponseDto],
  })
  categories!: TransactionCategoryAnalyticsResponseDto[];

  @ApiProperty({
    type: [TransactionTransferTypeAnalyticsResponseDto],
  })
  transferTypes!: TransactionTransferTypeAnalyticsResponseDto[];

  @ApiProperty({
    type: [ReceivedTransactionClassificationAnalyticsResponseDto],
  })
  receivedClassifications!: ReceivedTransactionClassificationAnalyticsResponseDto[];
}
