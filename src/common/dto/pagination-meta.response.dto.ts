import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaResponseDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: 38 })
  totalItems!: number;

  @ApiProperty({ example: 4 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}
