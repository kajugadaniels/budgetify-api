import { TransactionStatus, TransactionTransferType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { TransactionHistoryDirection } from '../transaction-history.types';

function normalizeSearch(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class ListTransactionHistoryQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    enum: TransactionHistoryDirection,
    description:
      'Omit direction to return both sent and received transactions.',
  })
  @IsOptional()
  @IsEnum(TransactionHistoryDirection)
  direction?: TransactionHistoryDirection;

  @ApiPropertyOptional({
    enum: TransactionStatus,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    enum: TransactionTransferType,
    description: 'Transfer type applies to sent transactions only.',
  })
  @IsOptional()
  @IsEnum(TransactionTransferType)
  transferType?: TransactionTransferType;

  @ApiPropertyOptional({
    description:
      'Search recipient, sender, Budgetify reference, or provider reference.',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeSearch(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
