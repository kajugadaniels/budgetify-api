import {
  ReceivedTransactionClassification,
  TransactionCategory,
  TransactionTransferType,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionCategoryAnalyticsResponseDto {
  @ApiProperty({
    enum: TransactionCategory,

    example: TransactionCategory.TRANSPORT,
  })
  category!: TransactionCategory;

  @ApiProperty({
    example: 90000,
  })
  sentAmount!: number;

  @ApiProperty({
    example: 700,
  })
  feesPaid!: number;

  @ApiProperty({
    example: 90700,
  })
  totalDebited!: number;

  @ApiProperty({
    example: 6,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed outgoing transfer principal represented by this category.',

    example: 18.56,
  })
  percentage!: number;
}

export class TransactionTransferTypeAnalyticsResponseDto {
  @ApiProperty({
    enum: TransactionTransferType,

    example: TransactionTransferType.MOMO_TO_MOMO,
  })
  transferType!: TransactionTransferType;

  @ApiProperty({
    example: 350000,
  })
  sentAmount!: number;

  @ApiProperty({
    example: 4500,
  })
  feesPaid!: number;

  @ApiProperty({
    example: 354500,
  })
  totalDebited!: number;

  @ApiProperty({
    example: 12,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed outgoing transfer principal represented by this transfer type.',

    example: 72.16,
  })
  percentage!: number;
}

export class ReceivedTransactionClassificationAnalyticsResponseDto {
  @ApiProperty({
    enum: ReceivedTransactionClassification,

    example: ReceivedTransactionClassification.REIMBURSEMENT,
  })
  classification!: ReceivedTransactionClassification;

  @ApiProperty({
    example: 85000,
  })
  receivedAmount!: number;

  @ApiProperty({
    example: 3,
  })
  transactions!: number;

  @ApiProperty({
    description:
      'Share of completed received money represented by this classification.',

    example: 36.17,
  })
  percentage!: number;
}
