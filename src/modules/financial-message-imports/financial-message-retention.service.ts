import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { FinancialMessageImportStatus } from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import { PrismaService } from '../../database/prisma/prisma.service';
import { FinancialMessageAlertService } from './financial-message-alert.service';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

export interface FinancialMessageRetentionResult {
  expiredImports: number;
  purgedTerminalMessages: number;
}

@Injectable()
export class FinancialMessageRetentionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(FinancialMessageRetentionService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: FinancialMessageAlertService,
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  onApplicationBootstrap(): void {
    this.runSafely();
    this.timer = setInterval(
      () => this.runSafely(),
      this.config.cleanupIntervalMinutes * MILLISECONDS_PER_MINUTE,
    );
    this.timer.unref();
  }

  private runSafely(): void {
    void this.runOnce().catch(() => undefined);
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<FinancialMessageRetentionResult> {
    if (this.running) {
      return { expiredImports: 0, purgedTerminalMessages: 0 };
    }

    this.running = true;
    const now = new Date();
    try {
      const [expired, purged] = await this.prisma.$transaction([
        this.prisma.financialMessageImport.updateMany({
          where: {
            status: FinancialMessageImportStatus.PENDING,
            expiresAt: { lte: now },
          },
          data: {
            status: FinancialMessageImportStatus.EXPIRED,
            rawMessageCiphertext: null,
            rawMessagePurgedAt: now,
          },
        }),
        this.prisma.financialMessageImport.updateMany({
          where: {
            status: {
              in: [
                FinancialMessageImportStatus.CONFIRMED,
                FinancialMessageImportStatus.DISMISSED,
                FinancialMessageImportStatus.EXPIRED,
              ],
            },
            rawMessageCiphertext: { not: null },
          },
          data: {
            rawMessageCiphertext: null,
            rawMessagePurgedAt: now,
          },
        }),
      ]);
      const result = {
        expiredImports: expired.count,
        purgedTerminalMessages: purged.count,
      };
      if (result.expiredImports > 0 || result.purgedTerminalMessages > 0) {
        this.logger.log(
          JSON.stringify({ event: 'financial_message_retention', ...result }),
        );
      }
      return result;
    } catch (error) {
      this.logger.error(
        JSON.stringify({ event: 'financial_message_retention_failed' }),
        error instanceof Error ? error.stack : undefined,
      );
      await this.alerts.notify('financial_message_retention_failed', {
        cleanupIntervalMinutes: this.config.cleanupIntervalMinutes,
      });
      throw error;
    } finally {
      this.running = false;
    }
  }
}
