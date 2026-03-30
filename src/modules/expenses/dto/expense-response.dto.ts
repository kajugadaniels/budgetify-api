import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class ExpenseResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({ example: 'Kigali Market groceries' })
  label!: string;

  @ApiProperty({ example: 12500 })
  amount!: number;

  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.FOOD_DINING,
  })
  category!: ExpenseCategory;

  @ApiProperty({ example: '2026-03-28T00:00:00.000Z' })
  date!: Date;

  @ApiPropertyOptional({
    example: 'Weekly grocery run — vegetables and dairy',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({ example: '2026-03-28T10:15:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-28T10:15:00.000Z' })
  updatedAt!: Date;
}
