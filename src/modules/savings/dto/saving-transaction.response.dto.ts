import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  IncomeCategory,
  SavingTransactionType,
} from '@prisma/client';

export class SavingTransactionIncomeSourceResponseDto {
  @ApiProperty({ example: '6c0a749a-9202-4b30-a8ff-e8d60b9343a2' })
  id!: string;

  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  incomeId!: string;

  @ApiProperty({ example: 'Monthly Salary' })
  incomeLabel!: string;

  @ApiProperty({
    enum: IncomeCategory,
    enumName: 'IncomeCategory',
    example: IncomeCategory.SALARY,
  })
  incomeCategory!: IncomeCategory;

  @ApiProperty({ example: 100000 })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({
    example: 100000,
    description:
      'RWF value stored at the exchange rate used when the source was saved.',
  })
  amountRwf!: number;
}

export class SavingTransactionResponseDto {
  @ApiProperty({ example: '97bcc638-92b6-4209-a90f-7c10ec6a3a85' })
  id!: string;

  @ApiProperty({
    enum: SavingTransactionType,
    enumName: 'SavingTransactionType',
    example: SavingTransactionType.DEPOSIT,
  })
  type!: SavingTransactionType;

  @ApiProperty({ example: 150000 })
  amount!: number;

  @ApiProperty({
    enum: Currency,
    enumName: 'Currency',
    example: Currency.RWF,
  })
  currency!: Currency;

  @ApiProperty({ example: 150000 })
  amountRwf!: number;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Moved part of April salary to emergency fund',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({
    type: SavingTransactionIncomeSourceResponseDto,
    isArray: true,
  })
  incomeSources!: SavingTransactionIncomeSourceResponseDto[];

  @ApiProperty({ example: '2026-04-20T10:15:00.000Z' })
  createdAt!: Date;
}
