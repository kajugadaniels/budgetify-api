ALTER TABLE "Transaction"
DROP CONSTRAINT IF EXISTS "Transaction_receiverIdentifier_check";

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
  OR
  (
    "recipientType" = 'MOMO_CODE'
    AND "receiverIdentifier" ~ '^[0-9]{3,12}$'
  )
);

ALTER TABLE "Transaction"
DROP CONSTRAINT IF EXISTS "Transaction_momo_recipient_type_check";

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_transfer_recipient_type_check"
CHECK (
  (
    "transferType" = 'MOMO_TO_MOMO'
    AND "recipientType" = 'PHONE'
  )
  OR
  (
    "transferType" = 'MOMO_TO_EKASH'
    AND "recipientType" IN ('PHONE', 'BANK_ACCOUNT')
  )
  OR
  (
    "transferType" = 'MOMO_PAY'
    AND "recipientType" = 'MOMO_CODE'
  )
);
