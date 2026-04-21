import { ApiProperty } from '@nestjs/swagger';

export class ExpenseAuditResponseDto {
  @ApiProperty({ example: '2026-04-01' })
  periodStartDate!: string | null;

  @ApiProperty({ example: '2026-04-30' })
  periodEndDate!: string | null;

  @ApiProperty({ example: 420000 })
  totalBaseExpensesRwf!: number;

  @ApiProperty({ example: 6200 })
  totalPaymentFeesRwf!: number;

  @ApiProperty({ example: 426200 })
  totalChargedExpensesRwf!: number;

  @ApiProperty({ example: 12 })
  expenseCount!: number;

  @ApiProperty({ example: 4 })
  feeBearingExpenseCount!: number;

  @ApiProperty({ example: 610000 })
  availableMoneyBeforeExpensesRwf!: number;

  @ApiProperty({ example: 183800 })
  availableMoneyAfterExpensesRwf!: number;

  @ApiProperty({ example: 183800 })
  recomputedAvailableMoneyAfterExpensesRwf!: number;

  @ApiProperty({ example: 0 })
  reconciliationDifferenceRwf!: number;

  @ApiProperty({ example: true })
  isBalanced!: boolean;
}
