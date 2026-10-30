import { registerAs } from '@nestjs/config';

export const iphoneShortcutImportConfig = registerAs(
  'iphoneShortcutImport',
  () => ({
    tokenPepper: process.env.IPHONE_SHORTCUT_IMPORT_TOKEN_PEPPER as string,
    messageEncryptionKey: process.env
      .IPHONE_SHORTCUT_IMPORT_MESSAGE_ENCRYPTION_KEY as string,
    credentialLifetimeDays: 365,
    maximumActiveCredentials: 3,
    pendingImportLifetimeDays: 30,
    maximumMessageAgeDays: 30,
  }),
);
