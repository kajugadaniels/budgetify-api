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

export class LinkLoanTransactionFinancialRecordRequestDto {
  @ApiProperty({
    description:
      'Recorded date for the linked income or expense entry created from this loan transaction.',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsISO8601({}, { message: 'Date must be a valid ISO 8601 timestamp.' })
  date!: string;

  @ApiPropertyOptional({
    description:
      'Optional label override for the linked financial record. When omitted, a loan-aware default label is generated.',
    example: 'Loan repayment from Alice',
    maxLength: 120,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Label must not exceed 120 characters.' })
  label?: string;

  @ApiPropertyOptional({
    description:
      'Optional note override for the linked financial record. When omitted, the transaction note is reused before falling back to the loan note.',
    example: 'Collected in cash at Nyabugogo',
    maxLength: 500,
  })
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Note must not exceed 500 characters.' })
  note?: string;
}
