import { TransactionTransferType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

import {
  MAX_TRANSACTION_AMOUNT_RWF,
  MIN_TRANSACTION_AMOUNT_RWF,
} from '../transaction-tariffs';

export class TransactionQuoteRequestDto {
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
    example: TransactionTransferType.MOMO_TO_MOMO,
  })
  @IsEnum(TransactionTransferType)
  transferType!: TransactionTransferType;
}
