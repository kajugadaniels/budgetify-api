import { ApiProperty } from '@nestjs/swagger';
import { IncomeCategory } from '@prisma/client';

export class IncomeResponseDto {
  @ApiProperty({ example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918' })
  id!: string;

  @ApiProperty({ example: 'Monthly Salary' })
  label!: string;

  @ApiProperty({ example: 450000 })
  amount!: number;

  @ApiProperty({
    enum: IncomeCategory,
    example: IncomeCategory.SALARY,
  })
  category!: IncomeCategory;

  @ApiProperty({ example: '2026-03-01T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-29T19:30:00.000Z' })
  updatedAt!: Date;
}
