import { ApiProperty } from '@nestjs/swagger';

import { ReceivedTransactionResponseDto } from './received-transaction.response.dto';

export class ReceivedTransactionPaginationResponseDto {
  @ApiProperty({
    example: 1,
  })
  page!: number;

  @ApiProperty({
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    example: 42,
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

export class ReceivedTransactionListResponseDto {
  @ApiProperty({
    type: [ReceivedTransactionResponseDto],
  })
  items!: ReceivedTransactionResponseDto[];

  @ApiProperty({
    type: ReceivedTransactionPaginationResponseDto,
  })
  pagination!: ReceivedTransactionPaginationResponseDto;
}
