import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  normalizeOptionalInteger,
  normalizeOptionalString,
} from '../../../common/dto/pagination-query.dto';

export class IncomeSummaryQueryDto {
  @ApiPropertyOptional({
    description:
      'Month number used to filter recorded dates for the income summary.',
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
    description:
      'Calendar year used to filter recorded dates for the income summary.',
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
    description:
      'Optional inclusive start date filter applied against recorded dates. Overrides month/year filtering when provided.',
    example: '2026-04-01',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateFrom must be a valid ISO date string (YYYY-MM-DD).' },
  )
  dateFrom?: string;

  @ApiPropertyOptional({
    description:
      'Optional inclusive end date filter applied against recorded dates. Overrides month/year filtering when provided.',
    example: '2026-04-30',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsDateString(
    {},
    { message: 'dateTo must be a valid ISO date string (YYYY-MM-DD).' },
  )
  dateTo?: string;
}
