-- CreateEnum
CREATE TYPE "ReceivedTransactionStatus" AS ENUM ('COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ReceivedTransactionEvidenceSource" AS ENUM ('PROVIDER_SMS', 'PROVIDER_API', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReceivedTransactionClassification" AS ENUM ('UNCLASSIFIED', 'INCOME', 'REIMBURSEMENT', 'LOAN_REPAYMENT', 'OWN_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "ReceivedTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "clientEventId" TEXT NOT NULL,
    "status" "ReceivedTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "classification" "ReceivedTransactionClassification" NOT NULL DEFAULT 'UNCLASSIFIED',
    "evidenceSource" "ReceivedTransactionEvidenceSource" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'RWF',
    "amount" INTEGER NOT NULL,
    "senderIdentifier" TEXT,
    "senderName" TEXT,
    "providerReference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedTransaction_reference_key" ON "ReceivedTransaction"("reference");

-- CreateIndex
CREATE INDEX "ReceivedTransaction_userId_occurredAt_idx" ON "ReceivedTransaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReceivedTransaction_userId_status_occurredAt_idx" ON "ReceivedTransaction"("userId", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "ReceivedTransaction_userId_classification_occurredAt_idx" ON "ReceivedTransaction"("userId", "classification", "occurredAt");

-- CreateIndex
CREATE INDEX "ReceivedTransaction_evidenceSource_occurredAt_idx" ON "ReceivedTransaction"("evidenceSource", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedTransaction_userId_clientEventId_key" ON "ReceivedTransaction"("userId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedTransaction_userId_providerReference_key" ON "ReceivedTransaction"("userId", "providerReference");

-- AddForeignKey
ALTER TABLE "ReceivedTransaction" ADD CONSTRAINT "ReceivedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
