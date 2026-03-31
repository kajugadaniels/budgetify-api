import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncomeCategory } from '@prisma/client';
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

function normalizeOptionalReceived(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return undefined;
  }

  return value;
}

export class UpdateIncomeRequestDto {
  @ApiPropertyOptional({
    description:
      'Updated human-readable name of the income source. Omit to keep the current value.',
    example: 'Web Development Contract',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalLabel(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label?: string;

  @ApiPropertyOptional({
    description:
      'Updated income amount in RWF. Omit to keep the current value.',
    example: 85000,
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
    description:
      'Updated income category selected from the client application. Omit to keep the current value.',
    enum: IncomeCategory,
    enumName: 'IncomeCategory',
    example: IncomeCategory.FREELANCE,
  })
  @IsOptional()
  @IsEnum(IncomeCategory, {
    message: 'Category must be a valid income category.',
  })
  category?: IncomeCategory;

  @ApiPropertyOptional({
    description:
      'Updated date the income was received or recorded. Omit to keep the current value.',
    example: '2026-03-08T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date?: string;

  @ApiPropertyOptional({
    description:
      'Updated received flag for the income record. Omit to keep the current value.',
    example: true,
  })
  @Transform(({ value }) => normalizeOptionalReceived(value))
  @IsOptional()
  @IsBoolean({ message: 'Received must be either true or false.' })
  received?: boolean;
}
