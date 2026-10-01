import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

import { OTP_CODE_LENGTH } from '../constants/otp.constants';

const OTP_PATTERN = new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`);

export class EmailVerifyRequestDto {
  @ApiProperty({
    description: 'The email address that was used in the initiate step.',

    example: 'alice.mutoni@example.com',
  })
  @IsEmail(
    {},
    {
      message: 'Please provide a valid email address.',
    },
  )
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: `The ${OTP_CODE_LENGTH}-digit OTP delivered by email.`,

    example: '4839',
  })
  @Matches(OTP_PATTERN, {
    message: `OTP must be exactly ${OTP_CODE_LENGTH} digits.`,
  })
  @IsNotEmpty()
  otp!: string;
}
