CREATE TYPE "LoanBalanceEffect" AS ENUM ('INCREASE', 'DECREASE');

ALTER TABLE "LoanTransaction"
ADD COLUMN "balanceEffect" "LoanBalanceEffect" NOT NULL DEFAULT 'INCREASE',
ADD COLUMN "principalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "principalAmountRwf" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "interestAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN "interestAmountRwf" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "LoanTransaction"
SET
  "balanceEffect" = CASE
    WHEN "type" IN ('REPAYMENT', 'INTEREST_PAYMENT', 'WRITE_OFF') THEN 'DECREASE'::"LoanBalanceEffect"
    ELSE 'INCREASE'::"LoanBalanceEffect"
  END,
  "principalAmount" = CASE
    WHEN "type" IN ('DISBURSEMENT', 'REPAYMENT', 'ADJUSTMENT', 'WRITE_OFF', 'REVERSAL') THEN "amount"
    ELSE 0
  END,
  "principalAmountRwf" = CASE
    WHEN "type" IN ('DISBURSEMENT', 'REPAYMENT', 'ADJUSTMENT', 'WRITE_OFF', 'REVERSAL') THEN "amountRwf"
    ELSE 0
  END,
  "interestAmount" = CASE
    WHEN "type" IN ('INTEREST_CHARGE', 'INTEREST_PAYMENT') THEN "amount"
    ELSE 0
  END,
  "interestAmountRwf" = CASE
    WHEN "type" IN ('INTEREST_CHARGE', 'INTEREST_PAYMENT') THEN "amountRwf"
    ELSE 0
  END;
