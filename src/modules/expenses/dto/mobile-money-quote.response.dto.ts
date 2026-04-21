import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
} from '@prisma/client';

export class MobileMoneyQuoteResponseDto {
  @ApiProperty({ example: 5000 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 5000 })
  amountRwf!: number;

  @ApiProperty({ example: 100 })
  feeAmount!: number;

  @ApiProperty({ example: 100 })
  feeAmountRwf!: number;

  @ApiProperty({ example: 5100 })
  totalAmountRwf!: number;

  @ApiProperty({
    enum: ExpenseMobileMoneyProvider,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  mobileMoneyProvider!: ExpenseMobileMoneyProvider;

  @ApiProperty({
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  mobileMoneyChannel!: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    nullable: true,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  mobileMoneyNetwork!: ExpenseMobileMoneyNetwork | null;
}
