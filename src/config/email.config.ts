import { registerAs } from '@nestjs/config';

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST as string,
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  /** Set to true when using port 465 with implicit TLS. */
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
  },
  from: {
    name: process.env.EMAIL_FROM_NAME ?? 'Budgetify',
    address: process.env.EMAIL_FROM_ADDRESS as string,
  },
}));
