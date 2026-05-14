ALTER TABLE "AcademicClass"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "Section"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "AcademicClass"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

UPDATE "Section"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

CREATE UNIQUE INDEX IF NOT EXISTS "AcademicClass_code_key" ON "AcademicClass"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Section_code_key" ON "Section"("code");
CREATE INDEX IF NOT EXISTS "AcademicClass_isArchived_idx" ON "AcademicClass"("isArchived");
CREATE INDEX IF NOT EXISTS "Section_isArchived_idx" ON "Section"("isArchived");
