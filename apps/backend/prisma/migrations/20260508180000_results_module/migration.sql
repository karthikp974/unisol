ALTER TYPE "PermissionAction" ADD VALUE 'VIEW_RESULTS';

CREATE TYPE "ResultEntryStatus" AS ENUM ('PASS', 'FAIL', 'ABSENT', 'WITHHELD');

CREATE TABLE "ResultEntry" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "semesterNumber" INTEGER NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'SEMESTER',
    "internals" DECIMAL(5,2),
    "externals" DECIMAL(5,2),
    "totalMarks" DECIMAL(5,2),
    "grade" TEXT,
    "credits" DECIMAL(4,2),
    "status" "ResultEntryStatus" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResultEntry_studentProfileId_subjectId_examType_key" ON "ResultEntry"("studentProfileId", "subjectId", "examType");
CREATE INDEX "ResultEntry_studentProfileId_semesterNumber_idx" ON "ResultEntry"("studentProfileId", "semesterNumber");
CREATE INDEX "ResultEntry_subjectId_status_idx" ON "ResultEntry"("subjectId", "status");

ALTER TABLE "ResultEntry" ADD CONSTRAINT "ResultEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultEntry" ADD CONSTRAINT "ResultEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResultEntry" ADD CONSTRAINT "ResultEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
