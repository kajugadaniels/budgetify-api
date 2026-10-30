-- CreateEnum
CREATE TYPE "FinancialMessageChannel" AS ENUM ('SMS', 'EMAIL', 'API');

-- CreateEnum
CREATE TYPE "FinancialMessageDirection" AS ENUM ('CREDIT', 'DEBIT', 'REVERSAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FinancialMessageParseStatus" AS ENUM ('UNPARSED', 'PARSED', 'NEEDS_DETAILS', 'REJECTED');

-- CreateEnum
CREATE TYPE "FinancialMessageImportStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FinancialMessageDuplicateStatus" AS ENUM ('NOT_CHECKED', 'CLEAR', 'POSSIBLE_DUPLICATE', 'CONFIRMED_DUPLICATE');

-- CreateTable
CREATE TABLE "ShortcutImportCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviceName" VARCHAR(80) NOT NULL,
    "tokenPrefix" VARCHAR(24) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShortcutImportCredential_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShortcutImportCredential_expiry_check" CHECK ("expiresAt" > "createdAt"),
    CONSTRAINT "ShortcutImportCredential_token_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$')
);

-- CreateTable
CREATE TABLE "FinancialMessageImport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "credentialId" UUID,
    "clientEventId" UUID NOT NULL,
    "sourceHint" VARCHAR(64) NOT NULL,
    "providerCode" VARCHAR(64),
    "channel" "FinancialMessageChannel" NOT NULL,
    "direction" "FinancialMessageDirection" NOT NULL DEFAULT 'UNKNOWN',
    "parseStatus" "FinancialMessageParseStatus" NOT NULL DEFAULT 'UNPARSED',
    "status" "FinancialMessageImportStatus" NOT NULL DEFAULT 'PENDING',
    "duplicateStatus" "FinancialMessageDuplicateStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "currency" "Currency",
    "amount" DECIMAL(15,2),
    "fee" DECIMAL(15,2),
    "messageReceivedAt" TIMESTAMP(3) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "senderName" TEXT,
    "senderIdentifier" TEXT,
    "accountLastFour" VARCHAR(4),
    "providerReference" TEXT,
    "fingerprint" CHAR(64),
    "parserVersion" VARCHAR(40),
    "parseConfidence" DECIMAL(5,4),
    "rawMessageCiphertext" TEXT,
    "rawMessagePurgedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedReceivedTransactionId" UUID,
    "confirmedIncomeId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialMessageImport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialMessageImport_amount_check" CHECK ("amount" IS NULL OR "amount" > 0),
    CONSTRAINT "FinancialMessageImport_fee_check" CHECK ("fee" IS NULL OR "fee" >= 0),
    CONSTRAINT "FinancialMessageImport_confidence_check" CHECK ("parseConfidence" IS NULL OR ("parseConfidence" >= 0 AND "parseConfidence" <= 1)),
    CONSTRAINT "FinancialMessageImport_expiry_check" CHECK ("expiresAt" > "createdAt"),
    CONSTRAINT "FinancialMessageImport_income_link_check" CHECK ("confirmedIncomeId" IS NULL OR "confirmedReceivedTransactionId" IS NOT NULL)
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortcutImportCredential_tokenPrefix_key" ON "ShortcutImportCredential"("tokenPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "ShortcutImportCredential_tokenHash_key" ON "ShortcutImportCredential"("tokenHash");

-- CreateIndex
CREATE INDEX "ShortcutImportCredential_userId_revokedAt_idx" ON "ShortcutImportCredential"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "ShortcutImportCredential_expiresAt_idx" ON "ShortcutImportCredential"("expiresAt");

-- CreateIndex
CREATE INDEX "ShortcutImportCredential_lastUsedAt_idx" ON "ShortcutImportCredential"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMessageImport_confirmedReceivedTransactionId_key" ON "FinancialMessageImport"("confirmedReceivedTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMessageImport_confirmedIncomeId_key" ON "FinancialMessageImport"("confirmedIncomeId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMessageImport_userId_clientEventId_key" ON "FinancialMessageImport"("userId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMessageImport_userId_providerCode_providerReference_key" ON "FinancialMessageImport"("userId", "providerCode", "providerReference");

-- CreateIndex
CREATE INDEX "FinancialMessageImport_userId_status_createdAt_id_idx" ON "FinancialMessageImport"("userId", "status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "FinancialMessageImport_userId_providerCode_status_idx" ON "FinancialMessageImport"("userId", "providerCode", "status");

-- CreateIndex
CREATE INDEX "FinancialMessageImport_userId_fingerprint_idx" ON "FinancialMessageImport"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "FinancialMessageImport_credentialId_createdAt_idx" ON "FinancialMessageImport"("credentialId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialMessageImport_status_expiresAt_idx" ON "FinancialMessageImport"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "ShortcutImportCredential" ADD CONSTRAINT "ShortcutImportCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialMessageImport" ADD CONSTRAINT "FinancialMessageImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialMessageImport" ADD CONSTRAINT "FinancialMessageImport_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "ShortcutImportCredential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialMessageImport" ADD CONSTRAINT "FinancialMessageImport_confirmedReceivedTransactionId_fkey" FOREIGN KEY ("confirmedReceivedTransactionId") REFERENCES "ReceivedTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialMessageImport" ADD CONSTRAINT "FinancialMessageImport_confirmedIncomeId_fkey" FOREIGN KEY ("confirmedIncomeId") REFERENCES "Income"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
