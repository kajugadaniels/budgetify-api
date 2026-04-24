import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, LoanDirection, LoanType } from '@prisma/client';

import { CreatedByResponseDto } from '../../../common/dto/created-by.response.dto';

export class LoanResponseDto {
  @ApiProperty({ example: '3e8063c6-714f-482e-8d2c-6b6771ce9e14' })
  id!: string;

  @ApiProperty({ example: 'Car repair advance' })
  label!: string;

  @ApiProperty({ enum: LoanDirection, example: LoanDirection.BORROWED })
  direction!: LoanDirection;

  @ApiProperty({ enum: LoanType, example: LoanType.FAMILY })
  type!: LoanType;

  @ApiProperty({ example: 'Alice Uwimana' })
  counterpartyName!: string;

  @ApiPropertyOptional({
    example: '+250788000000',
    nullable: true,
  })
  counterpartyContact!: string | null;

  @ApiProperty({ example: 250000 })
  amount!: number;

  @ApiProperty({ enum: Currency, example: Currency.RWF })
  currency!: Currency;

  @ApiProperty({ example: 250000 })
  amountRwf!: number;

  @ApiProperty({ example: '2026-03-31T00:00:00.000Z' })
  issuedDate!: Date;

  @ApiPropertyOptional({
    example: '2026-04-30T00:00:00.000Z',
    nullable: true,
  })
  dueDate!: Date | null;

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

  @ApiProperty({ type: CreatedByResponseDto })
  createdBy!: CreatedByResponseDto;
}
