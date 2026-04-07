import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { UsersService } from '../users.service';

const ACCOUNT_DELETION_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class AccountDeletionLifecycleService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AccountDeletionLifecycleService.name);
  private sweepTimer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly usersService: UsersService) {}

  onModuleInit(): void {
    void this.runSweep();
    this.sweepTimer = setInterval(() => {
      void this.runSweep();
    }, ACCOUNT_DELETION_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private async runSweep(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const processed =
        await this.usersService.processDueAccountDeletionBatch();

      if (processed > 0) {
        this.logger.log(
          `Finalized ${processed} scheduled account deletion(s).`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process scheduled account deletions: ${String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
