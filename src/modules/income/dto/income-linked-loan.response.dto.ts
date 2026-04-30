import { ApiProperty } from '@nestjs/swagger';
import { LoanDirection, LoanStatus, LoanTransactionType } from '@prisma/client';

export class IncomeLinkedLoanResponseDto {
  @ApiProperty({ example: '2681c705-7412-4ee4-a2d4-4ff1d7dfeb8a' })
  loanId!: string;

  @ApiProperty({ example: 'Family loan with Alice' })
  loanLabel!: string;

  @ApiProperty({ enum: LoanDirection, example: LoanDirection.LENT })
  loanDirection!: LoanDirection;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.PARTIALLY_REPAID })
  loanStatus!: LoanStatus;

  @ApiProperty({ example: 'Alice' })
  counterpartyName!: string;

  @ApiProperty({ example: '489f75de-7d80-4e57-8b53-8204eaf6bbab' })
  transactionId!: string;

  @ApiProperty({
    enum: LoanTransactionType,
    example: LoanTransactionType.REPAYMENT,
  })
  transactionType!: LoanTransactionType;

  @ApiProperty({ example: '2026-05-04T00:00:00.000Z' })
  transactionDate!: Date;
}
