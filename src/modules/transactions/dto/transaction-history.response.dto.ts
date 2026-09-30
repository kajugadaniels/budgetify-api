import {
  Currency,
  ReceivedTransactionClassification,
  ReceivedTransactionEvidenceSource,
  TransactionCategory,
  TransactionStatus,
  TransactionTransferType,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TransactionHistoryDirection } from '../transaction-history.types';

export class TransactionHistoryItemResponseDto {
  @ApiProperty({
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    enum: TransactionHistoryDirection,
  })
  direction!: TransactionHistoryDirection;

  @ApiProperty()
  reference!: string;

  @ApiProperty({
    enum: TransactionStatus,
  })
  status!: TransactionStatus;

  @ApiProperty({
    enum: Currency,
  })
  currency!: Currency;

  @ApiProperty()
  amount!: number;

  @ApiPropertyOptional({
    nullable: true,
  })
  feeAmount!: number | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  totalAmount!: number | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  counterpartyIdentifier!: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  counterpartyName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  providerReference!: string | null;

  @ApiPropertyOptional({
    enum: TransactionTransferType,
    nullable: true,
  })
  transferType!: TransactionTransferType | null;

  @ApiPropertyOptional({
    enum: TransactionCategory,
    nullable: true,
  })
  category!: TransactionCategory | null;

  @ApiPropertyOptional({
    enum: ReceivedTransactionClassification,
    nullable: true,
  })
  classification!: ReceivedTransactionClassification | null;

  @ApiPropertyOptional({
    enum: ReceivedTransactionEvidenceSource,
    nullable: true,
  })
  evidenceSource!: ReceivedTransactionEvidenceSource | null;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
  })
  processedAt!: Date | null;

  @ApiProperty({
    format: 'date-time',
    description:
      'Timestamp used to position this item in the combined money-history timeline.',
  })
  activityAt!: Date;

  @ApiProperty({
    format: 'date-time',
  })
  createdAt!: Date;
}

export class TransactionHistoryPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class TransactionHistoryResponseDto {
  @ApiProperty({
    type: [TransactionHistoryItemResponseDto],
  })
  items!: TransactionHistoryItemResponseDto[];

  @ApiProperty({
    type: TransactionHistoryPaginationResponseDto,
  })
  pagination!: TransactionHistoryPaginationResponseDto;
}
