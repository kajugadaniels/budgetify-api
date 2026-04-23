-- CreateEnum
CREATE TYPE "TodoOccurrenceStatus" AS ENUM (
  'SCHEDULED',
  'RECORDED',
  'SKIPPED',
  'OVERDUE',
  'COMPLETED'
);

-- AlterTable
ALTER TABLE "TodoRecording"
ADD COLUMN "todoOccurrenceId" UUID;

-- CreateTable
CREATE TABLE "TodoOccurrence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "todoId" UUID NOT NULL,
  "occurrenceDate" DATE NOT NULL,
  "status" "TodoOccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TodoOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TodoRecording_todoOccurrenceId_key" ON "TodoRecording"("todoOccurrenceId");

-- CreateIndex
CREATE INDEX "TodoOccurrence_todoId_active_occurrenceDate_idx"
ON "TodoOccurrence"("todoId", "active", "occurrenceDate");

-- CreateIndex
CREATE INDEX "TodoOccurrence_todoId_occurrenceDate_idx"
ON "TodoOccurrence"("todoId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "TodoOccurrence_status_active_idx"
ON "TodoOccurrence"("status", "active");

-- Backfill current schedule occurrences from the existing todo arrays.
INSERT INTO "TodoOccurrence" (
  "todoId",
  "occurrenceDate",
  "status",
  "active",
  "resolvedAt"
)
SELECT
  todo_source."todoId",
  todo_source."occurrenceDate"::date,
  CASE
    WHEN todo_source."occurrenceDate" = ANY(todo_source."recordedOccurrenceDates") THEN 'RECORDED'::"TodoOccurrenceStatus"
    WHEN todo_source."todoStatus" = 'SKIPPED' THEN 'SKIPPED'::"TodoOccurrenceStatus"
    WHEN todo_source."todoStatus" = 'COMPLETED' THEN 'COMPLETED'::"TodoOccurrenceStatus"
    ELSE 'SCHEDULED'::"TodoOccurrenceStatus"
  END,
  true,
  CASE
    WHEN todo_source."occurrenceDate" = ANY(todo_source."recordedOccurrenceDates") THEN CURRENT_TIMESTAMP
    WHEN todo_source."todoStatus" IN ('SKIPPED', 'COMPLETED') THEN CURRENT_TIMESTAMP
    ELSE NULL
  END
FROM (
  SELECT
    todo."id" AS "todoId",
    todo."status" AS "todoStatus",
    todo."recordedOccurrenceDates",
    occurrence_date AS "occurrenceDate"
  FROM "Todo" AS todo
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN cardinality(todo."occurrenceDates") > 0 THEN todo."occurrenceDates"
      WHEN todo."startDate" IS NOT NULL THEN ARRAY[to_char(todo."startDate", 'YYYY-MM-DD')]
      ELSE ARRAY[]::text[]
    END
  ) AS occurrence_date
  WHERE todo."deletedAt" IS NULL
) AS todo_source;

-- Link existing todo recordings to their occurrence records.
UPDATE "TodoRecording" AS recording
SET "todoOccurrenceId" = occurrence."id"
FROM "TodoOccurrence" AS occurrence
WHERE occurrence."todoId" = recording."todoId"
  AND occurrence."occurrenceDate" = recording."occurrenceDate";

-- AddForeignKey
ALTER TABLE "TodoRecording"
ADD CONSTRAINT "TodoRecording_todoOccurrenceId_fkey"
FOREIGN KEY ("todoOccurrenceId") REFERENCES "TodoOccurrence"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoOccurrence"
ADD CONSTRAINT "TodoOccurrence_todoId_fkey"
FOREIGN KEY ("todoId") REFERENCES "Todo"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
