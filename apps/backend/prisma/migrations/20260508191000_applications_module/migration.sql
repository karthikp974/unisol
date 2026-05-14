ALTER TYPE "PermissionAction" ADD VALUE 'VIEW_APPLICATIONS';
ALTER TYPE "PermissionAction" ADD VALUE 'MANAGE_APPLICATIONS';

CREATE TYPE "StudentApplicationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED');
CREATE TYPE "StudentApplicationCategory" AS ENUM ('GENERAL', 'ATTENDANCE', 'FEES', 'RESULTS', 'CERTIFICATE', 'LEAVE', 'OTHER');

CREATE TABLE "StudentApplication" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "category" "StudentApplicationCategory" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "StudentApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentApplication_studentProfileId_status_idx" ON "StudentApplication"("studentProfileId", "status");
CREATE INDEX "StudentApplication_category_status_idx" ON "StudentApplication"("category", "status");
CREATE INDEX "StudentApplication_reviewedById_idx" ON "StudentApplication"("reviewedById");

ALTER TABLE "StudentApplication" ADD CONSTRAINT "StudentApplication_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentApplication" ADD CONSTRAINT "StudentApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
