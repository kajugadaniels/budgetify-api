CREATE TABLE "public"."SavingTransactionIncomeSource" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "savingTransactionId" UUID NOT NULL,
  "incomeId" UUID NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" "public"."Currency" NOT NULL DEFAULT 'RWF',
  "amountRwf" DECIMAL(15,2) NOT NULL,

  CONSTRAINT "SavingTransactionIncomeSource_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."SavingTransactionIncomeSource"
ADD CONSTRAINT "SavingTransactionIncomeSource_savingTransactionId_fkey"
FOREIGN KEY ("savingTransactionId") REFERENCES "public"."SavingTransaction"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SavingTransactionIncomeSource"
ADD CONSTRAINT "SavingTransactionIncomeSource_incomeId_fkey"
FOREIGN KEY ("incomeId") REFERENCES "public"."Income"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SavingTransactionIncomeSource_savingTransactionId_incomeId_key"
ON "public"."SavingTransactionIncomeSource"("savingTransactionId", "incomeId");

CREATE INDEX "SavingTransactionIncomeSource_savingTransactionId_idx"
ON "public"."SavingTransactionIncomeSource"("savingTransactionId");

CREATE INDEX "SavingTransactionIncomeSource_incomeId_idx"
ON "public"."SavingTransactionIncomeSource"("incomeId");
