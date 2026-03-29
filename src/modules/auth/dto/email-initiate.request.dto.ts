import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailInitiateRequestDto {
  @ApiProperty({
    description:
      'The email address to sign in with or register. ' +
      'Existing accounts receive a login OTP; new addresses receive an onboarding OTP.',
    example: 'alice.mutoni@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email!: string;
}
