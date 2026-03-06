import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({ example: 'Unauthorized' })
  error!: string;

  @ApiProperty({
    example: 'Invalid or expired refresh token.',
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: { type: 'string' },
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/v1/auth/refresh' })
  path!: string;

  @ApiProperty({ example: '2026-03-06T10:15:00.000Z' })
  timestamp!: string;
}
