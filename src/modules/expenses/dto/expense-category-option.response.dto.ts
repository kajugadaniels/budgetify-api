import { ExpenseCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ExpenseCategoryOptionResponseDto {
  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD_DINING,
  })
  value!: ExpenseCategory;

  @ApiProperty({
    example: 'Food and dining',
  })
  label!: string;
}
