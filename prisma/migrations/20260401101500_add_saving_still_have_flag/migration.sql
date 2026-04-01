ALTER TABLE "public"."Saving"
ADD COLUMN "stillHave" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Saving_userId_stillHave_idx"
ON "public"."Saving"("userId", "stillHave");
