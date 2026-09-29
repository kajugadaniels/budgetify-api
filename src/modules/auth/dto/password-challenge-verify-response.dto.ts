import { ApiProperty } from '@nestjs/swagger';

export class PasswordChallengeVerifyResponseDto {
  @ApiProperty({
    description:
      'Short-lived, single-use token that authorizes setting a password.',
  })
  grantToken!: string;

  @ApiProperty({ description: 'Grant lifetime in seconds.', example: 600 })
  expiresIn!: number;
}
