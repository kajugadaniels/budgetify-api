import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaResponseDto } from '../../../common/dto/pagination-meta.response.dto';
import { TodoResponseDto } from './todo-response.dto';

export class PaginatedTodoResponseDto {
  @ApiProperty({ type: TodoResponseDto, isArray: true })
  items!: TodoResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  meta!: PaginationMetaResponseDto;
}
