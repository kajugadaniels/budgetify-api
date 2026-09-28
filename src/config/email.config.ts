import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  apiKey: process.env.RESEND_API_KEY as string,
  from: process.env.RESEND_FROM as string,
}));
