import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function normalizeOptionalLabel(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeOptionalAmount(value: unknown): unknown {
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

function normalizeOptionalPaid(value: unknown): unknown {
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

export class UpdateLoanRequestDto {
  @ApiPropertyOptional({
    description: 'Updated description of the loan.',
    example: 'Car repair advance from family',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalLabel(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label?: string;

  @ApiPropertyOptional({
    description: 'Updated loan amount in RWF.',
    example: 320000,
  })
  @Transform(({ value }) => normalizeOptionalAmount(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated loan date.',
    example: '2026-04-02T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Updated paid state for the loan.',
    example: true,
  })
  @Transform(({ value }) => normalizeOptionalPaid(value))
  @IsOptional()
  @IsBoolean({ message: 'Paid must be a valid boolean value.' })
  paid?: boolean;

  @ApiPropertyOptional({
    description:
      'Updated free-text note. Send an empty string to clear the existing note.',
    example: 'Cleared in two installments',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
