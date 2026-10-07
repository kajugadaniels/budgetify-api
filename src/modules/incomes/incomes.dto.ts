import { IncomeCategory } from '@prisma/client';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({
    description: 'Stable UUID for retries of the same creation request.',
  })
  @IsUUID()
  clientEventId!: string;

  @ApiProperty({ example: 'October salary' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({
    minimum: 1,
    maximum: 999999999999,
    description: 'Whole RWF; currency is always RWF.',
  })
  @IsInt()
  @Min(1)
  @Max(999999999999)
  amount!: number;

  @ApiProperty({ enum: IncomeCategory })
  @IsEnum(IncomeCategory)
  category!: IncomeCategory;

  @ApiProperty({
    description: 'Expected date, or actual date for already received income.',
  })
  @IsISO8601({ strict: true })
  date!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  received = false;
}

export class UpdateIncomeDto extends PartialType(
  OmitType(CreateIncomeDto, ['clientEventId', 'received'] as const),
) {}

export class ReceiveIncomeDto {
  @ApiProperty({ description: 'Actual receipt date; cannot be in the future.' })
  @IsISO8601({ strict: true })
  date!: string;
}

export class LinkIncomeDto {
  @ApiProperty()
  @IsUUID()
  receivedTransactionId!: string;
}

export class ListIncomesDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @IsOptional()
  @IsIn(['EXPECTED', 'RECEIVED', 'REVERSED'])
  @ApiPropertyOptional({ enum: ['EXPECTED', 'RECEIVED', 'REVERSED'] })
  status?: 'EXPECTED' | 'RECEIVED' | 'REVERSED';

  @IsOptional()
  @IsEnum(IncomeCategory)
  @ApiPropertyOptional({ enum: IncomeCategory })
  category?: IncomeCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @ApiPropertyOptional()
  search?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiPropertyOptional({
    description: 'Inclusive expected or received date range start.',
  })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @ApiPropertyOptional({
    description: 'Inclusive expected or received date range end.',
  })
  to?: string;
}
