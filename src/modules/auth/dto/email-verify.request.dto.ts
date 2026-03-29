import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class EmailVerifyRequestDto {
  @ApiProperty({
    description: 'The email address that was used in the initiate step.',
    example: 'alice.mutoni@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'The 6-digit OTP delivered by email.',
    example: '483920',
  })
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits.' })
  @IsNotEmpty()
  otp!: string;
}
