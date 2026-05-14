-- Classes and sections are created under a branch first.
-- A batch can be assigned later from the Batches module.
ALTER TABLE "AcademicClass" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

UPDATE "AcademicClass" class
SET "branchId" = batch."branchId"
FROM "Batch" batch
WHERE class."batchId" = batch.id
  AND class."branchId" IS NULL;

ALTER TABLE "AcademicClass" ALTER COLUMN "branchId" SET NOT NULL;
ALTER TABLE "AcademicClass" ALTER COLUMN "batchId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AcademicClass_branchId_fkey'
  ) THEN
    ALTER TABLE "AcademicClass"
      ADD CONSTRAINT "AcademicClass_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "AcademicClass" DROP CONSTRAINT IF EXISTS "AcademicClass_batchId_fkey";
ALTER TABLE "AcademicClass"
  ADD CONSTRAINT "AcademicClass_batchId_fkey"
  FOREIGN KEY ("batchId") REFERENCES "Batch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AcademicClass_branchId_idx" ON "AcademicClass"("branchId");
