import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  LoanBalanceEffect,
  LoanTransactionType,
} from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';
import { LoanLinkedExpenseResponseDto } from './loan-linked-expense.response.dto';
import { LoanLinkedIncomeResponseDto } from './loan-linked-income.response.dto';

export class LoanTransactionResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({ example: 'd329f75e-5845-4b38-bb07-3fc17b5f77e6' })
  loanId!: string;

  @ApiProperty({
    enum: LoanTransactionType,
    example: LoanTransactionType.DISBURSEMENT,
  })
  type!: LoanTransactionType;

  @ApiProperty({
    enum: LoanBalanceEffect,
    example: LoanBalanceEffect.INCREASE,
  })
  balanceEffect!: LoanBalanceEffect;

  @ApiProperty({ example: 250000 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 250000 })
  amountRwf!: number;

  @ApiProperty({ example: 250000 })
  principalAmount!: number;

  @ApiProperty({ example: 250000 })
  principalAmountRwf!: number;

  @ApiProperty({ example: 0 })
  interestAmount!: number;

  @ApiProperty({ example: 0 })
  interestAmountRwf!: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Initial borrowed disbursement',
    nullable: true,
  })
  note!: string | null;

  @ApiPropertyOptional({
    example: '64173d0e-5a3e-450d-8a1f-585d7f4425ae',
    nullable: true,
  })
  reversalOfTransactionId!: string | null;

  @ApiPropertyOptional({
    type: LoanLinkedExpenseResponseDto,
    nullable: true,
  })
  linkedExpense!: LoanLinkedExpenseResponseDto | null;

  @ApiPropertyOptional({
    type: LoanLinkedIncomeResponseDto,
    nullable: true,
  })
  linkedIncome!: LoanLinkedIncomeResponseDto | null;

  @ApiProperty({ type: CreatedByResponseDto })
  recordedBy!: CreatedByResponseDto;

  @ApiProperty({ example: '2026-05-01T10:15:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-01T10:15:00.000Z' })
  updatedAt!: Date;
}
