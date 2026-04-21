import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
  ExpensePaymentMethod,
} from '@prisma/client';
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

export class CreateExpenseRequestDto {
  @ApiProperty({
    description: 'Human-readable description of the expense.',
    example: 'Kigali Market groceries',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredLabel(value))
  @IsString()
  @IsNotEmpty({ message: 'Label is required.' })
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label!: string;

  @ApiProperty({
    description: 'Expense amount in RWF.',
    example: 12500,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Currency used for the recipient/base expense amount.',
    enum: Currency,
    example: Currency.RWF,
    default: Currency.RWF,
  })
  @IsOptional()
  @IsEnum(Currency, {
    message: 'Currency must be a supported currency.',
  })
  currency?: Currency;

  @ApiProperty({
    description: 'Expense category selected from the client application.',
    enum: ExpenseCategory,
    enumName: 'ExpenseCategory',
    example: ExpenseCategory.FOOD_DINING,
  })
  @IsEnum(ExpenseCategory, {
    message: 'Category must be a valid expense category.',
  })
  category!: ExpenseCategory;

  @ApiPropertyOptional({
    description: 'How the expense was paid.',
    enum: ExpensePaymentMethod,
    example: ExpensePaymentMethod.CASH,
    default: ExpensePaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod, {
    message: 'Payment method must be valid.',
  })
  paymentMethod?: ExpensePaymentMethod;

  @ApiPropertyOptional({
    description:
      'Mobile money payment channel when paymentMethod is MOBILE_MONEY.',
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyChannel, {
    message: 'Mobile money channel must be valid.',
  })
  mobileMoneyChannel?: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    description: 'Mobile money provider when paymentMethod is MOBILE_MONEY.',
    enum: ExpenseMobileMoneyProvider,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyProvider, {
    message: 'Mobile money provider must be valid.',
  })
  mobileMoneyProvider?: ExpenseMobileMoneyProvider;

  @ApiPropertyOptional({
    description:
      'Mobile money network classification when paymentMethod is MOBILE_MONEY and channel is P2P_TRANSFER.',
    enum: ExpenseMobileMoneyNetwork,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyNetwork, {
    message: 'Mobile money network must be valid.',
  })
  mobileMoneyNetwork?: ExpenseMobileMoneyNetwork;

  @ApiProperty({
    description: 'Date the expense was incurred or recorded.',
    example: '2026-03-28T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text note for additional context.',
    example: 'Weekly grocery run — vegetables and dairy',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalNote(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
