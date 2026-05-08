import { BadRequestException } from "@nestjs/common";
import { TeacherRoleKind } from "@prisma/client";

export type TeacherAssignmentInput = {
  campusId: string;
  programId: string;
  branchId: string;
  batchId: string;
  classId: string;
  sectionId?: string;
  subjectId?: string;
  role: TeacherRoleKind;
};

export function validateAssignmentShape(assignment: TeacherAssignmentInput) {
  if ((assignment.role === TeacherRoleKind.CTPO || assignment.role === TeacherRoleKind.STPO) && !assignment.sectionId) {
    throw new BadRequestException(`${assignment.role} assignment requires a section.`);
  }

  if (assignment.role === TeacherRoleKind.STPO && !assignment.subjectId) {
    throw new BadRequestException("STPO assignment requires a subject.");
  }

  if (assignment.role === TeacherRoleKind.HTPO && assignment.subjectId) {
    throw new BadRequestException("HTPO assignment must not include a subject.");
  }

  if (assignment.role === TeacherRoleKind.CTPO && assignment.subjectId) {
    throw new BadRequestException("CTPO assignment must not include a subject.");
  }
}

export function assignmentKey(assignment: TeacherAssignmentInput) {
  return [
    assignment.campusId,
    assignment.programId,
    assignment.branchId,
    assignment.batchId,
    assignment.classId,
    assignment.role,
    assignment.sectionId ?? "",
    assignment.subjectId ?? ""
  ].join("|");
}

export function assertNoDuplicateAssignments(assignments: TeacherAssignmentInput[]) {
  const seen = new Set<string>();
  for (const assignment of assignments) {
    const key = assignmentKey(assignment);
    if (seen.has(key)) {
      throw new BadRequestException("Duplicate teacher assignment found.");
    }
    seen.add(key);
  }
}
