import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpenseMobileMoneyProvider,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

function normalizeAmount(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();

    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

export class MobileMoneyQuoteRequestDto {
  @ApiProperty({
    description: 'Recipient amount before mobile money fees are applied.',
    example: 5000,
  })
  @Transform(({ value }) => normalizeAmount(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Amount must be a valid number.' },
  )
  @Min(1, { message: 'Amount must be greater than zero.' })
  amount!: number;

  @ApiPropertyOptional({
    description: 'Currency used for the recipient amount.',
    enum: Currency,
    example: Currency.RWF,
    default: Currency.RWF,
  })
  @IsOptional()
  @IsEnum(Currency, {
    message: 'Currency must be a supported currency.',
  })
  currency?: Currency;

  @ApiProperty({
    description: 'Mobile money provider used for the payment.',
    enum: ExpenseMobileMoneyProvider,
    example: ExpenseMobileMoneyProvider.MTN_RWANDA,
  })
  @IsEnum(ExpenseMobileMoneyProvider, {
    message: 'Mobile money provider must be valid.',
  })
  mobileMoneyProvider!: ExpenseMobileMoneyProvider;

  @ApiProperty({
    description: 'Mobile money payment channel.',
    enum: ExpenseMobileMoneyChannel,
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  @IsEnum(ExpenseMobileMoneyChannel, {
    message: 'Mobile money channel must be valid.',
  })
  mobileMoneyChannel!: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    description:
      'Network classification required for person-to-person transfers.',
    enum: ExpenseMobileMoneyNetwork,
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyNetwork, {
    message: 'Mobile money network must be valid.',
  })
  mobileMoneyNetwork?: ExpenseMobileMoneyNetwork;
}
