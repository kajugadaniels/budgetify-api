import {
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { FinancialMessageParseStatus } from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import type { FinancialMessageParserResult } from './financial-message-parser.types';

const HTTP_UPGRADE_REQUIRED = 426;

@Injectable()
export class FinancialMessageRolloutService {
  constructor(
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  assertIngestionEnabled(): void {
    if (this.config.mode === 'disabled') {
      throw new ServiceUnavailableException(
        'iPhone message imports are temporarily unavailable.',
      );
    }
  }

  assertShortcutVersion(shortcutVersion: number | undefined): void {
    if (
      this.config.mode !== 'enabled' ||
      (shortcutVersion !== undefined &&
        shortcutVersion >= this.config.minimumShortcutVersion)
    ) {
      return;
    }

    throw new HttpException(
      {
        statusCode: HTTP_UPGRADE_REQUIRED,
        error: 'Shortcut update required',
        message:
          'Update your Budgetify Shortcut before importing another message.',
        currentShortcutVersion: this.config.currentShortcutVersion,
        minimumShortcutVersion: this.config.minimumShortcutVersion,
        shortcutInstallUrl: this.config.shortcutInstallUrl,
      },
      HTTP_UPGRADE_REQUIRED,
    );
  }

  applyProviderRollout(
    parsed: FinancialMessageParserResult,
  ): FinancialMessageParserResult {
    if (!parsed.providerCode || this.isProviderEnabled(parsed.providerCode)) {
      return parsed;
    }

    return {
      ...parsed,
      parseStatus: FinancialMessageParseStatus.NEEDS_DETAILS,
      parseConfidence: 0,
    };
  }

  isProviderEnabled(providerCode: string | null): boolean {
    return (
      providerCode !== null &&
      this.config.enabledProviderCodes.includes(providerCode.toUpperCase())
    );
  }

  get mode() {
    return this.config.mode;
  }

  get enabledProviderCodes(): readonly string[] {
    return this.config.enabledProviderCodes;
  }

  get currentShortcutVersion(): number {
    return this.config.currentShortcutVersion;
  }

  get minimumShortcutVersion(): number {
    return this.config.minimumShortcutVersion;
  }

  get shortcutInstallUrl(): string | null {
    return this.config.shortcutInstallUrl;
  }
}
