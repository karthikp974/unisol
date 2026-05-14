-- Keep the create-class UI batch-free while preserving existing batch-dependent modules.
-- Any unallocated class is held under a system batch for its branch until a real batch allocation is made.
INSERT INTO "Batch" ("id", "branchId", "startYear", "endYear", "batchCode", "createdAt", "updatedAt")
SELECT
  'system_' || branch.id,
  branch.id,
  0,
  0,
  'STRUCTURE_' || branch.id,
  NOW(),
  NOW()
FROM "Branch" branch
WHERE NOT EXISTS (
  SELECT 1 FROM "Batch" batch WHERE batch."batchCode" = 'STRUCTURE_' || branch.id
);

UPDATE "AcademicClass" class
SET "batchId" = 'system_' || class."branchId"
WHERE class."batchId" IS NULL;

ALTER TABLE "AcademicClass" ALTER COLUMN "batchId" SET NOT NULL;

ALTER TABLE "AcademicClass" DROP CONSTRAINT IF EXISTS "AcademicClass_batchId_fkey";
ALTER TABLE "AcademicClass"
  ADD CONSTRAINT "AcademicClass_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
