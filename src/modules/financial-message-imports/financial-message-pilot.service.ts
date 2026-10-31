import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  FinancialMessageDuplicateStatus,
  FinancialMessageImportStatus,
  FinancialMessageParseStatus,
} from '@prisma/client';

import { iphoneShortcutImportConfig } from '../../config/iphone-shortcut-import.config';
import { PrismaService } from '../../database/prisma/prisma.service';
import type { FinancialMessageImportResponseDto } from './financial-message-import.dto';
import { FinancialMessageAlertService } from './financial-message-alert.service';
import {
  FinancialMessagePilotHealth,
  FinancialMessagePilotSummaryResponseDto,
  FinancialMessageProviderReadiness,
  FinancialMessageProviderMetricDto,
} from './financial-message-pilot.dto';
import { financialMessageProviderDisplayName } from './financial-message-provider.registry';
import { FinancialMessageRolloutService } from './financial-message-rollout.service';

const SUMMARY_SAMPLE_LIMIT = 5000;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class FinancialMessagePilotService {
  private readonly logger = new Logger(FinancialMessagePilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rollout: FinancialMessageRolloutService,
    private readonly alerts: FinancialMessageAlertService,
    @Inject(iphoneShortcutImportConfig.KEY)
    private readonly config: ConfigType<typeof iphoneShortcutImportConfig>,
  ) {}

  recordOutcome(result: FinancialMessageImportResponseDto): void {
    const metadata = JSON.stringify({
      event: 'iphone_shortcut_import',
      mode: this.rollout.mode,
      providerCode: result.providerCode,
      parseStatus: result.parseStatus,
      duplicateStatus: result.duplicateStatus,
      replay: result.isReplay,
      shortcutVersion: result.shortcutVersion,
    });

    if (
      result.parseStatus !== FinancialMessageParseStatus.PARSED ||
      result.duplicateStatus !== FinancialMessageDuplicateStatus.CLEAR
    ) {
      this.logger.warn(metadata);
      return;
    }

    this.logger.log(metadata);
  }

  async summary(
    userId: string,
    days: number,
  ): Promise<FinancialMessagePilotSummaryResponseDto> {
    const since = new Date(Date.now() - days * MILLISECONDS_PER_DAY);
    const rows = await this.prisma.financialMessageImport.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: SUMMARY_SAMPLE_LIMIT + 1,
      select: {
        providerCode: true,
        status: true,
        parseStatus: true,
        duplicateStatus: true,
        shortcutVersion: true,
        createdAt: true,
      },
    });
    const isTruncated = rows.length > SUMMARY_SAMPLE_LIMIT;
    const sample = rows.slice(0, SUMMARY_SAMPLE_LIMIT);
    const needsReview = sample.filter(
      (row) => row.parseStatus !== FinancialMessageParseStatus.PARSED,
    ).length;
    const reviewPercent =
      sample.length === 0 ? 0 : (needsReview / sample.length) * 100;

    const health =
      sample.length < this.config.alertMinimumSampleSize
        ? FinancialMessagePilotHealth.INSUFFICIENT_DATA
        : reviewPercent >= this.config.alertNeedsReviewPercent
          ? FinancialMessagePilotHealth.NEEDS_ATTENTION
          : FinancialMessagePilotHealth.HEALTHY;
    const summary: FinancialMessagePilotSummaryResponseDto = {
      mode: this.rollout.mode,
      windowDays: days,
      total: sample.length,
      pending: this.countStatus(sample, FinancialMessageImportStatus.PENDING),
      confirmed: this.countStatus(
        sample,
        FinancialMessageImportStatus.CONFIRMED,
      ),
      dismissed: this.countStatus(
        sample,
        FinancialMessageImportStatus.DISMISSED,
      ),
      needsReview,
      possibleDuplicates: sample.filter(
        (row) =>
          row.duplicateStatus ===
          FinancialMessageDuplicateStatus.POSSIBLE_DUPLICATE,
      ).length,
      health,
      lastImportAt: sample[0]?.createdAt ?? null,
      providers: this.providerMetrics(sample),
      isTruncated,
      currentShortcutVersion: this.rollout.currentShortcutVersion,
      minimumShortcutVersion: this.rollout.minimumShortcutVersion,
      shortcutInstallUrl: this.rollout.shortcutInstallUrl,
      legacyShortcutImports: sample.filter(
        (row) => row.shortcutVersion === null,
      ).length,
      outdatedShortcutImports: sample.filter(
        (row) =>
          row.shortcutVersion !== null &&
          row.shortcutVersion < this.rollout.minimumShortcutVersion,
      ).length,
    };

    if (health === FinancialMessagePilotHealth.NEEDS_ATTENTION) {
      this.logger.warn(
        JSON.stringify({
          event: 'iphone_shortcut_pilot_health_alert',
          mode: this.rollout.mode,
          windowDays: days,
          sampleSize: sample.length,
          needsReviewPercent: Math.round(reviewPercent),
        }),
      );
      void this.alerts.notify('iphone_shortcut_pilot_health_alert', {
        mode: this.rollout.mode,
        windowDays: days,
        sampleSize: sample.length,
        needsReviewPercent: Math.round(reviewPercent),
      });
    }

    return summary;
  }

  private countStatus(
    rows: readonly { status: FinancialMessageImportStatus }[],
    status: FinancialMessageImportStatus,
  ): number {
    return rows.filter((row) => row.status === status).length;
  }

  private providerMetrics(
    rows: readonly {
      providerCode: string | null;
      status: FinancialMessageImportStatus;
      parseStatus: FinancialMessageParseStatus;
    }[],
  ): FinancialMessageProviderMetricDto[] {
    const groups = new Map<string, FinancialMessageProviderMetricDto>();
    for (const row of rows) {
      const key = row.providerCode ?? 'UNKNOWN';
      const metric = groups.get(key) ?? {
        providerCode: row.providerCode,
        label: financialMessageProviderDisplayName(row.providerCode),
        enabled: this.rollout.isProviderEnabled(row.providerCode),
        total: 0,
        parsed: 0,
        needsReview: 0,
        confirmed: 0,
        parseRatePercent: 0,
        readiness: FinancialMessageProviderReadiness.INSUFFICIENT_DATA,
      };
      metric.total += 1;
      metric.parsed +=
        row.parseStatus === FinancialMessageParseStatus.PARSED ? 1 : 0;
      metric.needsReview +=
        row.parseStatus === FinancialMessageParseStatus.PARSED ? 0 : 1;
      metric.confirmed +=
        row.status === FinancialMessageImportStatus.CONFIRMED ? 1 : 0;
      groups.set(key, metric);
    }

    for (const metric of groups.values()) {
      metric.parseRatePercent = Math.round(
        (metric.parsed / metric.total) * 100,
      );
      if (metric.total < this.config.alertMinimumSampleSize) {
        metric.readiness = FinancialMessageProviderReadiness.INSUFFICIENT_DATA;
      } else if (
        metric.needsReview / metric.total >=
        this.config.alertNeedsReviewPercent / 100
      ) {
        metric.readiness = FinancialMessageProviderReadiness.NEEDS_ATTENTION;
      } else {
        metric.readiness = metric.enabled
          ? FinancialMessageProviderReadiness.MONITORING
          : FinancialMessageProviderReadiness.READY_TO_ENABLE;
      }
    }

    return [...groups.values()].sort((left, right) => right.total - left.total);
  }
}
