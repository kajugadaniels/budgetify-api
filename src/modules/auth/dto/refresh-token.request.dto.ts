import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'Budgetify refresh token previously issued by the backend.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-example.signature',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
