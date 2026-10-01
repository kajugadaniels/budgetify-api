import { Currency } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

import {
  ReceivedTransactionClassificationAnalyticsResponseDto,
  TransactionCategoryAnalyticsResponseDto,
  TransactionTransferTypeAnalyticsResponseDto,
} from './analytics/transaction-analytics-breakdown.response.dto';
import { TransactionAnalyticsComparisonResponseDto } from './analytics/transaction-analytics-comparison.response.dto';
import {
  ReceivedTransactionEvidenceAnalyticsResponseDto,
  TransactionAnalyticsConfirmationResponseDto,
} from './analytics/transaction-analytics-evidence.response.dto';
import { TransactionAnalyticsPeriodResponseDto } from './analytics/transaction-analytics-period.response.dto';
import { TransactionAnalyticsSummaryResponseDto } from './analytics/transaction-analytics-summary.response.dto';

export {
  ReceivedTransactionClassificationAnalyticsResponseDto,
  TransactionCategoryAnalyticsResponseDto,
  TransactionTransferTypeAnalyticsResponseDto,
} from './analytics/transaction-analytics-breakdown.response.dto';

export { TransactionAnalyticsComparisonResponseDto } from './analytics/transaction-analytics-comparison.response.dto';

export {
  ReceivedTransactionEvidenceAnalyticsResponseDto,
  TransactionAnalyticsConfirmationResponseDto,
} from './analytics/transaction-analytics-evidence.response.dto';

export { TransactionAnalyticsPeriodResponseDto } from './analytics/transaction-analytics-period.response.dto';

export { TransactionAnalyticsSummaryResponseDto } from './analytics/transaction-analytics-summary.response.dto';

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
