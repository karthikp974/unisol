CREATE TABLE IF NOT EXISTS "Syllabus" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SyllabusUnit" (
  "id" TEXT NOT NULL,
  "syllabusId" TEXT NOT NULL,
  "unitTitle" TEXT NOT NULL,
  "unitOrder" INTEGER NOT NULL,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyllabusUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Syllabus_subjectId_isArchived_key" ON "Syllabus"("subjectId", "isArchived");
CREATE INDEX IF NOT EXISTS "Syllabus_subjectId_idx" ON "Syllabus"("subjectId");
CREATE INDEX IF NOT EXISTS "Syllabus_isArchived_idx" ON "Syllabus"("isArchived");

CREATE UNIQUE INDEX IF NOT EXISTS "SyllabusUnit_syllabusId_unitOrder_key" ON "SyllabusUnit"("syllabusId", "unitOrder");
CREATE INDEX IF NOT EXISTS "SyllabusUnit_syllabusId_idx" ON "SyllabusUnit"("syllabusId");
CREATE INDEX IF NOT EXISTS "SyllabusUnit_isArchived_idx" ON "SyllabusUnit"("isArchived");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Syllabus_subjectId_fkey') THEN
    ALTER TABLE "Syllabus"
      ADD CONSTRAINT "Syllabus_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyllabusUnit_syllabusId_fkey') THEN
    ALTER TABLE "SyllabusUnit"
      ADD CONSTRAINT "SyllabusUnit_syllabusId_fkey" FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
