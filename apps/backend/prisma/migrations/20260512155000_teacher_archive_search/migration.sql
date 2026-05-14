ALTER TABLE "TeacherProfile" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TeacherProfile" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "TeacherProfile_isArchived_idx" ON "TeacherProfile"("isArchived");
