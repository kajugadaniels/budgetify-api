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

  @ApiPropertyOptional({
    example: 1000000,
    nullable: true,
    description:
      'Target amount for the saving bucket in the selected currency.',
  })
  targetAmount!: number | null;

  @ApiPropertyOptional({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
    nullable: true,
  })
  targetCurrency!: Currency | null;

  @ApiPropertyOptional({
    example: 1000000,
    nullable: true,
    description:
      'RWF value stored at the exchange rate used when the target amount was saved.',
  })
  targetAmountRwf!: number | null;

  @ApiPropertyOptional({
    example: '2026-04-21',
    nullable: true,
    description: 'Saving timeframe start date.',
  })
  startDate!: string | null;

  @ApiPropertyOptional({
    example: '2027-04-21',
    nullable: true,
    description: 'Saving timeframe end date.',
  })
  endDate!: string | null;

  @ApiPropertyOptional({
    example: 365,
    nullable: true,
    description: 'Number of days between the saving start and end dates.',
  })
  timeframeDays!: number | null;

  @ApiPropertyOptional({
    example: 35,
    nullable: true,
    description: 'Progress toward the target saving amount, clamped to 0-100.',
  })
  targetProgressPercentage!: number | null;

  @ApiPropertyOptional({
    example: 12,
    nullable: true,
    description:
      'Elapsed timeframe percentage between the saving start and end dates, clamped to 0-100.',
  })
  timeframeProgressPercentage!: number | null;

  @ApiProperty({
    example: 350000,
    description: 'Total active deposit transactions for this saving in RWF.',
  })
  totalDepositedRwf!: number;

  @ApiProperty({
    example: 0,
    description: 'Total active withdrawal transactions for this saving in RWF.',
  })
  totalWithdrawnRwf!: number;

  @ApiProperty({
    example: 350000,
    description:
      'Current saving balance in RWF, calculated from active ledger transactions.',
  })
  currentBalanceRwf!: number;

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
