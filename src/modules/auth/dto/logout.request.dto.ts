import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequestDto {
  @ApiProperty({
    description: 'Current Budgetify refresh token to revoke.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh-token-example.signature',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
