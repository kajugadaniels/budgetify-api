import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateMobileMoneyTariffRequestDto {
  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyProvider,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyProvider)
  provider?: ExpenseMobileMoneyProvider;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyChannel)
  channel?: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    enum: ExpenseMobileMoneyNetwork,
    nullable: true,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyNetwork)
  network?: ExpenseMobileMoneyNetwork | null;

  @ApiPropertyOptional({ example: 1001 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  feeAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
