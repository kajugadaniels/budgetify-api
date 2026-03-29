import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function normalizeOptionalName(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class UpdateUserProfileRequestDto {
  @ApiPropertyOptional({
    description:
      'Updated first name for the authenticated user. Omit to keep the current value.',
    example: 'Alice',
    maxLength: 60,
  })
  @Transform(({ value }) => normalizeOptionalName(value))
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'First name must not exceed 60 characters.' })
  firstName?: string;

  @ApiPropertyOptional({
    description:
      'Updated last name for the authenticated user. Omit to keep the current value.',
    example: 'Mutoni',
    maxLength: 60,
  })
  @Transform(({ value }) => normalizeOptionalName(value))
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Last name must not exceed 60 characters.' })
  lastName?: string;
}
