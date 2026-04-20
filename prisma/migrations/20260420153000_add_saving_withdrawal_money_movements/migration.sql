CREATE TYPE "public"."MoneyMovementType" AS ENUM ('SAVING_WITHDRAWAL', 'MANUAL_ADJUSTMENT');

CREATE TABLE "public"."MoneyMovement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" "public"."MoneyMovementType" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" "public"."Currency" NOT NULL DEFAULT 'RWF',
  "amountRwf" DECIMAL(15,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "savingTransactionId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "MoneyMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."MoneyMovement"
ADD CONSTRAINT "MoneyMovement_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."MoneyMovement"
ADD CONSTRAINT "MoneyMovement_savingTransactionId_fkey"
FOREIGN KEY ("savingTransactionId") REFERENCES "public"."SavingTransaction"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "MoneyMovement_savingTransactionId_key"
ON "public"."MoneyMovement"("savingTransactionId");

CREATE INDEX "MoneyMovement_userId_idx" ON "public"."MoneyMovement"("userId");
CREATE INDEX "MoneyMovement_type_idx" ON "public"."MoneyMovement"("type");
CREATE INDEX "MoneyMovement_date_idx" ON "public"."MoneyMovement"("date");
CREATE INDEX "MoneyMovement_deletedAt_idx" ON "public"."MoneyMovement"("deletedAt");
