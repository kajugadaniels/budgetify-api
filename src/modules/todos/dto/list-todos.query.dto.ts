import { ApiPropertyOptional } from '@nestjs/swagger';
import { TodoPriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

import {
  normalizeOptionalBoolean,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';

export class ListTodosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TodoPriority,
    example: TodoPriority.TOP_PRIORITY,
    description: 'Optional todo priority filter.',
  })
  @IsOptional()
  @IsEnum(TodoPriority, {
    message: 'Priority must be a valid todo priority.',
  })
  priority?: TodoPriority;

  @ApiPropertyOptional({
    description: 'Optional done-state filter.',
    example: false,
  })
  @Transform(({ value }) => normalizeOptionalBoolean(value))
  @IsOptional()
  done?: boolean;
}
