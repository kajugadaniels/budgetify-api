import { ApiProperty } from '@nestjs/swagger';

export class TransactionAnalyticsPeriodResponseDto {
  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
  })
  from!: string;

  @ApiProperty({
    example: '2026-09-30T23:59:59.999Z',
  })
  to!: string;

  @ApiProperty({
    description:
      'Start of the immediately preceding comparison period with the same duration.',

    example: '2026-08-02T00:00:00.000Z',
  })
  previousFrom!: string;

  @ApiProperty({
    description:
      'End of the immediately preceding comparison period with the same duration.',

    example: '2026-08-31T23:59:59.999Z',
  })
  previousTo!: string;
}
