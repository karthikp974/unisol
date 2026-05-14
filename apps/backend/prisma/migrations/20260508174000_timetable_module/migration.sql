CREATE TYPE "TimetableSlotStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "TimetableSlot" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subjectId" TEXT,
    "teacherProfileId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "status" "TimetableSlotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TimetableSlot_sectionId_dayOfWeek_startTime_endTime_key" ON "TimetableSlot"("sectionId", "dayOfWeek", "startTime", "endTime");
CREATE INDEX "TimetableSlot_teacherProfileId_dayOfWeek_status_idx" ON "TimetableSlot"("teacherProfileId", "dayOfWeek", "status");
CREATE INDEX "TimetableSlot_classId_sectionId_status_idx" ON "TimetableSlot"("classId", "sectionId", "status");

ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TimetableSlot" ADD CONSTRAINT "TimetableSlot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
