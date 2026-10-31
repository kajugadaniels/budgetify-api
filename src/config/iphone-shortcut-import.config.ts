import { registerAs } from '@nestjs/config';

export const IPHONE_SHORTCUT_IMPORT_MODES = [
  'disabled',
  'pilot',
  'enabled',
] as const;

export type IphoneShortcutImportMode =
  (typeof IPHONE_SHORTCUT_IMPORT_MODES)[number];

function commaSeparatedValues(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(
      (item, index, values) =>
        item.length > 0 && values.indexOf(item) === index,
    );
}

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
    mode: (process.env.IPHONE_SHORTCUT_IMPORT_MODE ??
      'pilot') as IphoneShortcutImportMode,
    enabledProviderCodes: commaSeparatedValues(
      process.env.IPHONE_SHORTCUT_IMPORT_ENABLED_PROVIDERS,
    ),
    alertMinimumSampleSize: Number(
      process.env.IPHONE_SHORTCUT_IMPORT_ALERT_MINIMUM_SAMPLE_SIZE ?? 10,
    ),
    alertNeedsReviewPercent: Number(
      process.env.IPHONE_SHORTCUT_IMPORT_ALERT_NEEDS_REVIEW_PERCENT ?? 30,
    ),
    currentShortcutVersion: Number(
      process.env.IPHONE_SHORTCUT_IMPORT_CURRENT_VERSION ?? 1,
    ),
    minimumShortcutVersion: Number(
      process.env.IPHONE_SHORTCUT_IMPORT_MINIMUM_VERSION ?? 1,
    ),
    shortcutInstallUrl:
      process.env.IPHONE_SHORTCUT_IMPORT_INSTALL_URL?.trim() || null,
    cleanupIntervalMinutes: Number(
      process.env.IPHONE_SHORTCUT_IMPORT_CLEANUP_INTERVAL_MINUTES ?? 360,
    ),
    alertWebhookUrl:
      process.env.IPHONE_SHORTCUT_IMPORT_ALERT_WEBHOOK_URL?.trim() || null,
  }),
);
