import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaResponseDto } from '../../../common/dto/pagination-meta.response.dto';
import { ExpenseResponseDto } from './expense-response.dto';

export class PaginatedExpenseResponseDto {
  @ApiProperty({ type: ExpenseResponseDto, isArray: true })
  items!: ExpenseResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;
}
