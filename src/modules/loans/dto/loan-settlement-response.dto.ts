import { ApiProperty } from '@nestjs/swagger';

import { ExpenseResponseDto } from '../../expenses/dto/expense-response.dto';
import { LoanResponseDto } from './loan-response.dto';

export class LoanSettlementResponseDto {
  @ApiProperty({ type: LoanResponseDto })
  loan!: LoanResponseDto;

  @ApiProperty({ type: ExpenseResponseDto })
  expense!: ExpenseResponseDto;
}
