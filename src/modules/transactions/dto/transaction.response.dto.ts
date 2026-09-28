import {
  Currency,
  TransactionCategory,
  TransactionRecipientType,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'BGT-MJ2V0E-Q1W2E3R4' })
  reference!: string;

  @ApiProperty({ enum: TransactionTransferType })
  transferType!: TransactionTransferType;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ enum: TransactionCategory })
  category!: TransactionCategory;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 25_000 })
  amount!: number;

  @ApiProperty({ example: 250 })
  feeAmount!: number;

  @ApiProperty({ example: 25_250 })
  totalAmount!: number;

  @ApiProperty({ enum: TransactionRecipientType })
  recipientType!: TransactionRecipientType;

  @ApiProperty({ example: '+250788123456' })
  receiverIdentifier!: string;

  @ApiPropertyOptional({ nullable: true, example: null })
  receiverName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiProperty({ example: 'MTN_RWANDA_2026-09-28' })
  tariffVersion!: string;

  @ApiProperty({ example: 'MTN_RWANDA_PUBLIC_TARIFF' })
  tariffSource!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
