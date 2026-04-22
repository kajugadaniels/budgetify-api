import { ApiPropertyOptional } from '@nestjs/swagger';
import { TodoFrequency, TodoPriority, TodoStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

import {
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
    enum: TodoStatus,
    example: TodoStatus.ACTIVE,
    description: 'Optional lifecycle status filter.',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? undefined : normalized.toUpperCase();
  })
  @IsOptional()
  @IsEnum(TodoStatus, {
    message: 'Status must be a valid todo status.',
  })
  status?: TodoStatus;
}
