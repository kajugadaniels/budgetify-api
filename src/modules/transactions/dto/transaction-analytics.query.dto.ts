import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';

export class TransactionAnalyticsQueryDto {
  @ApiProperty({
    description: 'Start of the analytics period. The timestamp is inclusive.',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsISO8601(
    {
      strict: true,
    },
    {
      message: 'From must be a valid ISO 8601 timestamp.',
    },
  )
  from!: string;

  @ApiProperty({
    description: 'End of the analytics period. The timestamp is inclusive.',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsISO8601(
    {
      strict: true,
    },
    {
      message: 'To must be a valid ISO 8601 timestamp.',
    },
  )
  to!: string;
}
