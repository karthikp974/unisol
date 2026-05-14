ALTER TYPE "PermissionAction" ADD VALUE 'MANAGE_PROMOTIONS';

CREATE TABLE "StudentPromotionHistory" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "fromSectionId" TEXT NOT NULL,
    "toSectionId" TEXT NOT NULL,
    "promotedById" TEXT NOT NULL,
    "note" TEXT,
    "promotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPromotionHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentPromotionHistory_studentProfileId_promotedAt_idx" ON "StudentPromotionHistory"("studentProfileId", "promotedAt");
CREATE INDEX "StudentPromotionHistory_fromSectionId_toSectionId_idx" ON "StudentPromotionHistory"("fromSectionId", "toSectionId");
CREATE INDEX "StudentPromotionHistory_promotedById_idx" ON "StudentPromotionHistory"("promotedById");

ALTER TABLE "StudentPromotionHistory" ADD CONSTRAINT "StudentPromotionHistory_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPromotionHistory" ADD CONSTRAINT "StudentPromotionHistory_fromSectionId_fkey" FOREIGN KEY ("fromSectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPromotionHistory" ADD CONSTRAINT "StudentPromotionHistory_toSectionId_fkey" FOREIGN KEY ("toSectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentPromotionHistory" ADD CONSTRAINT "StudentPromotionHistory_promotedById_fkey" FOREIGN KEY ("promotedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
