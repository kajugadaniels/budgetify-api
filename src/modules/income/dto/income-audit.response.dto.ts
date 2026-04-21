import { ApiProperty } from '@nestjs/swagger';

export class IncomeAuditResponseDto {
  @ApiProperty({ example: '2026-04-01' })
  periodStartDate!: string | null;

  @ApiProperty({ example: '2026-04-30' })
  periodEndDate!: string | null;

  @ApiProperty({ example: 1250000 })
  totalIncomeRwf!: number;

  @ApiProperty({ example: 980000 })
  receivedIncomeRwf!: number;

  @ApiProperty({ example: 270000 })
  pendingIncomeRwf!: number;

  @ApiProperty({ example: 220000 })
  allocatedToSavingsRwf!: number;

  @ApiProperty({ example: 60000 })
  savingWithdrawalsReturnedRwf!: number;

  @ApiProperty({ example: 540000 })
  totalExpensesRwf!: number;

  @ApiProperty({ example: 180000 })
  totalSavingsBalanceRwf!: number;

  @ApiProperty({ example: 260000 })
  availableMoneyNowRwf!: number;

  @ApiProperty({ example: 260000 })
  recomputedAvailableMoneyNowRwf!: number;

  @ApiProperty({ example: 0 })
  reconciliationDifferenceRwf!: number;

  @ApiProperty({ example: true })
  isBalanced!: boolean;
}
