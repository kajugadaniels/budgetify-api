CREATE TYPE "LoanTransactionType" AS ENUM (
  'DISBURSEMENT',
  'REPAYMENT',
  'INTEREST_CHARGE',
  'INTEREST_PAYMENT',
  'ADJUSTMENT',
  'WRITE_OFF',
  'REVERSAL'
);

CREATE TABLE "LoanTransaction" (
  "id" UUID NOT NULL,
  "loanId" UUID NOT NULL,
  "recordedByUserId" UUID NOT NULL,
  "type" "LoanTransactionType" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'RWF',
  "amountRwf" DECIMAL(15,2) NOT NULL,
  "date" DATE NOT NULL,
  "note" TEXT,
  "reversalOfTransactionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LoanTransaction_pkey" PRIMARY KEY ("id")
);

INSERT INTO "LoanTransaction" (
  "id",
  "loanId",
  "recordedByUserId",
  "type",
  "amount",
  "currency",
  "amountRwf",
  "date",
  "note",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "Loan"."id",
  "Loan"."userId",
  'DISBURSEMENT'::"LoanTransactionType",
  "Loan"."amount",
  "Loan"."currency",
  "Loan"."amountRwf",
  "Loan"."date"::DATE,
  "Loan"."note",
  "Loan"."createdAt",
  "Loan"."updatedAt"
FROM "Loan"
WHERE "Loan"."deletedAt" IS NULL;

CREATE INDEX "LoanTransaction_loanId_date_idx" ON "LoanTransaction"("loanId", "date");
CREATE INDEX "LoanTransaction_recordedByUserId_date_idx" ON "LoanTransaction"("recordedByUserId", "date");
CREATE INDEX "LoanTransaction_type_date_idx" ON "LoanTransaction"("type", "date");
CREATE INDEX "LoanTransaction_reversalOfTransactionId_idx" ON "LoanTransaction"("reversalOfTransactionId");

ALTER TABLE "LoanTransaction"
ADD CONSTRAINT "LoanTransaction_loanId_fkey"
FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanTransaction"
ADD CONSTRAINT "LoanTransaction_recordedByUserId_fkey"
FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoanTransaction"
ADD CONSTRAINT "LoanTransaction_reversalOfTransactionId_fkey"
FOREIGN KEY ("reversalOfTransactionId") REFERENCES "LoanTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
