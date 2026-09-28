import { TransactionTransferType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class TransactionQuoteResponseDto {
  @ApiProperty({ enum: TransactionTransferType })
  transferType!: TransactionTransferType;

  @ApiProperty({ example: 'RWF' })
  currency!: 'RWF';

  @ApiProperty({ example: 25_000 })
  amount!: number;

  @ApiProperty({ example: 250 })
  feeAmount!: number;

  @ApiProperty({ example: 25_250 })
  totalAmount!: number;

  @ApiProperty({ example: 'MTN_RWANDA_2026-09-28' })
  tariffVersion!: string;

  @ApiProperty({ example: 'MTN_RWANDA_PUBLIC_TARIFF' })
  tariffSource!: string;
}
