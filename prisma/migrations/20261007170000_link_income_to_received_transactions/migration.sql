ALTER TABLE "Income"
  ADD COLUMN "expectedAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "clientEventId" TEXT,
  ADD COLUMN "receivedTransactionId" UUID;

UPDATE "Income" SET "expectedAt" = "date" WHERE "received" = false;
UPDATE "Income" SET "receivedAt" = "date" WHERE "received" = true;

CREATE UNIQUE INDEX "Income_receivedTransactionId_key" ON "Income"("receivedTransactionId");
CREATE UNIQUE INDEX "Income_userId_clientEventId_key" ON "Income"("userId", "clientEventId");
CREATE INDEX "Income_userId_deletedAt_date_id_idx" ON "Income"("userId", "deletedAt", "date", "id");

ALTER TABLE "Income" ADD CONSTRAINT "Income_receivedTransactionId_fkey"
  FOREIGN KEY ("receivedTransactionId") REFERENCES "ReceivedTransaction"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
