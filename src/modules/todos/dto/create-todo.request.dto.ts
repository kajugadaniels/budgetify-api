import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TodoFrequency, TodoPriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

function normalizeRequiredName(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ');
}

function normalizePrice(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();

    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

function normalizeDone(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
}

function normalizeNumberArray(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return [Number(value)];
  if (Array.isArray(value)) return value.map(Number);
  return undefined;
}

function normalizeDateArray(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value;
  return undefined;
}

export class CreateTodoRequestDto {
  @ApiProperty({
    description: 'Human-readable name of the todo item.',
    example: 'Renew car insurance',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeRequiredName(value))
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @MaxLength(120, { message: 'Name must not exceed 120 characters.' })
  name!: string;

  @ApiProperty({
    description: 'Budgeted or expected price for the todo item in RWF.',
    example: 85000,
  })
  @Transform(({ value }) => normalizePrice(value))
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number.' },
  )
  @Min(0, { message: 'Price must be zero or greater.' })
  price!: number;

  @ApiProperty({
    description: 'Priority level assigned to the todo item.',
    enum: TodoPriority,
    enumName: 'TodoPriority',
    example: TodoPriority.TOP_PRIORITY,
  })
  @IsEnum(TodoPriority, {
    message: 'Priority must be a valid todo priority.',
  })
  priority!: TodoPriority;

  @ApiProperty({
    description: 'Whether the todo item is already done.',
    example: false,
    default: false,
  })
  @Transform(({ value }) => normalizeDone(value))
  @IsBoolean({ message: 'Done must be a valid boolean value.' })
  done: boolean = false;

  @ApiPropertyOptional({
    description: 'How often this todo recurs.',
    enum: TodoFrequency,
    enumName: 'TodoFrequency',
    example: TodoFrequency.ONCE,
    default: TodoFrequency.ONCE,
  })
  @IsEnum(TodoFrequency, {
    message: 'Frequency must be a valid todo frequency.',
  })
  frequency: TodoFrequency = TodoFrequency.ONCE;

  @ApiPropertyOptional({
    description:
      'Start date of the schedule (ISO 8601 date, e.g. 2026-04-02). Defaults to today when omitted.',
    example: '2026-04-02',
  })
  @ValidateIf(
    (_obj: CreateTodoRequestDto, value: unknown) => value !== undefined,
  )
  @IsDateString(
    {},
    { message: 'startDate must be a valid ISO date string (YYYY-MM-DD).' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date of the schedule (ISO 8601 date). Optional in requests because the backend derives it from frequency and startDate.',
    example: '2026-04-09',
  })
  @ValidateIf(
    (_obj: CreateTodoRequestDto, value: unknown) => value !== undefined,
  )
  @IsDateString(
    {},
    { message: 'endDate must be a valid ISO date string (YYYY-MM-DD).' },
  )
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Days to repeat on for WEEKLY todos only. Uses 0 (Sun) – 6 (Sat).',
    type: [Number],
    example: [1, 3, 5],
  })
  @Transform(({ value }) => normalizeNumberArray(value))
  @ValidateIf(
    (obj: CreateTodoRequestDto) => obj.frequency === TodoFrequency.WEEKLY,
  )
  @IsArray({ message: 'frequencyDays must be an array.' })
  @ArrayMinSize(1, { message: 'Select at least one day.' })
  @ArrayMaxSize(7, { message: 'Weekly todos support up to 7 selected days.' })
  @IsInt({ each: true, message: 'Each day value must be a whole number.' })
  @Min(0, { each: true, message: 'Day values must be 0 or greater.' })
  @Max(6, { each: true, message: 'Weekly day values must be 6 or less.' })
  frequencyDays?: number[];

  @ApiPropertyOptional({
    description:
      'Exact occurrence dates for MONTHLY and YEARLY todos. Each date must fall inside the auto-derived schedule window.',
    type: [String],
    example: ['2026-04-04', '2026-04-11', '2026-04-18', '2026-04-25'],
  })
  @Transform(({ value }) => normalizeDateArray(value))
  @ValidateIf(
    (obj: CreateTodoRequestDto) =>
      obj.frequency === TodoFrequency.MONTHLY ||
      obj.frequency === TodoFrequency.YEARLY,
  )
  @IsArray({ message: 'occurrenceDates must be an array.' })
  @ArrayMinSize(1, { message: 'Select at least one occurrence date.' })
  @ArrayMaxSize(366, { message: 'Too many occurrence dates selected.' })
  @IsDateString(
    {},
    {
      each: true,
      message:
        'Each occurrence date must be a valid ISO date string (YYYY-MM-DD).',
    },
  )
  occurrenceDates?: string[];
}
