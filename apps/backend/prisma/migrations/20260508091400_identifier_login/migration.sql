-- Add an optional admin/general username for identifier-based login.
-- Teachers still use TeacherProfile.employeeCode and students use StudentProfile.rollNumber.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
