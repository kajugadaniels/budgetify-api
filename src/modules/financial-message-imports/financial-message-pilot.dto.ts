import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export enum FinancialMessagePilotHealth {
  HEALTHY = 'HEALTHY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

export class FinancialMessagePilotSummaryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 90, default: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days = 30;
}

export class FinancialMessageProviderMetricDto {
  @ApiProperty({ nullable: true, example: 'MTN_MOMO_RW' })
  providerCode!: string | null;

  @ApiProperty({ example: 'MTN MoMo' })
  label!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  parsed!: number;

  @ApiProperty()
  needsReview!: number;

  @ApiProperty()
  confirmed!: number;
}

export class FinancialMessagePilotSummaryResponseDto {
  @ApiProperty({ enum: ['disabled', 'pilot', 'enabled'] })
  mode!: string;

  @ApiProperty()
  windowDays!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  pending!: number;

  @ApiProperty()
  confirmed!: number;

  @ApiProperty()
  dismissed!: number;

  @ApiProperty()
  needsReview!: number;

  @ApiProperty()
  possibleDuplicates!: number;

  @ApiProperty({ enum: FinancialMessagePilotHealth })
  health!: FinancialMessagePilotHealth;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastImportAt!: Date | null;

  @ApiProperty({ type: FinancialMessageProviderMetricDto, isArray: true })
  providers!: FinancialMessageProviderMetricDto[];

  @ApiProperty()
  isTruncated!: boolean;
}
