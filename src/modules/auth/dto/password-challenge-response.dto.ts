import { ApiProperty } from '@nestjs/swagger';

export class PasswordChallengeResponseDto {
  @ApiProperty({ example: 'a***e@example.com' })
  maskedEmail!: string;

  @ApiProperty({ example: 'A verification code has been sent.' })
  message!: string;
}
