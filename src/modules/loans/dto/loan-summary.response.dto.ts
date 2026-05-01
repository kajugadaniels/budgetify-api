import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanDirection, LoanStatus } from '@prisma/client';

export class LoanDirectionExposureDto {
  @ApiProperty({ enum: LoanDirection, example: LoanDirection.BORROWED })
  direction!: LoanDirection;

  @ApiProperty({ example: 4 })
  loanCount!: number;

  @ApiProperty({ example: 1250000 })
  originalPrincipalRwf!: number;

  @ApiProperty({ example: 720000 })
  principalOutstandingRwf!: number;

  @ApiProperty({ example: 85000 })
  interestOutstandingRwf!: number;

  @ApiProperty({ example: 805000 })
  totalOutstandingRwf!: number;
}

export class LoanStatusBreakdownDto {
  @ApiProperty({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  status!: LoanStatus;

  @ApiProperty({ example: 3 })
  loanCount!: number;

  @ApiProperty({ example: 430000 })
  totalOutstandingRwf!: number;
}

export class LoanSummaryLatestTransactionDto {
  @ApiProperty({ example: '5a558c2f-f48e-4cc7-8fd0-0c489d34d79e' })
  id!: string;

  @ApiProperty({ example: 'Family support loan' })
  loanLabel!: string;

  @ApiProperty({ example: 75000 })
  amountRwf!: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  date!: Date;
}

export class LoanSummaryResponseDto {
  @ApiProperty({ example: 9 })
  totalLoanCount!: number;

  @ApiProperty({ example: 5 })
  activeLoanCount!: number;

  @ApiProperty({ example: 2 })
  settledLoanCount!: number;

  @ApiProperty({ example: 2 })
  overdueLoanCount!: number;

  @ApiProperty({ example: 1250000 })
  borrowedOutstandingRwf!: number;

  @ApiProperty({ example: 940000 })
  lentOutstandingRwf!: number;

  @ApiProperty({ example: 115000 })
  interestPayableOutstandingRwf!: number;

  @ApiProperty({ example: 75000 })
  interestReceivableOutstandingRwf!: number;

  @ApiProperty({ example: 330000 })
  repaymentsThisPeriodRwf!: number;

  @ApiProperty({ example: 22000 })
  interestEarnedThisPeriodRwf!: number;

  @ApiProperty({ example: 18000 })
  interestPaidThisPeriodRwf!: number;

  @ApiProperty({ example: 6 })
  linkedExpenseCount!: number;

  @ApiProperty({ example: 4 })
  linkedIncomeCount!: number;

  @ApiProperty({ example: 3 })
  reversedTransactionCount!: number;

  @ApiProperty({ type: LoanDirectionExposureDto, isArray: true })
  exposureByDirection!: LoanDirectionExposureDto[];

  @ApiProperty({ type: LoanStatusBreakdownDto, isArray: true })
  statusBreakdown!: LoanStatusBreakdownDto[];

  @ApiPropertyOptional({
    type: LoanSummaryLatestTransactionDto,
    nullable: true,
  })
  latestTransaction!: LoanSummaryLatestTransactionDto | null;
}
