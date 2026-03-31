import { IncomeCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class IncomeCategoryOptionResponseDto {
  @ApiProperty({
    enum: IncomeCategory,
    enumName: 'IncomeCategory',
    example: IncomeCategory.SALARY,
  })
  value!: IncomeCategory;

  @ApiProperty({
    example: 'Salary',
  })
  label!: string;
}
