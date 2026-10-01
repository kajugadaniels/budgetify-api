import { ApiProperty } from '@nestjs/swagger';

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
