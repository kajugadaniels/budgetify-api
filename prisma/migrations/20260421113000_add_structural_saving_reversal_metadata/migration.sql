ALTER TABLE "SavingTransaction"
ADD COLUMN "reversalOfTransactionId" UUID;

CREATE UNIQUE INDEX "SavingTransaction_reversalOfTransactionId_key"
ON "SavingTransaction"("reversalOfTransactionId");

CREATE INDEX "SavingTransaction_reversalOfTransactionId_idx"
ON "SavingTransaction"("reversalOfTransactionId");

ALTER TABLE "SavingTransaction"
ADD CONSTRAINT "SavingTransaction_reversalOfTransactionId_fkey"
FOREIGN KEY ("reversalOfTransactionId") REFERENCES "SavingTransaction"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
