ALTER TYPE "PermissionAction" ADD VALUE 'VIEW_TEAMS';

CREATE TYPE "StudentTeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "StudentTeamMemberRole" AS ENUM ('LEADER', 'MEMBER');

CREATE TABLE "StudentTeam" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StudentTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "role" "StudentTeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentTeam_sectionId_name_key" ON "StudentTeam"("sectionId", "name");
CREATE INDEX "StudentTeam_sectionId_status_idx" ON "StudentTeam"("sectionId", "status");
CREATE INDEX "StudentTeam_createdById_idx" ON "StudentTeam"("createdById");
CREATE UNIQUE INDEX "StudentTeamMember_teamId_studentProfileId_key" ON "StudentTeamMember"("teamId", "studentProfileId");
CREATE INDEX "StudentTeamMember_studentProfileId_idx" ON "StudentTeamMember"("studentProfileId");

ALTER TABLE "StudentTeam" ADD CONSTRAINT "StudentTeam_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTeam" ADD CONSTRAINT "StudentTeam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentTeamMember" ADD CONSTRAINT "StudentTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "StudentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentTeamMember" ADD CONSTRAINT "StudentTeamMember_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
