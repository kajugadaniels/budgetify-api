import {
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  ReceivedTransactionStatus,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function normalizeOptionalSearch(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class ListReceivedTransactionsQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: ReceivedTransactionStatus,
  })
  @IsOptional()
  @IsEnum(ReceivedTransactionStatus)
  status?: ReceivedTransactionStatus;

  @ApiPropertyOptional({
    enum: ReceivedTransactionEvidenceSource,
  })
  @IsOptional()
  @IsEnum(ReceivedTransactionEvidenceSource)
  evidenceSource?: ReceivedTransactionEvidenceSource;

  @ApiPropertyOptional({
    enum: ReceivedTransactionClassification,
  })
  @IsOptional()
  @IsEnum(ReceivedTransactionClassification)
  classification?: ReceivedTransactionClassification;

  @ApiPropertyOptional({
    description:
      'Include received transactions whose provider occurrence time is at or after this timestamp.',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601(
    {
      strict: true,
    },
    {
      message: 'From must be a valid ISO 8601 timestamp.',
    },
  )
  from?: string;

  @ApiPropertyOptional({
    description:
      'Include received transactions whose provider occurrence time is at or before this timestamp.',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601(
    {
      strict: true,
    },
    {
      message: 'To must be a valid ISO 8601 timestamp.',
    },
  )
  to?: string;

  @ApiPropertyOptional({
    description:
      'Search internal reference, provider reference, sender name, or sender identifier.',
    example: 'Jean',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalSearch(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
