-- Add responsible-party and financial default metadata to todos.

ALTER TABLE "Todo"
ADD COLUMN "responsibleUserId" UUID,
ADD COLUMN "defaultExpenseCategory" "ExpenseCategory",
ADD COLUMN "defaultPaymentMethod" "ExpensePaymentMethod",
ADD COLUMN "defaultMobileMoneyChannel" "ExpenseMobileMoneyChannel",
ADD COLUMN "defaultMobileMoneyNetwork" "ExpenseMobileMoneyNetwork",
ADD COLUMN "payee" TEXT,
ADD COLUMN "expenseNote" TEXT;

UPDATE "Todo"
SET "responsibleUserId" = "userId"
WHERE "responsibleUserId" IS NULL;

ALTER TABLE "Todo"
ALTER COLUMN "responsibleUserId" SET NOT NULL;

ALTER TABLE "Todo"
ADD CONSTRAINT "Todo_responsibleUserId_fkey"
FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

CREATE INDEX "Todo_responsibleUserId_idx" ON "Todo"("responsibleUserId");
CREATE INDEX "Todo_userId_responsibleUserId_idx" ON "Todo"("userId", "responsibleUserId");
