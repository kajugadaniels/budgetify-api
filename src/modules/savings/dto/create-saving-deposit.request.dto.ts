import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
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

export class SavingDepositIncomeSourceRequestDto {
  @ApiProperty({
    description: 'Income record that funded part of this saving deposit.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Income id must be a valid UUID.' })
  incomeId!: string;

  @ApiProperty({
    description: 'Amount taken from this income in the selected currency.',
    example: 100000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Source amount must be a valid number.' },
  )
  @Min(0.01, { message: 'Source amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    description:
      'Currency for this source amount. RWF is used when currency is omitted.',
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
    default: Currency.RWF,
  })
  @IsEnum(Currency, {
    message: 'Source currency must be either RWF or USD.',
  })
  currency: Currency = Currency.RWF;
}

export class CreateSavingDepositRequestDto {
  @ApiProperty({
    description:
      'Deposit amount in the selected currency. The source amounts must equal this amount after conversion to RWF.',
    example: 150000,
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
      'Currency for the deposit amount. RWF is used when currency is omitted.',
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
    description: 'Date the deposit was made.',
    example: '2026-04-20T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text note for this deposit.',
    example: 'Moved part of April salary to emergency fund',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Note must not be empty.' })
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;

  @ApiProperty({
    description: 'Income records that funded this saving deposit.',
    type: SavingDepositIncomeSourceRequestDto,
    isArray: true,
  })
  @IsArray({ message: 'Income sources must be an array.' })
  @ArrayMinSize(1, {
    message: 'Provide at least one income source for the deposit.',
  })
  @ValidateNested({ each: true })
  @Type(() => SavingDepositIncomeSourceRequestDto)
  incomeSources!: SavingDepositIncomeSourceRequestDto[];
}
