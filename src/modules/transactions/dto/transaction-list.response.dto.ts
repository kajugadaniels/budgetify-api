import { ApiProperty } from '@nestjs/swagger';

import { TransactionResponseDto } from './transaction.response.dto';

export class TransactionPaginationResponseDto {
  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    example: 47,
  })
  total!: number;

  @ApiProperty({
    example: 3,
  })
  totalPages!: number;

  @ApiProperty({
    example: true,
  })
  hasNextPage!: boolean;

  @ApiProperty({
    example: false,
  })
  hasPreviousPage!: boolean;
}

export class TransactionListResponseDto {
  @ApiProperty({
    type: [TransactionResponseDto],
  })
  items!: TransactionResponseDto[];

  @ApiProperty({
    type: TransactionPaginationResponseDto,
  })
  pagination!: TransactionPaginationResponseDto;
}
