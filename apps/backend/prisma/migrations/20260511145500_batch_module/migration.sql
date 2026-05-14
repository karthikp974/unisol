ALTER TABLE "Batch"
  ADD COLUMN IF NOT EXISTS "batchCode" TEXT,
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

UPDATE "Batch"
SET "isArchived" = true,
    "archivedAt" = COALESCE("archivedAt", "updatedAt")
WHERE "status" = 'ARCHIVED';

CREATE UNIQUE INDEX IF NOT EXISTS "Batch_batchCode_key" ON "Batch"("batchCode");
CREATE INDEX IF NOT EXISTS "Batch_isArchived_idx" ON "Batch"("isArchived");
