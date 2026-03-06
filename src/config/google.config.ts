import { registerAs } from '@nestjs/config';

function parseGoogleClientIds(): string[] {
  const fromList =
    process.env.GOOGLE_CLIENT_IDS?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  const fromSingle = process.env.GOOGLE_CLIENT_ID?.trim();

  return Array.from(
    new Set([...(fromSingle ? [fromSingle] : []), ...fromList]),
  );
}

export const googleConfig = registerAs('google', () => ({
  clientIds: parseGoogleClientIds(),
}));
