import { registerAs } from '@nestjs/config';

function firstDefined(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '');
}

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

function parseFromAddress(raw: string | undefined): {
  name: string;
  address: string;
} | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  const match = /^(.*?)(?:\s*<([^>]+)>)$/.exec(trimmed);

  if (match) {
    const name = match[1]?.trim().replace(/^"(.*)"$/, '$1') || 'Budgetify';
    const address = match[2]?.trim();

    if (address) {
      return { name, address };
    }
  }

  if (trimmed.includes('@')) {
    return {
      name: 'Budgetify',
      address: trimmed,
    };
  }

  return null;
}

export const emailConfig = registerAs('email', () => ({
  host:
    firstDefined(process.env.MAIL_HOST, process.env.SMTP_HOST) ??
    'smtp.gmail.com',
  port: parsePort(
    firstDefined(process.env.MAIL_PORT, process.env.SMTP_PORT),
    587,
  ),
  /** Set to true when using port 465 with implicit TLS. */
  secure: parseBoolean(
    firstDefined(process.env.MAIL_SECURE, process.env.SMTP_SECURE),
    false,
  ),
  auth: {
    user: firstDefined(process.env.MAIL_USER, process.env.SMTP_USER) as string,
    pass: firstDefined(process.env.MAIL_PASS, process.env.SMTP_PASS) as string,
  },
  from: parseFromAddress(process.env.MAIL_FROM) ?? {
    name: process.env.EMAIL_FROM_NAME ?? 'Budgetify',
    address:
      firstDefined(
        process.env.EMAIL_FROM_ADDRESS,
        process.env.MAIL_USER,
        process.env.SMTP_USER,
      ) ?? '',
  },
}));
