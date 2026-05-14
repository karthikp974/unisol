ALTER TYPE "PermissionAction" ADD VALUE 'MANAGE_FEEDBACK';
ALTER TYPE "PermissionAction" ADD VALUE 'VIEW_FEEDBACK_ANALYTICS';
ALTER TYPE "PermissionAction" ADD VALUE 'SUBMIT_FEEDBACK';

CREATE TYPE "FeedbackFormType" AS ENUM ('GUEST_LECTURE', 'SEMESTER_EXAM', 'WORKSHOP', 'SEMINAR', 'ACADEMIC_EVENT', 'OTHER');
CREATE TYPE "FeedbackQuestionType" AS ENUM ('RATING_SCALE', 'YES_NO', 'MULTIPLE_CHOICE', 'PARAGRAPH');
CREATE TYPE "FeedbackFormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TABLE "FeedbackForm" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formType" "FeedbackFormType" NOT NULL,
    "customType" TEXT,
    "campusId" TEXT,
    "programId" TEXT,
    "branchId" TEXT,
    "batchId" TEXT,
    "classId" TEXT,
    "sectionId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "status" "FeedbackFormStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackQuestion" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "FeedbackQuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackAnswer" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,

    CONSTRAINT "FeedbackAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FeedbackForm_status_endsAt_idx" ON "FeedbackForm"("status", "endsAt");
CREATE INDEX "FeedbackForm_campusId_status_idx" ON "FeedbackForm"("campusId", "status");
CREATE INDEX "FeedbackForm_sectionId_status_idx" ON "FeedbackForm"("sectionId", "status");
CREATE INDEX "FeedbackForm_createdById_idx" ON "FeedbackForm"("createdById");

CREATE INDEX "FeedbackQuestion_formId_order_idx" ON "FeedbackQuestion"("formId", "order");
CREATE INDEX "FeedbackSubmission_formId_submittedAt_idx" ON "FeedbackSubmission"("formId", "submittedAt");
CREATE INDEX "FeedbackSubmission_studentProfileId_idx" ON "FeedbackSubmission"("studentProfileId");
CREATE INDEX "FeedbackAnswer_questionId_idx" ON "FeedbackAnswer"("questionId");

ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeedbackQuestion" ADD CONSTRAINT "FeedbackQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FeedbackForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FeedbackForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackAnswer" ADD CONSTRAINT "FeedbackAnswer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FeedbackSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackAnswer" ADD CONSTRAINT "FeedbackAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FeedbackQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "FeedbackAnswer_submissionId_questionId_key" ON "FeedbackAnswer"("submissionId", "questionId");
