import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaResponseDto } from '../../../common/dto/pagination-meta.response.dto';
import { SavingResponseDto } from './saving-response.dto';

export class PaginatedSavingResponseDto {
  @ApiProperty({ type: SavingResponseDto, isArray: true })
  items!: SavingResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;
}
