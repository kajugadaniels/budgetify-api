CREATE TYPE "TransactionRecipientType" AS ENUM (
  'PHONE',
  'BANK_ACCOUNT'
);

ALTER TABLE "Transaction"
DROP CONSTRAINT IF EXISTS "Transaction_receiverPhone_check";

ALTER TABLE "Transaction"
RENAME COLUMN "receiverPhone" TO "receiverIdentifier";

ALTER TABLE "Transaction"
ADD COLUMN "recipientType" "TransactionRecipientType"
NOT NULL DEFAULT 'PHONE';

ALTER TABLE "Transaction"
ALTER COLUMN "recipientType" DROP DEFAULT;

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_receiverIdentifier_check"
CHECK (
  (
    "recipientType" = 'PHONE'
    AND "receiverIdentifier" ~ '^[+]2507[0-9]{8}$'
  )
  OR
  (
    "recipientType" = 'BANK_ACCOUNT'
    AND "receiverIdentifier" ~ '^[0-9]{6,34}$'
  )
);

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_momo_recipient_type_check"
CHECK (
  "transferType" <> 'MOMO_TO_MOMO'
  OR "recipientType" = 'PHONE'
);