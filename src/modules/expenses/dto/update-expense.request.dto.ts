import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
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

function normalizeOptionalNote(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

export class UpdateExpenseRequestDto {
  @ApiPropertyOptional({
    description:
      'Updated description of the expense. Omit to keep the current value.',
    example: 'Monthly Kigali Rent',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalLabel(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label?: string;

  @ApiPropertyOptional({
    description:
      'Updated expense amount in RWF. Omit to keep the current value.',
    example: 150000,
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
    description: 'Updated expense category. Omit to keep the current value.',
    enum: ExpenseCategory,
    enumName: 'ExpenseCategory',
    example: ExpenseCategory.HOUSING,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory, {
    message: 'Category must be a valid expense category.',
  })
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    description:
      'Updated date the expense was incurred. Omit to keep the current value.',
    example: '2026-04-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date?: string;

  @ApiPropertyOptional({
    description:
      'Updated free-text note. Send an empty string to clear the existing note.',
    example: 'Includes utilities surcharge',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
