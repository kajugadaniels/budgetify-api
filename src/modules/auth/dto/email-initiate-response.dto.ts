import { ApiProperty } from '@nestjs/swagger';

export type EmailAuthAction = 'login' | 'register';

export class EmailInitiateResponseDto {
  @ApiProperty({
    description:
      '"login" when the email belongs to an existing verified account. ' +
      '"register" when the email is new and an onboarding OTP was sent.',
    enum: ['login', 'register'] as EmailAuthAction[],
    example: 'login',
  })
  action!: EmailAuthAction;

  @ApiProperty({
    description:
      'The email address with the local part partially masked for display in the UI ' +
      '(e.g. "a***i@example.com"). Never log or store this value.',
    example: 'a***i@example.com',
  })
  maskedEmail!: string;

  @ApiProperty({
    description: 'Human-readable status message suitable for display.',
    example: 'A sign-in code has been sent to a***i@example.com.',
  })
  message!: string;
}
