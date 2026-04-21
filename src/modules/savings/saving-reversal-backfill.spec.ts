import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('saving reversal backfill migration', () => {
  it('matches reversal withdrawals to deposits by saving, amount, and deposit date', () => {
    const migrationPath = join(
      __dirname,
      '..',
      '..',
      '..',
      'prisma',
      'migrations',
      '20260421114500_backfill_structural_saving_reversal_metadata',
      'migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('deposit."savingId" = withdrawal."savingId"');
    expect(sql).toContain('deposit."amountRwf" = withdrawal."amountRwf"');
    expect(sql).toContain(
      "SUBSTRING(withdrawal.note FROM '([0-9]{4}-[0-9]{2}-[0-9]{2})')",
    );
    expect(sql).toContain("withdrawal.note LIKE 'Reversal of deposit from %'");
    expect(sql).toContain(
      'SET "reversalOfTransactionId" = candidate.original_id',
    );
  });
});
