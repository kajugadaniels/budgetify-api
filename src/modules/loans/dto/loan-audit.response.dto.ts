import { ApiProperty } from '@nestjs/swagger';

import {
  LoanDirectionExposureDto,
  LoanStatusBreakdownDto,
} from './loan-summary.response.dto';

export class LoanAuditResponseDto {
  @ApiProperty({ example: '2026-05-01', nullable: true })
  periodStartDate!: string | null;

  @ApiProperty({ example: '2026-05-31', nullable: true })
  periodEndDate!: string | null;

  @ApiProperty({ example: 9 })
  loanCount!: number;

  @ApiProperty({ example: 24 })
  transactionCount!: number;

  @ApiProperty({ example: 3 })
  reversedTransactionCount!: number;

  @ApiProperty({ example: 2200000 })
  originalPrincipalRwf!: number;

  @ApiProperty({ example: 980000 })
  principalRepaidRwf!: number;

  @ApiProperty({ example: 1220000 })
  principalOutstandingRwf!: number;

  @ApiProperty({ example: 210000 })
  interestChargedRwf!: number;

  @ApiProperty({ example: 96000 })
  interestPaidRwf!: number;

  @ApiProperty({ example: 114000 })
  interestOutstandingRwf!: number;

  @ApiProperty({ example: 1334000 })
  totalOutstandingRwf!: number;

  @ApiProperty({ example: 6 })
  linkedExpenseCount!: number;

  @ApiProperty({ example: 4 })
  linkedIncomeCount!: number;

  @ApiProperty({ example: 0 })
  unlinkedEligibleTransactionCount!: number;

  @ApiProperty({ type: LoanDirectionExposureDto, isArray: true })
  exposureByDirection!: LoanDirectionExposureDto[];

  @ApiProperty({ type: LoanStatusBreakdownDto, isArray: true })
  statusBreakdown!: LoanStatusBreakdownDto[];
}
