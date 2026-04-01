import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '../constants/pagination.constants';

export function normalizeOptionalInteger(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : Number(normalized);
}

export function normalizeOptionalBoolean(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.length === 0) {
    return undefined;
  }

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return value;
}

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '1-based page number.',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Transform(({ value }) => normalizeOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: 'Page must be a whole number.' })
  @Min(1, { message: 'Page must be at least 1.' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of records returned per page.',
    example: DEFAULT_PAGE_LIMIT,
    minimum: 1,
    maximum: MAX_PAGE_LIMIT,
    default: DEFAULT_PAGE_LIMIT,
  })
  @Transform(({ value }) => normalizeOptionalInteger(value))
  @IsOptional()
  @IsInt({ message: 'Limit must be a whole number.' })
  @Min(1, { message: 'Limit must be at least 1.' })
  @Max(MAX_PAGE_LIMIT, {
    message: `Limit must be at most ${MAX_PAGE_LIMIT}.`,
  })
  limit?: number;
}
