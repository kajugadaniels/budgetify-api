-- CreateTable
CREATE TABLE "TodoRecording" (
    "id" UUID NOT NULL,
    "todoId" UUID NOT NULL,
    "expenseId" UUID,
    "occurrenceDate" DATE NOT NULL,
    "baseAmount" DECIMAL(15,2) NOT NULL,
    "feeAmount" DECIMAL(15,2) NOT NULL,
    "totalChargedAmount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" "ExpensePaymentMethod" NOT NULL,
    "mobileMoneyChannel" "ExpenseMobileMoneyChannel",
    "mobileMoneyNetwork" "ExpenseMobileMoneyNetwork",
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" UUID NOT NULL,

    CONSTRAINT "TodoRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoRecording_expenseId_key" ON "TodoRecording"("expenseId");

-- CreateIndex
CREATE INDEX "TodoRecording_todoId_recordedAt_idx" ON "TodoRecording"("todoId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "TodoRecording_recordedByUserId_idx" ON "TodoRecording"("recordedByUserId");

-- CreateIndex
CREATE INDEX "TodoRecording_occurrenceDate_idx" ON "TodoRecording"("occurrenceDate");

-- AddForeignKey
ALTER TABLE "TodoRecording" ADD CONSTRAINT "TodoRecording_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "Todo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoRecording" ADD CONSTRAINT "TodoRecording_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoRecording" ADD CONSTRAINT "TodoRecording_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
