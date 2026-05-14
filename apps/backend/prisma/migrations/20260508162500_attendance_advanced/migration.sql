CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "AttendanceCorrectionRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "entries" JSONB NOT NULL,
    "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceHoliday" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceHoliday_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AttendanceCorrectionRequest_sessionId_status_idx" ON "AttendanceCorrectionRequest"("sessionId", "status");
CREATE INDEX "AttendanceCorrectionRequest_requestedById_status_idx" ON "AttendanceCorrectionRequest"("requestedById", "status");
CREATE UNIQUE INDEX "AttendanceHoliday_campusId_holidayDate_key" ON "AttendanceHoliday"("campusId", "holidayDate");
CREATE INDEX "AttendanceHoliday_holidayDate_idx" ON "AttendanceHoliday"("holidayDate");

ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AttendanceHoliday" ADD CONSTRAINT "AttendanceHoliday_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
