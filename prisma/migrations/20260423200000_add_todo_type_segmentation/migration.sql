-- CreateEnum
CREATE TYPE "TodoType" AS ENUM ('WISHLIST', 'PLANNED_SPEND', 'RECURRING_OBLIGATION');

-- AlterTable
ALTER TABLE "Todo"
ADD COLUMN "type" "TodoType" NOT NULL DEFAULT 'WISHLIST';

-- Backfill recurring schedules as operational obligations.
UPDATE "Todo"
SET "type" = 'RECURRING_OBLIGATION'
WHERE "frequency" <> 'ONCE';

-- Index
CREATE INDEX "Todo_userId_type_idx" ON "Todo"("userId", "type");
