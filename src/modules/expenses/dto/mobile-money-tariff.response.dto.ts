import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
} from '@prisma/client';

export class MobileMoneyTariffResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({
    enum: ExpenseMobileMoneyProvider,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  provider!: ExpenseMobileMoneyProvider;

  @ApiProperty({
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  channel!: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    nullable: true,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  network!: ExpenseMobileMoneyNetwork | null;

  @ApiProperty({ example: 1001 })
  minAmount!: number;

  @ApiProperty({ example: 10000 })
  maxAmount!: number;

  @ApiProperty({ example: 100 })
  feeAmount!: number;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ example: '2026-04-21T09:42:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-21T09:42:00.000Z' })
  updatedAt!: Date;
}
