import { ApiProperty } from '@nestjs/swagger';

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
