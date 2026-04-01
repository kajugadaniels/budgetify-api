import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaResponseDto } from '../../../common/dto/pagination-meta.response.dto';
import { IncomeResponseDto } from './income-response.dto';

export class PaginatedIncomeResponseDto {
  @ApiProperty({ type: IncomeResponseDto, isArray: true })
  items!: IncomeResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;
}
