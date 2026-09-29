import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,128}$/;

export class SetPasswordRequestDto {
  @ApiProperty({ description: 'Token returned after OTP verification.' })
  @IsString()
  @IsNotEmpty()
  grantToken!: string;

  @ApiProperty({
    format: 'password',
    minLength: 8,
    maxLength: 128,
    description:
      'At least 8 characters with an uppercase letter, number, and symbol.',
  })
  @IsString()
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'Password must be at least 8 characters and include an uppercase letter, number, and symbol.',
  })
  password!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  confirmPassword!: string;
}
