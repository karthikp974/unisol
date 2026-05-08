CREATE TYPE "StructureStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

ALTER TABLE "Campus" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Program" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Branch" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Batch" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AcademicClass" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Section" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Subject" ADD COLUMN "status" "StructureStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "Campus_status_idx" ON "Campus"("status");
CREATE INDEX "Program_status_idx" ON "Program"("status");
CREATE INDEX "Branch_status_idx" ON "Branch"("status");
CREATE INDEX "Batch_status_idx" ON "Batch"("status");
CREATE INDEX "AcademicClass_status_idx" ON "AcademicClass"("status");
CREATE INDEX "Section_status_idx" ON "Section"("status");
CREATE INDEX "Subject_status_idx" ON "Subject"("status");
