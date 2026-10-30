import { registerAs } from '@nestjs/config';

export const iphoneShortcutImportConfig = registerAs(
  'iphoneShortcutImport',
  () => ({
    tokenPepper: process.env.IPHONE_SHORTCUT_IMPORT_TOKEN_PEPPER as string,
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
  }),
);
