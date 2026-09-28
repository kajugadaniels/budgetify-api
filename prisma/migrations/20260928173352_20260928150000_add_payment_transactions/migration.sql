-- AlterTable
ALTER TABLE "LoanTransaction" ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "balanceEffect" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TodoOccurrence" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "id" DROP DEFAULT;
