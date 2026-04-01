import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  normalizeOptionalBoolean,
  normalizeOptionalInteger,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';

export class ListLoansQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Month number used to filter recorded loan dates.',
    example: 3,
    minimum: 1,
    maximum: 12,
  })
  @Transform(({ value }) => normalizeOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: 'Month must be a whole number.' })
  @Min(1, { message: 'Month must be between 1 and 12.' })
  @Max(12, { message: 'Month must be between 1 and 12.' })
  month?: number;

  @ApiPropertyOptional({
    description: 'Calendar year used to filter recorded loan dates.',
    example: 2026,
    minimum: 2000,
    maximum: 2100,
  })
  @Transform(({ value }) => normalizeOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: 'Year must be a whole number.' })
  @Min(2000, { message: 'Year must be between 2000 and 2100.' })
  @Max(2100, { message: 'Year must be between 2000 and 2100.' })
  year?: number;

  @ApiPropertyOptional({
    description: 'Optional paid-state filter.',
    example: false,
  })
  @Transform(({ value }) => normalizeOptionalBoolean(value))
  @IsOptional()
  paid?: boolean;
}
