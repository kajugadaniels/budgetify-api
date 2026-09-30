import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const MAX_RECEIVED_AMOUNT_RWF = 10_000_000;

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

function normalizeOptionalIdentifier(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/[\s()-]/g, '');

  return normalized.length === 0 ? undefined : normalized;
}

export class RecordReceivedManualRequestDto {
  @ApiProperty({
    description: 'Client-generated identifier used to make retries idempotent.',
    example: 'manual-received-1759263000000-b19cd563fe834202',
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
    description: 'Whole-number amount manually recorded as received.',
    example: 25_000,
    minimum: 1,
    maximum: MAX_RECEIVED_AMOUNT_RWF,
  })
  @Type(() => Number)
  @IsInt({
    message: 'Amount must be a whole number of RWF.',
  })
  @Min(1)
  @Max(MAX_RECEIVED_AMOUNT_RWF)
  amount!: number;

  @ApiProperty({
    description: 'When the user says the received payment occurred.',
    example: '2026-09-30T19:35:20.000Z',
  })
  @IsISO8601(
    {
      strict: true,
    },
    {
      message: 'Occurred at must be a valid ISO 8601 timestamp.',
    },
  )
  occurredAt!: string;

  @ApiPropertyOptional({
    description: 'Sender phone number or another numeric sender identifier.',
    example: '0788123456',
  })
  @Transform(({ value }) => normalizeOptionalIdentifier(value))
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{3,34}$/, {
    message: 'Sender identifier must contain a valid numeric identifier.',
  })
  senderIdentifier?: string;

  @ApiPropertyOptional({
    description: 'Sender name entered by the user.',
    example: 'Jean Claude',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderName?: string;

  @ApiPropertyOptional({
    description:
      'Provider transaction reference entered by the user when available. It is optional for manually recorded received payments.',
    example: '18473920531',
    minLength: 3,
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
}
