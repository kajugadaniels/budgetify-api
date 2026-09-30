CREATE TYPE "TransactionEventType" AS ENUM (
  'CREATED',
  'USSD_OPENED',
  'PROVIDER_RESULT_RECEIVED',
  'STATUS_CHANGED'
);

CREATE TYPE "TransactionEventSource" AS ENUM (
  'SYSTEM',
  'MOBILE_APP',
  'PROVIDER_SMS',
  'PROVIDER_API'
);

CREATE TABLE "TransactionEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transactionId" UUID NOT NULL,
  "type" "TransactionEventType" NOT NULL,
  "source" "TransactionEventSource" NOT NULL,
  "fromStatus" "TransactionStatus",
  "toStatus" "TransactionStatus",
  "clientEventId" TEXT,
  "providerReference" TEXT,
  "failureCode" TEXT,
  "failureReason" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TransactionEvent_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "TransactionEvent_transactionId_clientEventId_key"
ON "TransactionEvent"(
  "transactionId",
  "clientEventId"
);

CREATE INDEX
  "TransactionEvent_transactionId_occurredAt_idx"
ON "TransactionEvent"(
  "transactionId",
  "occurredAt"
);

CREATE INDEX
  "TransactionEvent_type_occurredAt_idx"
ON "TransactionEvent"(
  "type",
  "occurredAt"
);

CREATE INDEX
  "TransactionEvent_source_occurredAt_idx"
ON "TransactionEvent"(
  "source",
  "occurredAt"
);

ALTER TABLE "TransactionEvent"
ADD CONSTRAINT "TransactionEvent_transactionId_fkey"
FOREIGN KEY ("transactionId")
REFERENCES "Transaction"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

INSERT INTO "TransactionEvent" (
  "id",
  "transactionId",
  "type",
  "source",
  "fromStatus",
  "toStatus",
  "occurredAt",
  "createdAt"
)
SELECT
  gen_random_uuid(),
  "id",
  'CREATED'::"TransactionEventType",
  'SYSTEM'::"TransactionEventSource",
  NULL,
  'PENDING'::"TransactionStatus",
  "createdAt",
  "createdAt"
FROM "Transaction";