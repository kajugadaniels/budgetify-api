import { ApiProperty } from '@nestjs/swagger';
import { LoanDirection } from '@prisma/client';

export class LoanAgingBucketDto {
  @ApiProperty({ example: '0-30' })
  bucket!: string;

  @ApiProperty({ example: 3 })
  loanCount!: number;

  @ApiProperty({ example: 420000 })
  principalOutstandingRwf!: number;

  @ApiProperty({ example: 50000 })
  interestOutstandingRwf!: number;

  @ApiProperty({ example: 470000 })
  totalOutstandingRwf!: number;
}

export class LoanDirectionAgingDto {
  @ApiProperty({ enum: LoanDirection, example: LoanDirection.LENT })
  direction!: LoanDirection;

  @ApiProperty({ example: 5 })
  overdueLoanCount!: number;

  @ApiProperty({ example: 760000 })
  overdueOutstandingRwf!: number;

  @ApiProperty({ type: LoanAgingBucketDto, isArray: true })
  buckets!: LoanAgingBucketDto[];
}

export class LoanAgingResponseDto {
  @ApiProperty({ example: '2026-05-01' })
  asOfDate!: string;

  @ApiProperty({ example: 8 })
  overdueLoanCount!: number;

  @ApiProperty({ example: 980000 })
  overdueOutstandingRwf!: number;

  @ApiProperty({ type: LoanAgingBucketDto, isArray: true })
  buckets!: LoanAgingBucketDto[];

  @ApiProperty({ type: LoanDirectionAgingDto, isArray: true })
  byDirection!: LoanDirectionAgingDto[];
}
