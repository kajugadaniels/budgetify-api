ALTER TABLE "public"."Todo"
ADD COLUMN "done" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Todo_userId_done_idx"
ON "public"."Todo"("userId", "done");
