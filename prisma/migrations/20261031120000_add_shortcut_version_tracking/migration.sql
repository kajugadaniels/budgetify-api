ALTER TABLE "FinancialMessageImport"
ADD COLUMN "shortcutVersion" INTEGER;

ALTER TABLE "FinancialMessageImport"
ADD CONSTRAINT "FinancialMessageImport_shortcut_version_check"
CHECK ("shortcutVersion" IS NULL OR "shortcutVersion" > 0);

CREATE INDEX "FinancialMessageImport_shortcutVersion_createdAt_idx"
ON "FinancialMessageImport"("shortcutVersion", "createdAt");
