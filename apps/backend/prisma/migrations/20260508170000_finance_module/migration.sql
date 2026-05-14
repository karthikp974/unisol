CREATE TYPE "FeePaymentMode" AS ENUM ('CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'OTHER');
CREATE TYPE "FeePaymentStatus" AS ENUM ('ACTIVE', 'REVERSED');

CREATE TABLE "FeeHead" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeHead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "feeHeadId" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "programId" TEXT,
    "branchId" TEXT,
    "batchId" TEXT,
    "classId" TEXT,
    "sectionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "feeHeadId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "FeePaymentMode" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "receivedById" TEXT NOT NULL,
    "status" "FeePaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeHead_code_key" ON "FeeHead"("code");
CREATE INDEX "FeeStructure_campusId_programId_branchId_batchId_classId_sectionId_idx" ON "FeeStructure"("campusId", "programId", "branchId", "batchId", "classId", "sectionId");
CREATE INDEX "FeeStructure_feeHeadId_isActive_idx" ON "FeeStructure"("feeHeadId", "isActive");
CREATE UNIQUE INDEX "FeePayment_receiptNo_key" ON "FeePayment"("receiptNo");
CREATE INDEX "FeePayment_studentProfileId_status_idx" ON "FeePayment"("studentProfileId", "status");
CREATE INDEX "FeePayment_feeHeadId_status_idx" ON "FeePayment"("feeHeadId", "status");
CREATE INDEX "FeePayment_paidAt_idx" ON "FeePayment"("paidAt");

ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_feeHeadId_fkey" FOREIGN KEY ("feeHeadId") REFERENCES "FeeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeHeadId_fkey" FOREIGN KEY ("feeHeadId") REFERENCES "FeeHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
