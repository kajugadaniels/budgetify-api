import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { FinancialMessageParseStatus } from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import type { FinancialMessageParserResult } from './financial-message-parser.types';

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
}
