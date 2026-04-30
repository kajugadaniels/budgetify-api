-- Add loan recovery as a first-class income category.
ALTER TYPE "IncomeCategory" ADD VALUE IF NOT EXISTS 'LOAN_RECOVERY';

-- Link loan transactions to any expense or income record created from them.
ALTER TABLE "LoanTransaction"
ADD COLUMN "expenseId" UUID,
ADD COLUMN "incomeId" UUID;

ALTER TABLE "LoanTransaction"
ADD CONSTRAINT "LoanTransaction_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "Expense"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LoanTransaction"
ADD CONSTRAINT "LoanTransaction_incomeId_fkey"
FOREIGN KEY ("incomeId") REFERENCES "Income"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LoanTransaction_expenseId_key"
ON "LoanTransaction"("expenseId");

CREATE UNIQUE INDEX "LoanTransaction_incomeId_key"
ON "LoanTransaction"("incomeId");

CREATE INDEX "LoanTransaction_expenseId_idx"
ON "LoanTransaction"("expenseId");

CREATE INDEX "LoanTransaction_incomeId_idx"
ON "LoanTransaction"("incomeId");
