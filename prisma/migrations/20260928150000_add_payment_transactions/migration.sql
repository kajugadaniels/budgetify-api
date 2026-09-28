CREATE TYPE "TransactionTransferType" AS ENUM (
  'MOMO_TO_MOMO',
  'MOMO_TO_EKASH'
);

CREATE TYPE "TransactionStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REVERSED'
);

CREATE TYPE "TransactionCategory" AS ENUM (
  'TRANSPORT',
  'GROCERIES',
  'BILLS',
  'RENT',
  'HEALTHCARE',
  'EDUCATION',
  'FOOD_DINING',
  'SHOPPING',
  'FAMILY',
  'ENTERTAINMENT',
  'OTHER'
);

CREATE TABLE "Transaction" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "reference" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "transferType" "TransactionTransferType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "category" "TransactionCategory" NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'RWF',
  "amount" INTEGER NOT NULL,
  "feeAmount" INTEGER NOT NULL,
  "totalAmount" INTEGER NOT NULL,
  "receiverPhone" TEXT NOT NULL,
  "receiver_name" TEXT,
  "note" TEXT,
  "tariffVersion" TEXT NOT NULL,
  "tariffSource" TEXT NOT NULL,
  "providerReference" TEXT,
  "failureCode" TEXT,
  "failureReason" TEXT,
  "processedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Transaction_amount_check" CHECK ("amount" BETWEEN 1 AND 10000000),
  CONSTRAINT "Transaction_feeAmount_check" CHECK ("feeAmount" >= 0),
  CONSTRAINT "Transaction_totalAmount_check" CHECK ("totalAmount" = "amount" + "feeAmount"),
  CONSTRAINT "Transaction_receiverPhone_check" CHECK ("receiverPhone" ~ '^[+]2507[0-9]{8}$'),
  CONSTRAINT "Transaction_receiverName_check" CHECK (
    "receiver_name" IS NULL OR btrim("receiver_name") <> ''
  )
);

CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");
CREATE UNIQUE INDEX "Transaction_providerReference_key" ON "Transaction"("providerReference");
CREATE UNIQUE INDEX "Transaction_userId_idempotencyKey_key"
ON "Transaction"("userId", "idempotencyKey");
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
CREATE INDEX "Transaction_userId_status_createdAt_idx"
ON "Transaction"("userId", "status", "createdAt");
CREATE INDEX "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt");
CREATE INDEX "Transaction_transferType_createdAt_idx"
ON "Transaction"("transferType", "createdAt");

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
