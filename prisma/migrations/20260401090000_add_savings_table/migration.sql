CREATE TABLE "public"."Saving" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Saving_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Saving"
ADD CONSTRAINT "Saving_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Saving_userId_idx" ON "public"."Saving"("userId");
CREATE INDEX "Saving_deletedAt_idx" ON "public"."Saving"("deletedAt");
CREATE INDEX "Saving_date_idx" ON "public"."Saving"("date");
