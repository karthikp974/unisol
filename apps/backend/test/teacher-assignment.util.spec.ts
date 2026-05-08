import { BadRequestException } from "@nestjs/common";
import { TeacherRoleKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertNoDuplicateAssignments, validateAssignmentShape } from "../src/teachers/teacher-assignment.util";

const base = {
  campusId: "campus",
  programId: "program",
  branchId: "branch",
  batchId: "batch",
  classId: "class"
};

describe("teacher assignment rules", () => {
  it("allows HTPO without section or subject", () => {
    expect(() => validateAssignmentShape({ ...base, role: TeacherRoleKind.HTPO })).not.toThrow();
  });

  it("requires section for CTPO and STPO", () => {
    expect(() => validateAssignmentShape({ ...base, role: TeacherRoleKind.CTPO })).toThrow(BadRequestException);
    expect(() => validateAssignmentShape({ ...base, role: TeacherRoleKind.STPO, subjectId: "subject" })).toThrow(BadRequestException);
  });

  it("requires subject for STPO only", () => {
    expect(() => validateAssignmentShape({ ...base, role: TeacherRoleKind.STPO, sectionId: "section" })).toThrow(BadRequestException);
    expect(() =>
      validateAssignmentShape({ ...base, role: TeacherRoleKind.STPO, sectionId: "section", subjectId: "subject" })
    ).not.toThrow();
  });

  it("rejects duplicate assignment tuples", () => {
    expect(() =>
      assertNoDuplicateAssignments([
        { ...base, role: TeacherRoleKind.HTPO },
        { ...base, role: TeacherRoleKind.HTPO }
      ])
    ).toThrow(BadRequestException);
  });
});
