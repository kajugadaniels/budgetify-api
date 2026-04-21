import { ApiProperty } from '@nestjs/swagger';

export class ExpenseSummaryResponseDto {
  @ApiProperty({ example: 540000 })
  totalExpensesRwf!: number;

  @ApiProperty({ example: 12000 })
  totalFeesRwf!: number;

  @ApiProperty({ example: 552000 })
  totalChargedExpensesRwf!: number;

  @ApiProperty({ example: 46000 })
  averageExpenseRwf!: number;

  @ApiProperty({ example: 125000 })
  largestExpenseRwf!: number;

  @ApiProperty({ example: 980000 })
  availableMoneyNowRwf!: number;

  @ApiProperty({ example: 12 })
  expenseCount!: number;
}
