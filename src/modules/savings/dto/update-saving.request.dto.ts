import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
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

export class UpdateSavingRequestDto {
  @ApiPropertyOptional({
    description: 'Updated description of the saving record.',
    example: 'Long-term reserve transfer',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredLabel(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label?: string;

  @ApiPropertyOptional({
    description:
      'Updated saving amount in the selected currency. Omit to keep the current value.',
    example: 425000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(0.01, { message: 'Amount must be greater than zero.' })
  amount?: number;

  @ApiPropertyOptional({
    description:
      'Updated currency for the submitted amount. Omit to keep the current currency.',
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  @IsOptional()
  @IsEnum(Currency, {
    message: 'Currency must be either RWF or USD.',
  })
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Updated saving date.',
    example: '2026-04-03T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Updated free-text note for additional context.',
    example: 'Adjusted after the monthly USD top-up',
    maxLength: 500,
    nullable: true,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;

  @ApiPropertyOptional({
    description:
      'Updated state that indicates whether this saving is still currently available.',
    example: false,
  })
  @Transform(({ value }) => normalizeStillHave(value))
  @IsOptional()
  @IsBoolean({ message: 'StillHave must be either true or false.' })
  stillHave?: boolean;
}
