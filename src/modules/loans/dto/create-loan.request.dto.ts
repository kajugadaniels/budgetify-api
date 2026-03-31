import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
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

function normalizePaid(value: unknown): unknown {
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

export class CreateLoanRequestDto {
  @ApiProperty({
    description: 'Human-readable description of the loan.',
    example: 'Car repair advance',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredLabel(value))
  @IsString()
  @IsNotEmpty({ message: 'Label is required.' })
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label!: string;

  @ApiProperty({
    description: 'Loan amount in RWF.',
    example: 250000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiProperty({
    description: 'Date the loan was issued or recorded.',
    example: '2026-03-31T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiProperty({
    description: 'Whether the loan has already been fully paid.',
    example: false,
    default: false,
  })
  @Transform(({ value }) => normalizePaid(value))
  @IsBoolean({ message: 'Paid must be a valid boolean value.' })
  paid: boolean = false;

  @ApiPropertyOptional({
    description: 'Optional free-text note for additional context.',
    example: 'To be repaid after the next salary date',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
