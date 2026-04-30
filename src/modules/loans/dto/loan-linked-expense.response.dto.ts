import { ApiProperty } from '@nestjs/swagger';
import { Currency, ExpenseCategory } from '@prisma/client';

export class LoanLinkedExpenseResponseDto {
  @ApiProperty({ example: '7c691e62-8fbb-4c0f-9bd0-c70f99a02f2d' })
  id!: string;

  @ApiProperty({ example: 'Loan repayment to Mama Alice' })
  label!: string;

  @ApiProperty({ example: 75000 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 75000 })
  amountRwf!: number;

  @ApiProperty({ example: 75000 })
  totalAmountRwf!: number;

  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.LOAN })
  category!: ExpenseCategory;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  date!: Date;
}
