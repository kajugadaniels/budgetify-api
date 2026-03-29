import { ApiPropertyOptional } from '@nestjs/swagger';
import { TodoPriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
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
      'UUID of an existing active image that should become the primary cover image for the todo item.',
    example: '8d65c09f-e7fa-4ee1-9428-3b1ebc80a918',
  })
  @Transform(({ value }) => normalizeOptionalUuid(value))
  @IsOptional()
  @IsUUID('4', { message: 'primaryImageId must be a valid UUID.' })
  primaryImageId?: string;
}
