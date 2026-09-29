import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class PasswordChallengeVerifyRequestDto {
  @ApiProperty({ example: 'alice.mutoni@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '483920' })
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits.' })
  @IsNotEmpty()
  otp!: string;
}
