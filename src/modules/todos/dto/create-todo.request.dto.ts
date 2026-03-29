import { ApiProperty } from '@nestjs/swagger';
import { TodoPriority } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
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
}
