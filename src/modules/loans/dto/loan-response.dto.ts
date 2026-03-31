import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoanResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({ example: 'Car repair advance' })
  label!: string;

  @ApiProperty({ example: 250000 })
  amount!: number;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  date!: Date;

  @ApiProperty({
    example: false,
    description: 'Whether the loan has already been fully paid.',
  })
  paid!: boolean;

  @ApiPropertyOptional({
    example: 'To be repaid after the next salary date',
    nullable: true,
  })
  note!: string | null;

  @ApiProperty({ example: '2026-03-31T10:15:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-03-31T10:15:00.000Z' })
  updatedAt!: Date;
}
