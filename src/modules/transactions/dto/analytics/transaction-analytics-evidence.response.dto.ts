import { ApiProperty } from '@nestjs/swagger';

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
