import { ApiProperty } from '@nestjs/swagger';
import { Currency, IncomeCategory } from '@prisma/client';

export class LoanLinkedIncomeResponseDto {
  @ApiProperty({ example: '4cc8d7ab-70db-4420-87f9-bf7caef3d2f2' })
  id!: string;

  @ApiProperty({ example: 'Loan repayment received from Alice' })
  label!: string;

  @ApiProperty({ example: 90000 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 90000 })
  amountRwf!: number;

  @ApiProperty({ enum: IncomeCategory, example: IncomeCategory.LOAN_RECOVERY })
  category!: IncomeCategory;

  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: '2026-05-04T00:00:00.000Z' })
  date!: Date;
}
