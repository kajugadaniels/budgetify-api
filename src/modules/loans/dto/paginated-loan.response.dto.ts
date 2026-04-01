import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaResponseDto } from '../../../common/dto/pagination-meta.response.dto';
import { LoanResponseDto } from './loan-response.dto';

export class PaginatedLoanResponseDto {
  @ApiProperty({ type: LoanResponseDto, isArray: true })
  items!: LoanResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;
}
