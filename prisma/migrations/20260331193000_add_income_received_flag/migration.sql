ALTER TABLE "public"."Income"
ADD COLUMN "received" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Income_userId_received_idx"
ON "public"."Income"("userId", "received");
