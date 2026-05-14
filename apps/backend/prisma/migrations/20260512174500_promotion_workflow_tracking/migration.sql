ALTER TABLE "StudentPromotionHistory" ADD COLUMN "fromClassId" TEXT;
ALTER TABLE "StudentPromotionHistory" ADD COLUMN "toClassId" TEXT;
ALTER TABLE "StudentPromotionHistory" ADD COLUMN "fromSemester" INTEGER;
ALTER TABLE "StudentPromotionHistory" ADD COLUMN "toSemester" INTEGER;

CREATE INDEX "StudentPromotionHistory_fromClassId_toClassId_idx" ON "StudentPromotionHistory"("fromClassId", "toClassId");
