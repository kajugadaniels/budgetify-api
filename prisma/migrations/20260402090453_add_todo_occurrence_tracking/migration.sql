-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "occurrenceDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "recordedOccurrenceDates" TEXT[] DEFAULT ARRAY[]::TEXT[];
