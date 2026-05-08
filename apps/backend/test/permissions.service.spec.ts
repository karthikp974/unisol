import { PermissionAction, TeacherRoleKind, UserType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { PermissionsService } from "../src/permissions/permissions.service";
import { PermissionSubject } from "../src/permissions/permission.types";

const service = new PermissionsService();

function teacher(assignments: PermissionSubject["assignments"]): PermissionSubject {
  return {
    id: "teacher-1",
    type: UserType.TEACHER,
    campusId: "kiet",
    campusGroupId: "kiet-kiek",
    assignments
  };
}

describe("PermissionsService", () => {
  it("allows admin to access every portal including DB portal", () => {
    const decision = service.can(
      { id: "admin-1", type: UserType.ADMIN, assignments: [] },
      { action: PermissionAction.VIEW_DB_PORTAL }
    );

    expect(decision.allowed).toBe(true);
  });

  it("allows a CTPO to manage only the assigned section", () => {
    const user = teacher([
      {
        id: "assignment-1",
        role: TeacherRoleKind.CTPO,
        campusGroupId: "kiet-kiek",
        campusId: "kiet",
        sectionId: "section-a",
        permissions: []
      }
    ]);

    expect(service.can(user, { action: PermissionAction.MANAGE_TEAMS, scope: { sectionId: "section-a" } }).allowed).toBe(
      true
    );
    expect(service.can(user, { action: PermissionAction.MANAGE_TEAMS, scope: { sectionId: "section-b" } }).allowed).toBe(
      false
    );
  });

  it("allows one teacher to act through multiple role assignments", () => {
    const user = teacher([
      {
        id: "ctpo",
        role: TeacherRoleKind.CTPO,
        sectionId: "section-a",
        permissions: []
      },
      {
        id: "htpo",
        role: TeacherRoleKind.HTPO,
        branchId: "ai-ml",
        permissions: []
      },
      {
        id: "stpo",
        role: TeacherRoleKind.STPO,
        subjectId: "dbms",
        permissions: []
      }
    ]);

    expect(service.can(user, { action: PermissionAction.MARK_FEES, scope: { sectionId: "section-a" } }).allowed).toBe(
      true
    );
    expect(service.can(user, { action: PermissionAction.UPLOAD_RESULTS, scope: { branchId: "ai-ml" } }).allowed).toBe(
      true
    );
    expect(service.can(user, { action: PermissionAction.MANAGE_TIMETABLE, scope: { subjectId: "dbms" } }).allowed).toBe(
      false
    );
  });

  it("blocks KIET/KIEK users from KIEW scoped data", () => {
    const user = teacher([
      {
        id: "assignment-1",
        role: TeacherRoleKind.HTPO,
        campusGroupId: "kiet-kiek",
        permissions: []
      }
    ]);

    const decision = service.can(user, {
      action: PermissionAction.VIEW_STUDENTS,
      scope: { campusGroupId: "kiew" }
    });

    expect(decision.allowed).toBe(false);
  });

  it("does not allow students to enter teacher or database portal", () => {
    const student: PermissionSubject = {
      id: "student-1",
      type: UserType.STUDENT,
      campusId: "kiet",
      campusGroupId: "kiet-kiek",
      assignments: []
    };

    expect(service.can(student, { action: PermissionAction.VIEW_STUDENT_PORTAL }).allowed).toBe(true);
    expect(service.can(student, { action: PermissionAction.VIEW_TEACHER_PORTAL }).allowed).toBe(false);
    expect(service.can(student, { action: PermissionAction.VIEW_DB_PORTAL }).allowed).toBe(false);
  });
});
