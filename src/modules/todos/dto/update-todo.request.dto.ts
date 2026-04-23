import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ExpenseCategory,
  ExpenseMobileMoneyChannel,
  ExpenseMobileMoneyNetwork,
  ExpensePaymentMethod,
  TodoFrequency,
  TodoPriority,
  TodoStatus,
  TodoType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

function normalizeOptionalName(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeOptionalPrice(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();

    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

function normalizeOptionalUuid(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeOptionalStatus(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeOptionalNumber(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    return normalized.length === 0 ? undefined : Number(normalized);
  }

  return value;
}

function normalizeFrequencyDays(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim();

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed: unknown = JSON.parse(normalized);
        return Array.isArray(parsed) ? parsed.map(Number) : undefined;
      } catch {
        return undefined;
      }
    }

    return [Number(value)];
  }
  if (Array.isArray(value)) return value.map(Number);
  return undefined;
}

function normalizeDateArray(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim();

    if (normalized.startsWith('[') && normalized.endsWith(']')) {
      try {
        const parsed: unknown = JSON.parse(normalized);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }

    return [value];
  }
  if (Array.isArray(value)) return value;
  return undefined;
}

function normalizeNullableString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

export class UpdateTodoRequestDto {
  @ApiPropertyOptional({
    description: 'Updated human-readable name of the todo item.',
    example: 'Renew annual car insurance',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalName(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Name must not exceed 120 characters.' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated budgeted or expected price in RWF.',
    example: 92000,
  })
  @Transform(({ value }) => normalizeOptionalPrice(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number.' },
  )
  @Min(0, { message: 'Price must be zero or greater.' })
  price?: number;

  @ApiPropertyOptional({
    description: 'Updated priority level for the todo item.',
    enum: TodoPriority,
    enumName: 'TodoPriority',
    example: TodoPriority.PRIORITY,
  })
  @IsOptional()
  @IsEnum(TodoPriority, {
    message: 'Priority must be a valid todo priority.',
  })
  priority?: TodoPriority;

  @ApiPropertyOptional({
    description:
      'Updated planning intent. WISHLIST stays aspirational, PLANNED_SPEND is a one-off spend plan, and RECURRING_OBLIGATION is a repeating commitment.',
    enum: TodoType,
    enumName: 'TodoType',
    example: TodoType.PLANNED_SPEND,
  })
  @Transform(({ value }) => normalizeOptionalStatus(value))
  @IsOptional()
  @IsEnum(TodoType, {
    message: 'Type must be a valid todo type.',
  })
  type?: TodoType;

  @ApiPropertyOptional({
    description: 'Updated lifecycle status for the todo item.',
    enum: TodoStatus,
    enumName: 'TodoStatus',
    example: TodoStatus.COMPLETED,
  })
  @Transform(({ value }) => normalizeOptionalStatus(value))
  @IsOptional()
  @IsEnum(TodoStatus, {
    message: 'Status must be a valid todo status.',
  })
  status?: TodoStatus;

  @ApiPropertyOptional({
    description: 'Updated recurrence frequency.',
    enum: TodoFrequency,
    enumName: 'TodoFrequency',
    example: TodoFrequency.WEEKLY,
  })
  @IsOptional()
  @IsEnum(TodoFrequency, {
    message: 'Frequency must be a valid todo frequency.',
  })
  frequency?: TodoFrequency;

  @ApiPropertyOptional({
    description: 'Updated default expense category for this todo.',
    enum: ExpenseCategory,
    enumName: 'ExpenseCategory',
    example: ExpenseCategory.SCHOOL_FEES,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsEnum(ExpenseCategory, {
    message: 'defaultExpenseCategory must be a valid expense category.',
  })
  defaultExpenseCategory?: ExpenseCategory | null;

  @ApiPropertyOptional({
    description: 'Updated default payment method for this todo.',
    enum: ExpensePaymentMethod,
    enumName: 'ExpensePaymentMethod',
    example: ExpensePaymentMethod.MOBILE_MONEY,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsEnum(ExpensePaymentMethod, {
    message: 'defaultPaymentMethod must be a valid payment method.',
  })
  defaultPaymentMethod?: ExpensePaymentMethod | null;

  @ApiPropertyOptional({
    description: 'Updated default mobile money transfer type for this todo.',
    enum: ExpenseMobileMoneyChannel,
    enumName: 'ExpenseMobileMoneyChannel',
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyChannel, {
    message: 'defaultMobileMoneyChannel must be a valid mobile money channel.',
  })
  defaultMobileMoneyChannel?: ExpenseMobileMoneyChannel | null;

  @ApiPropertyOptional({
    description: 'Updated default mobile money network for this todo.',
    enum: ExpenseMobileMoneyNetwork,
    enumName: 'ExpenseMobileMoneyNetwork',
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyNetwork, {
    message: 'defaultMobileMoneyNetwork must be a valid mobile money network.',
  })
  defaultMobileMoneyNetwork?: ExpenseMobileMoneyNetwork | null;

  @ApiPropertyOptional({
    description: 'Updated merchant, vendor, payee, or destination label.',
    example: 'GS Kagarama',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Payee must not exceed 120 characters.' })
  payee?: string | null;

  @ApiPropertyOptional({
    description:
      'Updated reusable note or rationale for expense recording defaults.',
    example: 'Second-term fees for May intake.',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'expenseNote must not exceed 500 characters.' })
  expenseNote?: string | null;

  @ApiPropertyOptional({
    description: 'Updated visible user responsible for this todo.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
  })
  @Transform(({ value }) => normalizeNullableString(value))
  @IsOptional()
  @IsUUID('4', {
    message: 'responsibleUserId must be a valid UUID.',
  })
  responsibleUserId?: string | null;

  @ApiPropertyOptional({
    description: 'Updated start date of the schedule (ISO 8601 date).',
    example: '2026-04-02',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'startDate must be a valid ISO date string (YYYY-MM-DD).' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated end date of the schedule (ISO 8601 date).',
    example: '2026-04-09',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'endDate must be a valid ISO date string (YYYY-MM-DD).' },
  )
  endDate?: string;

  @ApiPropertyOptional({
    description:
      'Updated recurrence days for WEEKLY todos. Uses 0 (Sun) – 6 (Sat).',
    type: [Number],
    example: [1, 3, 5],
  })
  @Transform(({ value }) => normalizeFrequencyDays(value))
  @ValidateIf((obj: UpdateTodoRequestDto) => obj.frequencyDays !== undefined)
  @IsArray({ message: 'frequencyDays must be an array.' })
  @ArrayMinSize(1, { message: 'Select at least one day.' })
  @ArrayMaxSize(7, { message: 'Weekly todos support up to 7 selected days.' })
  @IsInt({ each: true, message: 'Each day value must be a whole number.' })
  @Min(0, { each: true, message: 'Day values must be 0 or greater.' })
  @Max(6, { each: true, message: 'Weekly day values must be 6 or less.' })
  frequencyDays?: number[];

  @ApiPropertyOptional({
    description: 'Updated exact occurrence dates for MONTHLY and YEARLY todos.',
    type: [String],
    example: ['2026-04-04', '2026-04-11', '2026-04-18', '2026-04-25'],
  })
  @Transform(({ value }) => normalizeDateArray(value))
  @ValidateIf((obj: UpdateTodoRequestDto) => obj.occurrenceDates !== undefined)
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

  @ApiPropertyOptional({
    description:
      'UUID of an existing active image that should become the primary cover image for the todo item.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
  })
  @Transform(({ value }) => normalizeOptionalUuid(value))
  @IsOptional()
  @IsUUID('4', { message: 'primaryImageId must be a valid UUID.' })
  primaryImageId?: string;

  @ApiPropertyOptional({
    description:
      'Amount spent in this expense recording. Deducted from remainingAmount. Only valid for recurring todos.',
    example: 1000,
  })
  @Transform(({ value }) => normalizeOptionalNumber(value))
  @IsOptional()
  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'deductAmount must be a valid number.' },
  )
  @Min(0.01, { message: 'deductAmount must be greater than zero.' })
  deductAmount?: number;

  @ApiPropertyOptional({
    description:
      'Exact occurrence date being recorded to expenses. Required when deductAmount is used for recurring todos.',
    example: '2026-04-04',
  })
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'recordedOccurrenceDate must be a valid ISO date string (YYYY-MM-DD).',
    },
  )
  recordedOccurrenceDate?: string;
}
