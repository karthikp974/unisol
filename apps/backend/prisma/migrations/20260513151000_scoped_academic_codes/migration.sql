-- Department and branch codes are production master data scoped by their parent.
-- The same program/branch names can exist under multiple campuses and programs.
DROP INDEX IF EXISTS "Program_code_key";
DROP INDEX IF EXISTS "Branch_code_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Program_campusId_code_key" ON "Program"("campusId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_programId_code_key" ON "Branch"("programId", "code");
