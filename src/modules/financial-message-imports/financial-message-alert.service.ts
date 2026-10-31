import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';

type AlertMetadataValue = boolean | number | string | null;

@Injectable()
export class FinancialMessageAlertService {
  private readonly logger = new Logger(FinancialMessageAlertService.name);

  constructor(
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  async notify(
    event: string,
    metadata: Readonly<Record<string, AlertMetadataValue>>,
  ): Promise<void> {
    if (!this.config.alertWebhookUrl) {
      return;
    }

    try {
      const response = await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event,
          occurredAt: new Date().toISOString(),
          ...metadata,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.logger.error(
          JSON.stringify({
            event: 'financial_message_alert_delivery_failed',
            statusCode: response.status,
          }),
        );
      }
    } catch {
      this.logger.error(
        JSON.stringify({ event: 'financial_message_alert_delivery_failed' }),
      );
    }
  }
}
