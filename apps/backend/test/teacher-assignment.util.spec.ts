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
const branchScope = {
  campusId: "campus",
  programId: "program",
  branchId: "branch"
};

describe("teacher assignment rules", () => {
  it("allows HTPO branch-level scope only", () => {
    expect(() => validateAssignmentShape({ ...branchScope, role: TeacherRoleKind.HTPO })).not.toThrow();
    expect(() => validateAssignmentShape({ ...base, role: TeacherRoleKind.HTPO })).toThrow(BadRequestException);
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
        { ...branchScope, role: TeacherRoleKind.HTPO },
        { ...branchScope, role: TeacherRoleKind.HTPO }
      ])
    ).toThrow(BadRequestException);
  });
});
