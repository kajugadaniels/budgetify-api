import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

export class ReverseLoanTransactionRequestDto {
  @ApiProperty({
    example: '2026-05-01T00:00:00.000Z',
    description: 'Date to assign to the reversal entry.',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    example: 'Recorded against the wrong counterparty',
    maxLength: 500,
    description:
      'Optional reason or note preserved on the reversal transaction for audit purposes.',
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
