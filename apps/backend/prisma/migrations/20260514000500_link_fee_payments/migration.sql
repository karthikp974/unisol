-- Link counter payments to the exact assigned fee when available.
-- Existing rows stay nullable so historical unlinked payments remain visible.
ALTER TABLE "FeePayment" ADD COLUMN "studentFeeAssignmentId" TEXT;

ALTER TABLE "FeePayment"
ADD CONSTRAINT "FeePayment_studentFeeAssignmentId_fkey"
FOREIGN KEY ("studentFeeAssignmentId") REFERENCES "StudentFeeAssignment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "FeePayment_studentFeeAssignmentId_status_idx" ON "FeePayment"("studentFeeAssignmentId", "status");
