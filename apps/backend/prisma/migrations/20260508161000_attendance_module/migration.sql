CREATE TYPE "AttendanceEntryStatus" AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT,
    "markedById" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "periodLabel" TEXT NOT NULL DEFAULT 'DAY',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" "AttendanceEntryStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceSession_sessionKey_key" ON "AttendanceSession"("sessionKey");
CREATE INDEX "AttendanceSession_sectionId_attendanceDate_idx" ON "AttendanceSession"("sectionId", "attendanceDate");
CREATE INDEX "AttendanceSession_subjectId_attendanceDate_idx" ON "AttendanceSession"("subjectId", "attendanceDate");
CREATE INDEX "AttendanceSession_markedById_attendanceDate_idx" ON "AttendanceSession"("markedById", "attendanceDate");
CREATE UNIQUE INDEX "AttendanceEntry_sessionId_studentProfileId_key" ON "AttendanceEntry"("sessionId", "studentProfileId");
CREATE INDEX "AttendanceEntry_studentProfileId_status_idx" ON "AttendanceEntry"("studentProfileId", "status");

ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
