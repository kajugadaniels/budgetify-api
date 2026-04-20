CREATE TYPE "public"."SavingTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT');

CREATE TABLE "public"."SavingTransaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "savingId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "public"."SavingTransactionType" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" "public"."Currency" NOT NULL DEFAULT 'RWF',
  "amountRwf" DECIMAL(15,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "SavingTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."SavingTransaction"
ADD CONSTRAINT "SavingTransaction_savingId_fkey"
FOREIGN KEY ("savingId") REFERENCES "public"."Saving"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."SavingTransaction"
ADD CONSTRAINT "SavingTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SavingTransaction_savingId_idx" ON "public"."SavingTransaction"("savingId");
CREATE INDEX "SavingTransaction_userId_idx" ON "public"."SavingTransaction"("userId");
CREATE INDEX "SavingTransaction_type_idx" ON "public"."SavingTransaction"("type");
CREATE INDEX "SavingTransaction_date_idx" ON "public"."SavingTransaction"("date");
CREATE INDEX "SavingTransaction_deletedAt_idx" ON "public"."SavingTransaction"("deletedAt");

INSERT INTO "public"."SavingTransaction" (
  "savingId",
  "userId",
  "type",
  "amount",
  "currency",
  "amountRwf",
  "date",
  "note",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  "id",
  "userId",
  'DEPOSIT'::"public"."SavingTransactionType",
  "amount",
  "currency",
  "amountRwf",
  "date",
  "note",
  "createdAt",
  "updatedAt",
  "deletedAt"
FROM "public"."Saving";

INSERT INTO "public"."SavingTransaction" (
  "savingId",
  "userId",
  "type",
  "amount",
  "currency",
  "amountRwf",
  "date",
  "note",
  "createdAt",
  "updatedAt",
  "deletedAt"
)
SELECT
  "id",
  "userId",
  'WITHDRAWAL'::"public"."SavingTransactionType",
  "amount",
  "currency",
  "amountRwf",
  "date",
  CASE
    WHEN "note" IS NULL THEN 'Legacy withdrawal from inactive saving'
    ELSE "note" || ' - Legacy withdrawal from inactive saving'
  END,
  "createdAt",
  "updatedAt",
  "deletedAt"
FROM "public"."Saving"
WHERE "stillHave" = false;
