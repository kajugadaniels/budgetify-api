import { TransactionStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const MANUAL_RESULT_STATUSES = [
  TransactionStatus.COMPLETED,
  TransactionStatus.FAILED,
] as const;

export type ManualResultStatus =
  | typeof TransactionStatus.COMPLETED
  | typeof TransactionStatus.FAILED;

function normalizeClientEventId(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

export class RecordManualResultRequestDto {
  @ApiProperty({
    description:
      'Client-generated unique identifier used to safely retry the same manual confirmation.',
    example: 'manual-result-1759253100000-a4d92b87919d4c41',
    minLength: 16,
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeClientEventId(value))
  @IsString()
  @MinLength(16)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._:-]+$/, {
    message:
      'Client event ID may only contain letters, numbers, dots, underscores, colons, and hyphens.',
  })
  clientEventId!: string;

  @ApiProperty({
    enum: MANUAL_RESULT_STATUSES,
    example: TransactionStatus.COMPLETED,
    description:
      'User-reported final result. Manual confirmation supports completed or failed only.',
  })
  @IsIn(MANUAL_RESULT_STATUSES)
  status!: ManualResultStatus;
}
