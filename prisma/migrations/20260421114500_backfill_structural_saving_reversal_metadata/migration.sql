WITH reversal_candidates AS (
  SELECT
    withdrawal.id AS reversal_id,
    deposit.id AS original_id,
    ROW_NUMBER() OVER (
      PARTITION BY withdrawal.id
      ORDER BY deposit.date DESC, deposit."createdAt" DESC
    ) AS match_rank
  FROM "SavingTransaction" AS withdrawal
  INNER JOIN "SavingTransaction" AS deposit
    ON deposit."savingId" = withdrawal."savingId"
   AND deposit.type = 'DEPOSIT'
   AND deposit."deletedAt" IS NULL
   AND deposit.id <> withdrawal.id
   AND deposit."amountRwf" = withdrawal."amountRwf"
   AND TO_CHAR(deposit.date AT TIME ZONE 'UTC', 'YYYY-MM-DD') =
       SUBSTRING(withdrawal.note FROM '([0-9]{4}-[0-9]{2}-[0-9]{2})')
  WHERE withdrawal.type = 'WITHDRAWAL'
    AND withdrawal."deletedAt" IS NULL
    AND withdrawal."reversalOfTransactionId" IS NULL
    AND withdrawal.note LIKE 'Reversal of deposit from %'
)
UPDATE "SavingTransaction" AS withdrawal
SET "reversalOfTransactionId" = candidate.original_id
FROM reversal_candidates AS candidate
WHERE withdrawal.id = candidate.reversal_id
  AND candidate.match_rank = 1;
