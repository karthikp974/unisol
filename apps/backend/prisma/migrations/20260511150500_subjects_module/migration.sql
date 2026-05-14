ALTER TABLE "Subject"
  ADD COLUMN IF NOT EXISTS "batchId" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "Subject"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

WITH duplicate_subjects AS (
  SELECT
    s."id",
    b."code" AS "branchCode",
    s."code",
    COUNT(*) OVER (PARTITION BY s."code") AS "duplicateCount"
  FROM "Subject" s
  JOIN "Branch" b ON b."id" = s."branchId"
)
UPDATE "Subject" s
SET "code" = duplicate_subjects."branchCode" || '_' || duplicate_subjects."code"
FROM duplicate_subjects
WHERE s."id" = duplicate_subjects."id"
  AND duplicate_subjects."duplicateCount" > 1;

ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_branchId_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Subject_code_key" ON "Subject"("code");
CREATE INDEX IF NOT EXISTS "Subject_batchId_idx" ON "Subject"("batchId");
CREATE INDEX IF NOT EXISTS "Subject_isArchived_idx" ON "Subject"("isArchived");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Subject_batchId_fkey'
  ) THEN
    ALTER TABLE "Subject"
      ADD CONSTRAINT "Subject_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
