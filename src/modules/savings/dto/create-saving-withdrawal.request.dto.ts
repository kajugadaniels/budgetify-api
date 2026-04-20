import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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

export class CreateSavingWithdrawalRequestDto {
  @ApiProperty({
    description:
      'Withdrawal amount in the selected currency. The RWF value cannot exceed the current saving balance.',
    example: 50000,
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
      'Currency for the withdrawal amount. RWF is used when currency is omitted.',
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
    description: 'Date the withdrawal was made.',
    example: '2026-04-20T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text note for this withdrawal.',
    example: 'Moved back to mobile money',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Note must not be empty.' })
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
