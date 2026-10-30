import {
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
  IncomeCategory,
  ReceivedTransactionClassification,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { FinancialMessageImportResponseDto } from './financial-message-import.dto';

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');

  return normalized.length === 0 ? undefined : normalized;
}

export class ListFinancialMessageImportsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({
    enum: FinancialMessageImportStatus,
    default: FinancialMessageImportStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(FinancialMessageImportStatus)
  status: FinancialMessageImportStatus = FinancialMessageImportStatus.PENDING;

  @ApiPropertyOptional({ enum: FinancialMessageParseStatus })
  @IsOptional()
  @IsEnum(FinancialMessageParseStatus)
  parseStatus?: FinancialMessageParseStatus;
}

export class UpdateFinancialMessageImportDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 2147483647 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  amount?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  occurredAt?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  senderName?: string;

  @ApiPropertyOptional({ maxLength: 35 })
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{3,34}$/)
  senderIdentifier?: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(/^[A-Za-z0-9._:/-]+$/)
  providerReference?: string;
}

export class ConfirmFinancialMessageImportDto {
  @ApiProperty({ enum: ReceivedTransactionClassification })
  @IsEnum(ReceivedTransactionClassification)
  classification!: ReceivedTransactionClassification;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  createIncome = false;

  @ApiPropertyOptional({ enum: IncomeCategory })
  @IsOptional()
  @IsEnum(IncomeCategory)
  incomeCategory?: IncomeCategory;

  @ApiPropertyOptional({ minLength: 1, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  incomeLabel?: string;
}

export class FinancialMessageImportDetailResponseDto extends FinancialMessageImportResponseDto {
  @ApiProperty({ nullable: true })
  rawMessage!: string | null;
}

export class FinancialMessageImportPaginationResponseDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  hasNextPage!: boolean;
}

export class FinancialMessageImportListResponseDto {
  @ApiProperty({ type: FinancialMessageImportResponseDto, isArray: true })
  items!: FinancialMessageImportResponseDto[];

  @ApiProperty({ type: FinancialMessageImportPaginationResponseDto })
  pagination!: FinancialMessageImportPaginationResponseDto;

  @ApiProperty({ description: 'All pending iPhone imports for this user.' })
  pendingCount!: number;
}

export class FinancialMessageImportConfirmationResponseDto {
  @ApiProperty({ type: FinancialMessageImportResponseDto })
  import!: FinancialMessageImportResponseDto;

  @ApiProperty({ format: 'uuid' })
  receivedTransactionId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  incomeId!: string | null;
}
