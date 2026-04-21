import { ApiProperty } from '@nestjs/swagger';

export class IncomeSummaryResponseDto {
  @ApiProperty({ example: 1250000 })
  totalIncomeRwf!: number;

  @ApiProperty({ example: 980000 })
  receivedIncomeRwf!: number;

  @ApiProperty({ example: 270000 })
  pendingIncomeRwf!: number;

  @ApiProperty({ example: 540000 })
  totalExpensesRwf!: number;

  @ApiProperty({ example: 180000 })
  totalSavingsBalanceRwf!: number;

  @ApiProperty({ example: 260000 })
  availableMoneyNowRwf!: number;

  @ApiProperty({ example: 6 })
  totalIncomeCount!: number;

  @ApiProperty({ example: 4 })
  receivedIncomeCount!: number;

  @ApiProperty({ example: 2 })
  pendingIncomeCount!: number;
}
