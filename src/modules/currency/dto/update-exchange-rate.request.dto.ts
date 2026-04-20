import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

function normalizeRate(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();

    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

export class UpdateExchangeRateRequestDto {
  @ApiProperty({
    example: 1460,
    description: 'Number of RWF for 1 USD.',
  })
  @Transform(({ value }) => normalizeRate(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Rate must be a valid number.' },
  )
  @Min(1, { message: 'Rate must be at least 1 RWF per USD.' })
  rate!: number;
}
