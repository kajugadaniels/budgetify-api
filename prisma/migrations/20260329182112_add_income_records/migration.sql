-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('SALARY', 'FREELANCE', 'DIVIDENDS', 'RENTAL', 'SIDE_HUSTLE', 'OTHER');

-- CreateTable
CREATE TABLE "Income" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "category" "IncomeCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- CreateIndex
CREATE INDEX "Income_deletedAt_idx" ON "Income"("deletedAt");

-- CreateIndex
CREATE INDEX "Income_date_idx" ON "Income"("date");

-- CreateIndex
CREATE INDEX "Income_userId_category_idx" ON "Income"("userId", "category");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
