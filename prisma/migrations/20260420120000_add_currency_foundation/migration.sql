CREATE TYPE "public"."Currency" AS ENUM ('RWF', 'USD');

CREATE TABLE "public"."AppSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSetting_key_key" ON "public"."AppSetting"("key");

ALTER TABLE "public"."Income"
ADD COLUMN "currency" "public"."Currency" NOT NULL DEFAULT 'RWF',
ADD COLUMN "amountRwf" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "public"."Income"
SET "amountRwf" = "amount"
WHERE "amountRwf" = 0;

ALTER TABLE "public"."Saving"
ADD COLUMN "currency" "public"."Currency" NOT NULL DEFAULT 'RWF',
ADD COLUMN "amountRwf" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "public"."Saving"
SET "amountRwf" = "amount"
WHERE "amountRwf" = 0;

CREATE INDEX "Income_userId_currency_idx" ON "public"."Income"("userId", "currency");
CREATE INDEX "Saving_userId_currency_idx" ON "public"."Saving"("userId", "currency");

INSERT INTO "public"."AppSetting" ("key", "value", "updatedAt")
VALUES ('USD_TO_RWF_RATE', '1460', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
