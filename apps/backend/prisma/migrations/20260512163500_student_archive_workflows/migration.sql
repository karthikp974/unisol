ALTER TABLE "StudentProfile" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "StudentProfile" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentProfile" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "StudentProfile_isArchived_idx" ON "StudentProfile"("isArchived");
