-- Announcements production: audience BOTH, priority, pinning, teacher targeting, attachments, read receipts

CREATE TYPE "AnnouncementPriority" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');
CREATE TYPE "AnnouncementTeacherScope" AS ENUM ('NONE', 'INSTITUTION', 'CAMPUS', 'DEPARTMENT', 'BRANCH');

ALTER TYPE "AnnouncementAudience" ADD VALUE IF NOT EXISTS 'BOTH';

ALTER TABLE "Announcement" ADD COLUMN "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Announcement" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN "pinnedAt" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN "teacherScope" "AnnouncementTeacherScope" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Announcement" ADD COLUMN "teacherCampusId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "teacherProgramId" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "teacherBranchId" TEXT;

CREATE INDEX "Announcement_status_pinned_publishedAt_idx" ON "Announcement"("status", "pinned", "publishedAt");
CREATE INDEX "Announcement_priority_idx" ON "Announcement"("priority");

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_teacherCampusId_fkey" FOREIGN KEY ("teacherCampusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_teacherProgramId_fkey" FOREIGN KEY ("teacherProgramId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_teacherBranchId_fkey" FOREIGN KEY ("teacherBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementAttachment_storageKey_key" ON "AnnouncementAttachment"("storageKey");
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON "AnnouncementRead"("announcementId", "userId");
CREATE INDEX "AnnouncementRead_userId_idx" ON "AnnouncementRead"("userId");

ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
