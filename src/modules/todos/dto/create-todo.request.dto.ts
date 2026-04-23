import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

function normalizeStatus(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length === 0 ? undefined : normalized;
}

function normalizeNumberArray(value: unknown): unknown {
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

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length === 0 ? undefined : normalized;
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

  @ApiPropertyOptional({
    description:
      'Planning intent for this todo item. WISHLIST is aspirational, PLANNED_SPEND is a one-off operational spend, and RECURRING_OBLIGATION is a repeating commitment.',
    enum: TodoType,
    enumName: 'TodoType',
    example: TodoType.WISHLIST,
    default: TodoType.WISHLIST,
  })
  @Transform(({ value }) => normalizeStatus(value))
  @IsOptional()
  @IsEnum(TodoType, {
    message: 'Type must be a valid todo type.',
  })
  type?: TodoType;

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

  @ApiPropertyOptional({
    description: 'Lifecycle status for the todo item.',
    enum: TodoStatus,
    enumName: 'TodoStatus',
    example: TodoStatus.ACTIVE,
    default: TodoStatus.ACTIVE,
  })
  @Transform(({ value }) => normalizeStatus(value))
  @IsEnum(TodoStatus, {
    message: 'Status must be a valid todo status.',
  })
  status: TodoStatus = TodoStatus.ACTIVE;

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
      'Default expense category to prefill when recording this todo.',
    enum: ExpenseCategory,
    enumName: 'ExpenseCategory',
    example: ExpenseCategory.SCHOOL_FEES,
  })
  @IsOptional()
  @IsEnum(ExpenseCategory, {
    message: 'defaultExpenseCategory must be a valid expense category.',
  })
  defaultExpenseCategory?: ExpenseCategory;

  @ApiPropertyOptional({
    description: 'Default payment method to prefill when recording this todo.',
    enum: ExpensePaymentMethod,
    enumName: 'ExpensePaymentMethod',
    example: ExpensePaymentMethod.MOBILE_MONEY,
  })
  @IsOptional()
  @IsEnum(ExpensePaymentMethod, {
    message: 'defaultPaymentMethod must be a valid payment method.',
  })
  defaultPaymentMethod?: ExpensePaymentMethod;

  @ApiPropertyOptional({
    description:
      'Default mobile money transfer type when defaultPaymentMethod is MOBILE_MONEY.',
    enum: ExpenseMobileMoneyChannel,
    enumName: 'ExpenseMobileMoneyChannel',
    example: ExpenseMobileMoneyChannel.P2P_TRANSFER,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyChannel, {
    message: 'defaultMobileMoneyChannel must be a valid mobile money channel.',
  })
  defaultMobileMoneyChannel?: ExpenseMobileMoneyChannel;

  @ApiPropertyOptional({
    description:
      'Default mobile money network when the default channel is P2P_TRANSFER.',
    enum: ExpenseMobileMoneyNetwork,
    enumName: 'ExpenseMobileMoneyNetwork',
    example: ExpenseMobileMoneyNetwork.ON_NET,
  })
  @IsOptional()
  @IsEnum(ExpenseMobileMoneyNetwork, {
    message: 'defaultMobileMoneyNetwork must be a valid mobile money network.',
  })
  defaultMobileMoneyNetwork?: ExpenseMobileMoneyNetwork;

  @ApiPropertyOptional({
    description: 'Merchant, vendor, payee, or destination label for this todo.',
    example: 'GS Kagarama',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Payee must not exceed 120 characters.' })
  payee?: string;

  @ApiPropertyOptional({
    description:
      'Reusable note or rationale that should prefill when recording this todo as an expense.',
    example: 'Second-term fees for May intake.',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'expenseNote must not exceed 500 characters.' })
  expenseNote?: string;

  @ApiPropertyOptional({
    description:
      'Visible user responsible for this plan. Defaults to the creator when omitted.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsUUID('4', {
    message: 'responsibleUserId must be a valid UUID.',
  })
  responsibleUserId?: string;

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
