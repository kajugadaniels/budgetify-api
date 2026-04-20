import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';

export class SavingResponseDto {
  @ApiProperty({ example: '97bcc638-92b6-4209-a90f-7c10ec6a3a85' })
  id!: string;

  @ApiProperty({ example: 'Emergency fund transfer' })
  label!: string;

  @ApiProperty({ example: 350 })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({
    example: 350000,
    description:
      'RWF value stored at the exchange rate used when the record was saved.',
  })
  amountRwf!: number;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Transferred to the USD reserve account',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({
    example: true,
    description: 'Whether this saving is still currently available.',
  })
  stillHave!: boolean;

  @ApiProperty({ example: '2026-04-01T10:15:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-01T10:15:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;
}
