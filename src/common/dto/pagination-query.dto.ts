import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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

export function normalizeOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
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

  @ApiPropertyOptional({
    description:
      'Optional text search. The backend only applies it when at least 3 characters are provided.',
    example: 'salary',
    maxLength: 100,
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsString({ message: 'Search must be a string.' })
  @MaxLength(100, { message: 'Search must not exceed 100 characters.' })
  search?: string;

  @ApiPropertyOptional({
    description:
      'Optional inclusive start date filter applied against the entity date field selected by the user.',
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
      'Optional inclusive end date filter applied against the entity date field selected by the user.',
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
