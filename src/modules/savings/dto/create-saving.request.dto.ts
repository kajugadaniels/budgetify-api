import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function normalizeRequiredLabel(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ');
}

function normalizeAmount(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();

    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

function normalizeOptionalNote(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeStillHave(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

export class CreateSavingRequestDto {
  @ApiProperty({
    description: 'Human-readable description of the saving record.',
    example: 'Emergency fund transfer',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredLabel(value))
  @IsString()
  @IsNotEmpty({ message: 'Label is required.' })
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label!: string;

  @ApiProperty({
    description:
      'Saving amount in the selected currency. RWF is used when currency is omitted.',
    example: 350000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(0.01, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    description:
      'Currency for the submitted amount. USD amounts are converted to RWF for reporting using the configured exchange rate.',
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
    default: Currency.RWF,
  })
  @IsEnum(Currency, {
    message: 'Currency must be either RWF or USD.',
  })
  currency: Currency = Currency.RWF;

  @ApiProperty({
    description: 'Date the saving was recorded.',
    example: '2026-04-01T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text note for additional context.',
    example: 'Transferred to the USD reserve account',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;

  @ApiPropertyOptional({
    description:
      'Whether this saving is still currently available. Defaults to true when omitted.',
    example: true,
    default: true,
  })
  @Transform(({ value }) => normalizeStillHave(value))
  @IsBoolean({ message: 'StillHave must be either true or false.' })
  stillHave: boolean = true;
}
