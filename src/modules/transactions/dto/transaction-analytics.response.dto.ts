import {
  Currency,
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
      'Sum of transfer amounts from completed transactions in the selected period.',
    example: 485000,
  })
  sentAmount!: number;

  @ApiProperty({
    description:
      'Sum of transaction fees from completed transactions in the selected period.',
    example: 6200,
  })
  feesPaid!: number;

  @ApiProperty({
    description:
      'Sum of transfer amount plus fees from completed transactions.',
    example: 491200,
  })
  totalDebited!: number;

  @ApiProperty({
    description:
      'Number of transactions currently completed whose completion occurred in the selected period.',
    example: 18,
  })
  completedTransactions!: number;

  @ApiProperty({
    description: 'Pending transactions created during the selected period.',
    example: 1,
  })
  pendingTransactions!: number;

  @ApiProperty({
    description:
      'Transactions currently processing whose processing began during the selected period.',
    example: 2,
  })
  processingTransactions!: number;

  @ApiProperty({
    description:
      'Pending plus processing transactions for the selected period.',
    example: 3,
  })
  needsConfirmation!: number;

  @ApiProperty({
    description:
      'Transactions currently failed whose failure occurred during the selected period.',
    example: 1,
  })
  failedTransactions!: number;

  @ApiProperty({
    description:
      'Transactions currently cancelled whose cancellation occurred during the selected period.',
    example: 1,
  })
  cancelledTransactions!: number;

  @ApiProperty({
    description:
      'Transactions currently reversed whose reversal occurred during the selected period.',
    example: 0,
  })
  reversedTransactions!: number;
}

export class TransactionAnalyticsComparisonResponseDto {
  @ApiProperty({
    example: 420000,
  })
  previousSentAmount!: number;

  @ApiProperty({
    description:
      'Percentage change in sent amount compared with the preceding equal-length period. Null means the previous period was zero while the current period is non-zero.',
    example: 15.48,
    nullable: true,
  })
  sentAmountChangePercentage!: number | null;

  @ApiProperty({
    example: 5300,
  })
  previousFeesPaid!: number;

  @ApiProperty({
    description:
      'Percentage change in paid fees compared with the preceding equal-length period.',
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
      'Percentage change in total debited amount compared with the preceding equal-length period.',
    example: 15.49,
    nullable: true,
  })
  totalDebitedChangePercentage!: number | null;

  @ApiProperty({
    example: 15,
  })
  previousCompletedTransactions!: number;

  @ApiProperty({
    description:
      'Percentage change in completed transaction count compared with the preceding equal-length period.',
    example: 20,
    nullable: true,
  })
  completedTransactionsChangePercentage!: number | null;
}

export class TransactionAnalyticsConfirmationResponseDto {
  @ApiProperty({
    description:
      'Completed transactions backed by a provider SMS or provider API lifecycle event.',
    example: 14,
  })
  providerConfirmed!: number;

  @ApiProperty({
    description: 'Completed transactions manually confirmed through Budgetify.',
    example: 4,
  })
  manuallyConfirmed!: number;

  @ApiProperty({
    description:
      'Completed transactions whose confirmation provenance cannot be classified from the lifecycle ledger.',
    example: 0,
  })
  unclassified!: number;
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
      'Share of completed transfer amount represented by this category.',
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
      'Share of completed transfer amount represented by this transfer type.',
    example: 72.16,
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
    type: [TransactionCategoryAnalyticsResponseDto],
  })
  categories!: TransactionCategoryAnalyticsResponseDto[];

  @ApiProperty({
    type: [TransactionTransferTypeAnalyticsResponseDto],
  })
  transferTypes!: TransactionTransferTypeAnalyticsResponseDto[];
}
