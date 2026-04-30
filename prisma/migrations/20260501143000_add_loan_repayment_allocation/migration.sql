CREATE TYPE "LoanRepaymentAllocation" AS ENUM ('INTEREST_FIRST', 'PRINCIPAL_FIRST');

ALTER TABLE "Loan"
ADD COLUMN "repaymentAllocation" "LoanRepaymentAllocation" NOT NULL DEFAULT 'INTEREST_FIRST';
