import { ApiProperty } from '@nestjs/swagger';
import { Currency, IncomeCategory } from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';

export class IncomeSavingAllocationResponseDto {
  @ApiProperty({ example: '3f6bc2c5-1044-4302-a9f2-5929652ef1ca' })
  id!: string;

  @ApiProperty({ example: 'e5df0835-bf29-4bc2-b7dd-0c1fd5038b9e' })
  savingId!: string;

  @ApiProperty({ example: 'Emergency fund' })
  savingLabel!: string;

  @ApiProperty({ example: '97bcc638-92b6-4209-a90f-7c10ec6a3a85' })
  transactionId!: string;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  transactionDate!: Date;

  @ApiProperty({ example: 100000 })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({ example: 100000 })
  amountRwf!: number;

  @ApiProperty({
    example: 'Moved part of April salary to emergency fund',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({
    example: true,
    description:
      'Whether this saving allocation has already been structurally reversed.',
  })
  isReversed!: boolean;

  @ApiProperty({
    example: false,
    description:
      'Whether this allocation row comes from a reversal transaction.',
  })
  isReversal!: boolean;

  @ApiProperty({
    example: '11111111-92b6-4209-a90f-7c10ec6a3a85',
    nullable: true,
  })
  reversedByTransactionId!: string | null;
}

export class IncomeDetailResponseDto {
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

  @ApiProperty({ example: 450000 })
  amountRwf!: number;

  @ApiProperty({
    enum: IncomeCategory,
    enumName: 'IncomeCategory',
    example: IncomeCategory.SALARY,
  })
  category!: IncomeCategory;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: 120000 })
  allocatedToSavingsRwf!: number;

  @ApiProperty({ example: 330000 })
  remainingAvailableRwf!: number;

  @ApiProperty({ example: 2 })
  allocationCount!: number;

  @ApiProperty({
    type: IncomeSavingAllocationResponseDto,
    isArray: true,
  })
  savingAllocations!: IncomeSavingAllocationResponseDto[];

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;
}
