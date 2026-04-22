-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('ACTIVE', 'RECORDED', 'COMPLETED', 'SKIPPED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Todo"
ADD COLUMN "status" "TodoStatus" NOT NULL DEFAULT 'ACTIVE';

-- Backfill existing todos
UPDATE "Todo"
SET "status" = CASE
  WHEN "done" = true THEN 'COMPLETED'::"TodoStatus"
  ELSE 'ACTIVE'::"TodoStatus"
END;

-- DropIndex
DROP INDEX IF EXISTS "Todo_userId_done_idx";

-- CreateIndex
CREATE INDEX "Todo_userId_status_idx" ON "Todo"("userId", "status");

-- AlterTable
ALTER TABLE "Todo"
DROP COLUMN "done";
