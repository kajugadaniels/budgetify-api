import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { normalizeOptionalInteger } from '../../../common/dto/pagination-query.dto';
import { ListTodosQueryDto } from './list-todos.query.dto';

export class TodoUpcomingQueryDto extends OmitType(ListTodosQueryDto, [
  'page',
  'limit',
] as const) {
  @ApiPropertyOptional({
    description:
      'How many upcoming calendar days to include, starting from today.',
    example: 7,
    minimum: 1,
    maximum: 30,
    default: 7,
  })
  @Transform(({ value }) => normalizeOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: 'days must be a whole number.' })
  @Min(1, { message: 'days must be at least 1.' })
  @Max(30, { message: 'days must be at most 30.' })
  days?: number;
}
