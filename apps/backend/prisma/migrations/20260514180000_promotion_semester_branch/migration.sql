-- Branch academic duration (years); each year = 2 linear semesters
ALTER TABLE "Branch" ADD COLUMN "durationYears" INTEGER NOT NULL DEFAULT 4;

UPDATE "Branch" b
SET "durationYears" = p."durationValue"
FROM "Program" p
WHERE b."programId" = p.id;

CREATE TYPE "PromotionType" AS ENUM ('STANDARD_NEXT_SEMESTER', 'INDIVIDUAL_REASSIGNMENT');

ALTER TABLE "StudentPromotionHistory" ADD COLUMN "promotionType" "PromotionType" NOT NULL DEFAULT 'STANDARD_NEXT_SEMESTER';
