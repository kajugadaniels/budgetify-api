ALTER TABLE "Saving"
ADD COLUMN "targetAmount" DECIMAL(15,2),
ADD COLUMN "targetCurrency" "Currency",
ADD COLUMN "targetAmountRwf" DECIMAL(15,2),
ADD COLUMN "startDate" DATE,
ADD COLUMN "endDate" DATE;

CREATE INDEX "Saving_userId_startDate_idx" ON "Saving"("userId", "startDate");
CREATE INDEX "Saving_userId_endDate_idx" ON "Saving"("userId", "endDate");
