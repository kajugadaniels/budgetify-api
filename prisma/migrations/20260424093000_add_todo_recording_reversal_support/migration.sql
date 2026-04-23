-- Add reversal support and expense-source tracking to todo recordings.

CREATE TYPE "TodoRecordingExpenseSource" AS ENUM ('GENERATED', 'LINKED_EXISTING');

ALTER TABLE "TodoRecording"
ADD COLUMN "expenseSource" "TodoRecordingExpenseSource" NOT NULL DEFAULT 'GENERATED',
ADD COLUMN "reversedAt" TIMESTAMP(3),
ADD COLUMN "reversalReason" TEXT,
ADD COLUMN "reversedByUserId" UUID;

-- Existing recordings predate explicit source tracking, so backfill them to
-- LINKED_EXISTING to avoid accidentally deleting historical expenses during a
-- later reversal. New recordings set this field explicitly in application code.
UPDATE "TodoRecording"
SET "expenseSource" = 'LINKED_EXISTING'::"TodoRecordingExpenseSource";

ALTER TABLE "TodoRecording"
ADD CONSTRAINT "TodoRecording_reversedByUserId_fkey"
FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "TodoRecording_reversedAt_idx" ON "TodoRecording"("reversedAt");
CREATE INDEX "TodoRecording_reversedByUserId_idx" ON "TodoRecording"("reversedByUserId");
