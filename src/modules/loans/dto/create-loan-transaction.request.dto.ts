import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Currency,
  LoanBalanceEffect,
  LoanTransactionType,
} from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
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

export class CreateLoanTransactionRequestDto {
  @ApiProperty({
    enum: LoanTransactionType,
    example: LoanTransactionType.REPAYMENT,
    description: 'Ledger transaction type to record on this loan.',
  })
  @IsEnum(LoanTransactionType, {
    message: 'Type must be a valid loan transaction type.',
  })
  type!: LoanTransactionType;

  @ApiProperty({
    example: 120000,
    description: 'Transaction amount in the selected currency.',
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    example: 100000,
    description:
      'Optional principal portion of the transaction amount. Required for split adjustments.',
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Principal amount must be a valid number.' },
  )
  @Min(0, { message: 'Principal amount must not be negative.' })
  principalAmount?: number;

  @ApiPropertyOptional({
    example: 20000,
    description:
      'Optional interest portion of the transaction amount. Required for split adjustments.',
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Interest amount must be a valid number.' },
  )
  @Min(0, { message: 'Interest amount must not be negative.' })
  interestAmount?: number;

  @ApiProperty({
    enum: Currency,
    example: Currency.RWF,
    description: 'Currency used for the transaction amount.',
  })
  @IsEnum(Currency, {
    message: 'Currency must be a valid currency.',
  })
  currency: Currency = Currency.RWF;

  @ApiPropertyOptional({
    enum: LoanBalanceEffect,
    example: LoanBalanceEffect.DECREASE,
    description:
      'Optional balance effect override. Used for manual adjustment entries.',
  })
  @IsOptional()
  @IsEnum(LoanBalanceEffect, {
    message: 'Balance effect must be INCREASE or DECREASE.',
  })
  balanceEffect?: LoanBalanceEffect;

  @ApiProperty({
    example: '2026-05-01T00:00:00.000Z',
    description: 'Transaction date.',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    example: 'First partial repayment from salary',
    maxLength: 500,
    description: 'Optional transaction note.',
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
