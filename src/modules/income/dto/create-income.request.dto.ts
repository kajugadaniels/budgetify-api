import { ApiProperty } from '@nestjs/swagger';
import { Currency, IncomeCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
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

function normalizeReceived(value: unknown): unknown {
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

export class CreateIncomeRequestDto {
  @ApiProperty({
    description: 'Human-readable name of the income source.',
    example: 'Monthly Salary',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredLabel(value))
  @IsString()
  @IsNotEmpty({ message: 'Label is required.' })
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label!: string;

  @ApiProperty({
    description:
      'Gross income amount in the selected currency. RWF is used when currency is omitted.',
    example: 450000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    description:
      'Currency for the submitted amount. USD amounts are converted to RWF for reporting using the configured exchange rate.',
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
    required: false,
    default: Currency.RWF,
  })
  @IsEnum(Currency, {
    message: 'Currency must be either RWF or USD.',
  })
  currency: Currency = Currency.RWF;

  @ApiProperty({
    description: 'Income category selected from the client application.',
    enum: IncomeCategory,
    enumName: 'IncomeCategory',
    example: IncomeCategory.SALARY,
  })
  @IsEnum(IncomeCategory, {
    message: 'Category must be a valid income category.',
  })
  category!: IncomeCategory;

  @ApiProperty({
    description: 'Date the income was received or recorded.',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiProperty({
    description:
      'Whether this income has already been received. Defaults to false when omitted.',
    example: true,
    required: false,
    default: false,
  })
  @Transform(({ value }) => normalizeReceived(value))
  @IsBoolean({ message: 'Received must be either true or false.' })
  received: boolean = false;
}
