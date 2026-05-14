-- Restore campus-first fields and direct section campus ownership.
ALTER TABLE "Campus"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Section"
  ADD COLUMN IF NOT EXISTS "campusId" TEXT;

UPDATE "Section" section
SET "campusId" = program."campusId"
FROM "AcademicClass" academic_class
JOIN "Batch" batch ON batch.id = academic_class."batchId"
JOIN "Branch" branch ON branch.id = batch."branchId"
JOIN "Program" program ON program.id = branch."programId"
WHERE section."classId" = academic_class.id
  AND section."campusId" IS NULL;

ALTER TABLE "Section"
  ALTER COLUMN "campusId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Section_campusId_fkey'
  ) THEN
    ALTER TABLE "Section"
      ADD CONSTRAINT "Section_campusId_fkey"
      FOREIGN KEY ("campusId") REFERENCES "Campus"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Campus_isActive_idx" ON "Campus"("isActive");
CREATE INDEX IF NOT EXISTS "Section_campusId_idx" ON "Section"("campusId");
