import {
  Currency,
  FinancialMessageDirection,
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
} from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import { FinancialMessageSourceHint } from './financial-message-source.enum';

function trimText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateFinancialMessageImportDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'A UUID generated once by the iPhone Shortcut and reused when retrying the same message.',
  })
  @IsUUID()
  clientEventId!: string;

  @ApiProperty({ enum: FinancialMessageSourceHint })
  @IsEnum(FinancialMessageSourceHint)
  sourceHint!: FinancialMessageSourceHint;

  @ApiPropertyOptional({
    example: 'M-Money',
    description:
      'The sender or short code shown by iPhone Messages. It is used only as parsing evidence.',
  })
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  messageSender?: string;

  @ApiProperty({
    minLength: 5,
    maxLength: 4000,
    description:
      'The complete message supplied by the iPhone Shortcut. It is encrypted before storage.',
  })
  @Transform(({ value }: { value: unknown }) => trimText(value))
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'The message receipt time provided by iPhone Messages.',
  })
  @IsISO8601({ strict: true })
  messageReceivedAt!: string;
}

export class FinancialMessageImportResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  clientEventId!: string;

  @ApiProperty({ enum: FinancialMessageSourceHint })
  sourceHint!: FinancialMessageSourceHint;

  @ApiProperty({ nullable: true, example: 'MTN_MOMO_RW' })
  providerCode!: string | null;

  @ApiProperty({ enum: FinancialMessageDirection })
  direction!: FinancialMessageDirection;

  @ApiProperty({ enum: FinancialMessageParseStatus })
  parseStatus!: FinancialMessageParseStatus;

  @ApiProperty({ enum: FinancialMessageImportStatus })
  status!: FinancialMessageImportStatus;

  @ApiProperty({ enum: FinancialMessageDuplicateStatus })
  duplicateStatus!: FinancialMessageDuplicateStatus;

  @ApiProperty({ enum: Currency, nullable: true })
  currency!: Currency | null;

  @ApiProperty({ nullable: true, example: '25000' })
  amount!: string | null;

  @ApiProperty({ nullable: true, example: '20' })
  fee!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  messageReceivedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  occurredAt!: Date | null;

  @ApiProperty({ nullable: true })
  senderName!: string | null;

  @ApiProperty({ nullable: true })
  senderIdentifier!: string | null;

  @ApiProperty({ nullable: true })
  accountLastFour!: string | null;

  @ApiProperty({ nullable: true })
  providerReference!: string | null;

  @ApiProperty({ nullable: true, example: '0.9' })
  parseConfidence!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ format: 'uuid', nullable: true })
  confirmedReceivedTransactionId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  confirmedIncomeId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({
    description:
      'True when the same Shortcut request was already accepted previously.',
  })
  isReplay!: boolean;
}
