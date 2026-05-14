ALTER TABLE "Program"
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "Branch"
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "Program"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

UPDATE "Branch"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

WITH duplicate_departments AS (
  SELECT
    p."id",
    c."code" AS "campusCode",
    p."code",
    COUNT(*) OVER (PARTITION BY p."code") AS "duplicateCount"
  FROM "Program" p
  JOIN "Campus" c ON c."id" = p."campusId"
)
UPDATE "Program" p
SET "code" = duplicate_departments."campusCode" || '_' || duplicate_departments."code"
FROM duplicate_departments
WHERE p."id" = duplicate_departments."id"
  AND duplicate_departments."duplicateCount" > 1;

WITH duplicate_branches AS (
  SELECT
    b."id",
    p."code" AS "departmentCode",
    b."code",
    COUNT(*) OVER (PARTITION BY b."code") AS "duplicateCount"
  FROM "Branch" b
  JOIN "Program" p ON p."id" = b."programId"
)
UPDATE "Branch" b
SET "code" = duplicate_branches."departmentCode" || '_' || duplicate_branches."code"
FROM duplicate_branches
WHERE b."id" = duplicate_branches."id"
  AND duplicate_branches."duplicateCount" > 1;

ALTER TABLE "Program" DROP CONSTRAINT IF EXISTS "Program_campusId_code_key";
ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_programId_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Program_code_key" ON "Program"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_code_key" ON "Branch"("code");

CREATE INDEX IF NOT EXISTS "Program_isArchived_idx" ON "Program"("isArchived");
CREATE INDEX IF NOT EXISTS "Branch_isArchived_idx" ON "Branch"("isArchived");
