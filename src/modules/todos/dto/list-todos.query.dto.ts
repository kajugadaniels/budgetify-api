import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  TodoFrequency,
  TodoPriority,
  TodoStatus,
  TodoType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

import {
  normalizeOptionalBoolean,
  normalizeOptionalString,
  PaginationQueryDto,
} from '../../../common/dto/pagination-query.dto';

export const TODO_CADENCE_FILTER = {
  ONCE: 'ONCE',
  RECURRING: 'RECURRING',
} as const;

export type TodoCadenceFilter =
  (typeof TODO_CADENCE_FILTER)[keyof typeof TODO_CADENCE_FILTER];

export const TODO_OPERATIONAL_STATE_FILTER = {
  OVERDUE: 'OVERDUE',
  UPCOMING: 'UPCOMING',
  RECORDED: 'RECORDED',
  UNRECORDED: 'UNRECORDED',
} as const;

export type TodoOperationalStateFilter =
  (typeof TODO_OPERATIONAL_STATE_FILTER)[keyof typeof TODO_OPERATIONAL_STATE_FILTER];

export const TODO_SORT_BY = {
  NEXT_OCCURRENCE_ASC: 'NEXT_OCCURRENCE_ASC',
  CREATED_AT_DESC: 'CREATED_AT_DESC',
} as const;

export type TodoSortBy = (typeof TODO_SORT_BY)[keyof typeof TODO_SORT_BY];

function normalizeOptionalNumber(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : Number(normalized);
}

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
    enum: Object.values(TODO_CADENCE_FILTER),
    example: TODO_CADENCE_FILTER.RECURRING,
    description:
      'Optional high-level cadence filter. Use RECURRING to include weekly, monthly, and yearly todos together.',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsEnum(TODO_CADENCE_FILTER, {
    message: 'Cadence must be ONCE or RECURRING.',
  })
  cadence?: TodoCadenceFilter;

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
    enum: TodoType,
    example: TodoType.WISHLIST,
    description: 'Optional planning intent filter.',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsEnum(TodoType, {
    message: 'Type must be a valid todo type.',
  })
  type?: TodoType;

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

  @ApiPropertyOptional({
    enum: Object.values(TODO_OPERATIONAL_STATE_FILTER),
    example: TODO_OPERATIONAL_STATE_FILTER.OVERDUE,
    description:
      'Optional occurrence-level operational filter. OVERDUE finds past-due open occurrences, UPCOMING finds still-open future occurrences, RECORDED finds todos with active recorded occurrences, and UNRECORDED finds todos that still have open occurrences to record.',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsEnum(TODO_OPERATIONAL_STATE_FILTER, {
    message: 'operationalState must be a valid todo operational state.',
  })
  operationalState?: TodoOperationalStateFilter;

  @ApiPropertyOptional({
    enum: Object.values(TODO_SORT_BY),
    example: TODO_SORT_BY.NEXT_OCCURRENCE_ASC,
    description:
      'Optional list ordering. NEXT_OCCURRENCE_ASC prioritizes the nearest open occurrence; CREATED_AT_DESC keeps the newest items first.',
  })
  @Transform(({ value }) => normalizeOptionalString(value))
  @IsOptional()
  @IsEnum(TODO_SORT_BY, {
    message: 'sortBy must be a valid todo sort option.',
  })
  sortBy?: TodoSortBy;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, only include todos that currently have at least one active linked expense recording.',
  })
  @Transform(({ value }) => normalizeOptionalBoolean(value))
  @IsOptional()
  @IsBoolean({ message: 'hasLinkedExpense must be true or false.' })
  hasLinkedExpense?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, only include todos with at least one active fee-bearing recording.',
  })
  @Transform(({ value }) => normalizeOptionalBoolean(value))
  @IsOptional()
  @IsBoolean({ message: 'feeBearingOnly must be true or false.' })
  feeBearingOnly?: boolean;

  @ApiPropertyOptional({
    example: 75000,
    description:
      'Optional maximum remaining recurring budget (RWF). Only recurring todos with a remaining amount at or below this threshold are included.',
  })
  @Transform(({ value }) => normalizeOptionalNumber(value))
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'remainingBudgetLte must be a valid number.' },
  )
  @Min(0, {
    message: 'remainingBudgetLte must be zero or greater.',
  })
  remainingBudgetLte?: number;
}
