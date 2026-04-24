CREATE TYPE "LoanDirection" AS ENUM ('BORROWED', 'LENT');

CREATE TYPE "LoanType" AS ENUM (
  'PERSONAL',
  'BUSINESS',
  'FAMILY',
  'FRIEND',
  'OTHER'
);

ALTER TABLE "Loan"
ADD COLUMN "direction" "LoanDirection" NOT NULL DEFAULT 'BORROWED',
ADD COLUMN "type" "LoanType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "counterpartyName" TEXT,
ADD COLUMN "counterpartyContact" TEXT,
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'RWF',
ADD COLUMN "amountRwf" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "dueDate" DATE;

UPDATE "Loan"
SET
  "counterpartyName" = COALESCE(NULLIF(BTRIM("label"), ''), 'Unknown counterparty'),
  "amountRwf" = "amount";

ALTER TABLE "Loan"
ALTER COLUMN "counterpartyName" SET NOT NULL;

CREATE INDEX "Loan_userId_direction_idx" ON "Loan"("userId", "direction");
CREATE INDEX "Loan_userId_type_idx" ON "Loan"("userId", "type");
CREATE INDEX "Loan_dueDate_idx" ON "Loan"("dueDate");
