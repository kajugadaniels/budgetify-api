CREATE TABLE "public"."Loan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Loan"
ADD CONSTRAINT "Loan_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Loan_userId_idx" ON "public"."Loan"("userId");
CREATE INDEX "Loan_deletedAt_idx" ON "public"."Loan"("deletedAt");
CREATE INDEX "Loan_date_idx" ON "public"."Loan"("date");
CREATE INDEX "Loan_userId_paid_idx" ON "public"."Loan"("userId", "paid");
