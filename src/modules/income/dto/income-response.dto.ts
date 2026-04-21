import { ApiProperty } from '@nestjs/swagger';
import { Currency, IncomeCategory } from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';
import { IncomeAllocationStatus } from './income-allocation-status.enum';

export class IncomeResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Monthly Salary' })
  label!: string;

  @ApiProperty({ example: 450000 })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({
    example: 450000,
    description:
      'RWF value stored at the exchange rate used when the record was saved.',
  })
  amountRwf!: number;

  @ApiProperty({
    enum: IncomeCategory,
    example: IncomeCategory.SALARY,
  })
  category!: IncomeCategory;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({
    example: true,
    description: 'Whether this income has already been received.',
  })
  received!: boolean;

  @ApiProperty({
    example: 120000,
    description:
      'How much of this income has already been allocated into savings.',
  })
  allocatedToSavingsRwf!: number;

  @ApiProperty({
    example: 330000,
    description:
      'How much of this income is still free after savings allocations.',
  })
  remainingAvailableRwf!: number;

  @ApiProperty({
    enum: IncomeAllocationStatus,
    enumName: 'IncomeAllocationStatus',
    example: IncomeAllocationStatus.PARTIALLY_ALLOCATED,
  })
  allocationStatus!: IncomeAllocationStatus;

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;
}
