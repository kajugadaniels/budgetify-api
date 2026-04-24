CREATE TYPE "LoanStatus" AS ENUM (
  'ACTIVE',
  'PARTIALLY_REPAID',
  'SETTLED',
  'OVERDUE',
  'WRITTEN_OFF',
  'CANCELLED',
  'ARCHIVED'
);

ALTER TABLE "Loan"
ADD COLUMN "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "Loan"
SET "status" = CASE
  WHEN "paid" = TRUE THEN 'SETTLED'::"LoanStatus"
  ELSE 'ACTIVE'::"LoanStatus"
END;

DROP INDEX IF EXISTS "Loan_userId_paid_idx";

ALTER TABLE "Loan"
DROP COLUMN "paid";

CREATE INDEX "Loan_userId_status_idx" ON "Loan"("userId", "status");
