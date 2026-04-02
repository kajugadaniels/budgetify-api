import { ApiPropertyOptional } from '@nestjs/swagger';
import { TodoFrequency, TodoPriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

import {
  normalizeOptionalBoolean,
  normalizeOptionalString,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';

export class ListTodosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: TodoFrequency,
    example: TodoFrequency.ONCE,
    description:
      'Optional todo frequency filter. Legacy empty frequency values are treated as ONCE.',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsEnum(TodoFrequency, {
    message: 'Frequency must be a valid todo frequency.',
  })
  frequency?: TodoFrequency;

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
