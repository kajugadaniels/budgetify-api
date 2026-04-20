import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

export class ExchangeRateResponseDto {
  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.USD,
  })
  baseCurrency!: Currency;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  targetCurrency!: Currency;

  @ApiProperty({
    example: 1460,
    description: 'Number of RWF for 1 USD.',
  })
  rate!: number;

  @ApiProperty({
    example: '2026-04-20T12:00:00.000Z',
    nullable: true,
  })
  updatedAt!: Date | null;
}
