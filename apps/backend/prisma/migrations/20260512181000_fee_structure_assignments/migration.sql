CREATE TYPE "StudentFeePaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL');

ALTER TABLE "FeeStructure" ADD COLUMN "feeName" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN "remarks" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN "createdById" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FeeStructure" ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "FeeStructure" fs
SET "feeName" = fh."name",
    "isArchived" = NOT fs."isActive",
    "archivedAt" = CASE WHEN fs."isActive" = false THEN NOW() ELSE NULL END
FROM "FeeHead" fh
WHERE fs."feeHeadId" = fh."id";

CREATE TABLE "StudentFeeAssignment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "feeStructureId" TEXT NOT NULL,
  "paymentStatus" "StudentFeePaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentFeeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentFeeAssignment_studentId_feeStructureId_key" ON "StudentFeeAssignment"("studentId", "feeStructureId");
CREATE INDEX "StudentFeeAssignment_studentId_paymentStatus_idx" ON "StudentFeeAssignment"("studentId", "paymentStatus");
CREATE INDEX "StudentFeeAssignment_feeStructureId_paymentStatus_idx" ON "StudentFeeAssignment"("feeStructureId", "paymentStatus");
CREATE INDEX "FeeStructure_isArchived_idx" ON "FeeStructure"("isArchived");
CREATE INDEX "FeeStructure_createdById_idx" ON "FeeStructure"("createdById");

ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFeeAssignment" ADD CONSTRAINT "StudentFeeAssignment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
