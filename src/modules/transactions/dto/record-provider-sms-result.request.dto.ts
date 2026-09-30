import { TransactionStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const PROVIDER_RESULT_STATUSES = [
  TransactionStatus.COMPLETED,
  TransactionStatus.FAILED,
  TransactionStatus.CANCELLED,
] as const;

function normalizeRequiredText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class RecordProviderSmsResultRequestDto {
  @ApiProperty({
    description:
      'Client-generated unique identifier used to safely retry this provider result.',
    example: 'sms-result-1759246800000-a4d92b87919d4c41',
    minLength: 16,
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeRequiredText(value))
  @IsString()
  @MinLength(16)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9._:-]+$/, {
    message:
      'Client event ID may only contain letters, numbers, dots, underscores, colons, and hyphens.',
  })
  clientEventId!: string;

  @ApiProperty({
    description:
      'Amount reported by the provider message. It must match the pending transaction.',
    example: 25_000,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({
    enum: PROVIDER_RESULT_STATUSES,
    example: TransactionStatus.COMPLETED,
  })
  @IsIn(PROVIDER_RESULT_STATUSES)
  status!:
    | TransactionStatus.COMPLETED
    | TransactionStatus.FAILED
    | TransactionStatus.CANCELLED;

  @ApiProperty({
    description: 'Transaction occurrence time reported by the provider SMS.',
    example: '2026-09-30T13:35:20.000Z',
  })
  @IsISO8601(
    { strict: true },
    {
      message: 'Occurred at must be a valid ISO 8601 timestamp.',
    },
  )
  occurredAt!: string;

  @ApiPropertyOptional({
    description:
      'Provider transaction reference. Required for completed transactions.',
    example: '18473920531',
    maxLength: 128,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:/-]+$/, {
    message: 'Provider reference contains unsupported characters.',
  })
  providerReference?: string;

  @ApiPropertyOptional({
    description:
      'Recipient name extracted from the provider result when available.',
    example: 'Jean Claude',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  receiverName?: string;

  @ApiPropertyOptional({
    example: 'INSUFFICIENT_FUNDS',
    maxLength: 64,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9._:-]+$/, {
    message: 'Failure code contains unsupported characters.',
  })
  failureCode?: string;

  @ApiPropertyOptional({
    example: 'Insufficient balance to complete the transfer.',
    maxLength: 300,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  failureReason?: string;
}
