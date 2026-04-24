import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Currency, LoanDirection, LoanType } from '@prisma/client';
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
    enum: LoanDirection,
    example: LoanDirection.BORROWED,
    description: 'Updated direction of the loan.',
  })
  @IsOptional()
  @IsEnum(LoanDirection, {
    message: 'Direction must be BORROWED or LENT.',
  })
  direction?: LoanDirection;

  @ApiPropertyOptional({
    enum: LoanType,
    example: LoanType.BUSINESS,
    description: 'Updated business purpose or relationship context.',
  })
  @IsOptional()
  @IsEnum(LoanType, {
    message: 'Type must be a valid loan type.',
  })
  type?: LoanType;

  @ApiPropertyOptional({
    description: 'Updated counterparty name.',
    example: 'Jean Pierre',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalLabel(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, {
    message: 'Counterparty name must not exceed 120 characters.',
  })
  counterpartyName?: string;

  @ApiPropertyOptional({
    description:
      'Updated counterparty contact. Send an empty string to clear it.',
    example: '+250788000000',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, {
    message: 'Counterparty contact must not exceed 120 characters.',
  })
  counterpartyContact?: string;

  @ApiPropertyOptional({
    description: 'Updated loan amount in the selected currency.',
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
    enum: Currency,
    example: Currency.USD,
    description: 'Updated currency for the loan amount.',
  })
  @IsOptional()
  @IsEnum(Currency, {
    message: 'Currency must be a valid currency.',
  })
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Updated issued date.',
    example: '2026-04-02T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  issuedDate?: string;

  @ApiPropertyOptional({
    description: 'Updated due date. Send an empty string to clear it.',
    example: '2026-05-15T00:00:00.000Z',
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsISO8601({}, { message: 'Due date must be a valid ISO 8601 timestamp.' })
  dueDate?: string;

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
