-- CreateEnum
CREATE TYPE "TodoFrequency" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Loan" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Saving" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "endDate" DATE,
ADD COLUMN     "frequency" "TodoFrequency" NOT NULL DEFAULT 'ONCE',
ADD COLUMN     "frequencyDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "remainingAmount" DECIMAL(15,2),
ADD COLUMN     "startDate" DATE;

-- CreateIndex
CREATE INDEX "Todo_userId_frequency_idx" ON "Todo"("userId", "frequency");
