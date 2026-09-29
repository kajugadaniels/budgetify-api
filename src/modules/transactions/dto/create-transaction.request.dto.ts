import {
  TransactionCategory,
  TransactionRecipientType,
  TransactionTransferType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import {
  MAX_TRANSACTION_AMOUNT_RWF,
  MIN_TRANSACTION_AMOUNT_RWF,
} from '../transaction-tariffs';

function normalizeRecipientIdentifier(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/[\s()-]/g, '');
}

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class CreateTransactionRequestDto {
  @ApiProperty({
    description: 'Whole-number amount to send in Rwandan francs.',
    example: 25_000,
    minimum: MIN_TRANSACTION_AMOUNT_RWF,
    maximum: MAX_TRANSACTION_AMOUNT_RWF,
  })
  @Type(() => Number)
  @IsInt({ message: 'Amount must be a whole number of RWF.' })
  @Min(MIN_TRANSACTION_AMOUNT_RWF)
  @Max(MAX_TRANSACTION_AMOUNT_RWF)
  amount!: number;

  @ApiProperty({
    enum: TransactionTransferType,
  })
  @IsEnum(TransactionTransferType)
  transferType!: TransactionTransferType;

  @ApiProperty({
    enum: TransactionRecipientType,
  })
  @IsEnum(TransactionRecipientType)
  recipientType!: TransactionRecipientType;

  @ApiProperty({
    enum: TransactionCategory,
  })
  @IsEnum(TransactionCategory)
  category!: TransactionCategory;

  @ApiProperty({
    description:
      'Recipient Rwanda phone number, numeric bank account, or MoMo merchant code.',
    example: '+250788123456',
  })
  @Transform(({ value }) => normalizeRecipientIdentifier(value))
  @IsString()
  @Matches(/^\+?\d{3,34}$/, {
    message:
      'Receiver identifier must be a valid phone number, bank account, or MoMo code.',
  })
  receiverIdentifier!: string;

  @ApiPropertyOptional({
    description: 'Optional payment note.',
    example: 'September transport',
    maxLength: 200,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({
    description:
      'Client-generated retry key. Reusing it returns the original transaction.',
    minLength: 16,
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(100)
  idempotencyKey?: string;
}
