CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'BANK', 'MOBILE_MONEY', 'CARD', 'OTHER');
CREATE TYPE "ExpenseMobileMoneyChannel" AS ENUM ('MERCHANT_CODE', 'P2P_TRANSFER');
CREATE TYPE "ExpenseMobileMoneyProvider" AS ENUM ('MTN_RWANDA', 'OTHER');
CREATE TYPE "ExpenseMobileMoneyNetwork" AS ENUM ('ON_NET', 'OFF_NET');

ALTER TABLE "Expense"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'RWF',
ADD COLUMN "amountRwf" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "feeAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "feeAmountRwf" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "totalAmountRwf" DECIMAL(15, 2) NOT NULL DEFAULT 0,
ADD COLUMN "paymentMethod" "ExpensePaymentMethod" NOT NULL DEFAULT 'CASH',
ADD COLUMN "mobileMoneyChannel" "ExpenseMobileMoneyChannel",
ADD COLUMN "mobileMoneyProvider" "ExpenseMobileMoneyProvider",
ADD COLUMN "mobileMoneyNetwork" "ExpenseMobileMoneyNetwork";

UPDATE "Expense"
SET "amountRwf" = amount,
    "totalAmountRwf" = amount;

CREATE TABLE "MobileMoneyTariff" (
  "id" UUID NOT NULL,
  "provider" "ExpenseMobileMoneyProvider" NOT NULL,
  "channel" "ExpenseMobileMoneyChannel" NOT NULL,
  "network" "ExpenseMobileMoneyNetwork",
  "minAmount" DECIMAL(15, 2) NOT NULL,
  "maxAmount" DECIMAL(15, 2) NOT NULL,
  "feeAmount" DECIMAL(15, 2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MobileMoneyTariff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_userId_paymentMethod_idx" ON "Expense"("userId", "paymentMethod");
CREATE INDEX "Expense_userId_currency_idx" ON "Expense"("userId", "currency");
CREATE INDEX "MobileMoneyTariff_provider_channel_network_active_idx"
ON "MobileMoneyTariff"("provider", "channel", "network", "active");
CREATE INDEX "MobileMoneyTariff_active_minAmount_maxAmount_idx"
ON "MobileMoneyTariff"("active", "minAmount", "maxAmount");

INSERT INTO "MobileMoneyTariff" (
  "id",
  "provider",
  "channel",
  "network",
  "minAmount",
  "maxAmount",
  "feeAmount",
  "updatedAt"
) VALUES
  (gen_random_uuid(), 'MTN_RWANDA', 'MERCHANT_CODE', NULL, 0, 10000000, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 1, 1000, 20, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 1001, 10000, 100, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 10001, 150000, 250, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 150001, 2000000, 1500, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 2000001, 5000000, 3000, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'ON_NET', 5000001, 10000000, 5000, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 1, 1000, 100, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 1001, 10000, 200, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 10001, 150000, 350, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 150001, 2000000, 1600, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 2000001, 5000000, 3000, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MTN_RWANDA', 'P2P_TRANSFER', 'OFF_NET', 5000001, 10000000, 5000, CURRENT_TIMESTAMP);
