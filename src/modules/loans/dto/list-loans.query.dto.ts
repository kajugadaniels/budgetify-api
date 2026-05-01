import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { LoanDirection, LoanStatus, LoanType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import {
  normalizeOptionalInteger,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';

function normalizeOptionalNumber(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : Number(normalized);
}

export const LOAN_OPERATIONAL_FILTERS = [
  'DUE_SOON',
  'OVERDUE',
  'OUTSTANDING',
  'HAS_LINKED_EXPENSE',
  'HAS_LINKED_INCOME',
  'UNLINKED_ELIGIBLE',
  'HAS_INTEREST',
] as const;

export type LoanOperationalFilter = (typeof LOAN_OPERATIONAL_FILTERS)[number];

export const LOAN_SORT_OPTIONS = [
  'ISSUED_DESC',
  'ISSUED_ASC',
  'DUE_ASC',
  'DUE_DESC',
  'OUTSTANDING_DESC',
  'OUTSTANDING_ASC',
  'COUNTERPARTY_ASC',
  'LATEST_ACTIVITY_DESC',
] as const;

export type LoanSortOption = (typeof LOAN_SORT_OPTIONS)[number];

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
    enum: LoanDirection,
    example: LoanDirection.LENT,
    description: 'Optional borrowed-versus-lent filter.',
  })
  @IsOptional()
  @IsEnum(LoanDirection, {
    message: 'Direction must be BORROWED or LENT.',
  })
  direction?: LoanDirection;

  @ApiPropertyOptional({
    enum: LoanType,
    example: LoanType.FAMILY,
    description: 'Optional loan purpose or relationship filter.',
  })
  @IsOptional()
  @IsEnum(LoanType, {
    message: 'Type must be a valid loan type.',
  })
  type?: LoanType;

  @ApiPropertyOptional({
    enum: LoanStatus,
    example: LoanStatus.OVERDUE,
    description: 'Optional lifecycle status filter.',
  })
  @IsOptional()
  @IsEnum(LoanStatus, {
    message: 'Status must be a valid loan lifecycle value.',
  })
  status?: LoanStatus;

  @ApiPropertyOptional({
    enum: LOAN_OPERATIONAL_FILTERS,
    example: 'UNLINKED_ELIGIBLE',
    description:
      'Optional operational filter for due, outstanding, linked, and action-needed loan states.',
  })
  @IsOptional()
  @IsIn(LOAN_OPERATIONAL_FILTERS, {
    message: 'Operational filter must be a valid loan operational state.',
  })
  operationalFilter?: LoanOperationalFilter;

  @ApiPropertyOptional({
    enum: LOAN_SORT_OPTIONS,
    example: 'OUTSTANDING_DESC',
    description:
      'Optional sort order. Derived sorts use current loan balances and latest ledger activity.',
  })
  @IsOptional()
  @IsIn(LOAN_SORT_OPTIONS, {
    message: 'Sort option must be a valid loan sort value.',
  })
  sortBy?: LoanSortOption;

  @ApiPropertyOptional({
    description: 'Minimum current outstanding balance in RWF.',
    example: 25000,
    minimum: 0,
  })
  @Transform(({ value }) => normalizeOptionalNumber(value))
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Minimum outstanding balance must be a number.' },
  )
  @Min(0, { message: 'Minimum outstanding balance must be at least 0.' })
  minOutstandingRwf?: number;

  @ApiPropertyOptional({
    description: 'Maximum current outstanding balance in RWF.',
    example: 500000,
    minimum: 0,
  })
  @Transform(({ value }) => normalizeOptionalNumber(value))
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Maximum outstanding balance must be a number.' },
  )
  @Min(0, { message: 'Maximum outstanding balance must be at least 0.' })
  maxOutstandingRwf?: number;
}
