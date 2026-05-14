CREATE TABLE "SectionSubjectAssignment" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SectionSubjectAssignment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SectionSubjectAssignment" ("id", "sectionId", "subjectId", "isActive", "createdAt", "updatedAt")
SELECT
  CONCAT('secsub_', md5(CONCAT(s."id", ':', subj."id"))) AS "id",
  s."id" AS "sectionId",
  subj."id" AS "subjectId",
  true AS "isActive",
  NOW() AS "createdAt",
  NOW() AS "updatedAt"
FROM "Section" s
JOIN "AcademicClass" c ON c."id" = s."classId"
JOIN "Batch" b ON b."id" = c."batchId"
JOIN "Subject" subj ON subj."branchId" = b."branchId"
  AND subj."semesterNumber" = c."semesterNumber"
  AND subj."status" = 'ACTIVE'
  AND subj."isArchived" = false
WHERE s."status" = 'ACTIVE'
  AND s."isArchived" = false
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "SectionSubjectAssignment_sectionId_subjectId_key" ON "SectionSubjectAssignment"("sectionId", "subjectId");
CREATE INDEX "SectionSubjectAssignment_sectionId_isActive_idx" ON "SectionSubjectAssignment"("sectionId", "isActive");
CREATE INDEX "SectionSubjectAssignment_subjectId_isActive_idx" ON "SectionSubjectAssignment"("subjectId", "isActive");

ALTER TABLE "SectionSubjectAssignment" ADD CONSTRAINT "SectionSubjectAssignment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SectionSubjectAssignment" ADD CONSTRAINT "SectionSubjectAssignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
