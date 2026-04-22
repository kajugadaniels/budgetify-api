ALTER TABLE "TodoRecording"
ADD COLUMN "plannedAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "varianceAmount" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "TodoRecording"
SET
  "plannedAmount" = "baseAmount",
  "varianceAmount" = "totalChargedAmount" - "baseAmount";
