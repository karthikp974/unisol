import { Injectable } from "@nestjs/common";
import { PermissionAction, TeacherRoleKind, UserType } from "@prisma/client";
import { PermissionDecision, PermissionRequest, PermissionSubject } from "./permission.types";
import { hasScopeBoundary, scopeContains } from "./scope.util";

const DEFAULT_TEACHER_ROLE_ACTIONS: Record<TeacherRoleKind, PermissionAction[]> = {
  STPO: [
    PermissionAction.VIEW_TEACHER_PORTAL,
    PermissionAction.VIEW_STUDENTS,
    PermissionAction.VIEW_ATTENDANCE
  ],
  CTPO: [
    PermissionAction.VIEW_TEACHER_PORTAL,
    PermissionAction.VIEW_STUDENTS,
    PermissionAction.VIEW_ATTENDANCE,
    PermissionAction.MARK_ATTENDANCE,
    PermissionAction.VIEW_FEES,
    PermissionAction.MARK_FEES,
    PermissionAction.MANAGE_TEAMS
  ],
  HTPO: [
    PermissionAction.VIEW_TEACHER_PORTAL,
    PermissionAction.VIEW_STUDENTS,
    PermissionAction.VIEW_ATTENDANCE,
    PermissionAction.MARK_ATTENDANCE,
    PermissionAction.VIEW_FEES,
    PermissionAction.MARK_FEES,
    PermissionAction.MANAGE_TIMETABLE,
    PermissionAction.MANAGE_TEAMS,
    PermissionAction.UPLOAD_RESULTS
  ]
};

@Injectable()
export class PermissionsService {
  can(user: PermissionSubject, request: PermissionRequest): PermissionDecision {
    if (user.type === UserType.ADMIN) {
      return { allowed: true, reason: "Admin has full ERP control." };
    }

    if (user.type === UserType.STUDENT) {
      return this.canStudent(user, request);
    }

    if (user.type === UserType.TEACHER) {
      return this.canTeacher(user, request);
    }

    return { allowed: false, reason: "Unknown user type." };
  }

  private canStudent(user: PermissionSubject, request: PermissionRequest): PermissionDecision {
    if (request.action !== PermissionAction.VIEW_STUDENT_PORTAL) {
      return { allowed: false, reason: "Students can only access their own student portal foundation." };
    }

    if (!this.campusBoundaryMatches(user, request)) {
      return { allowed: false, reason: "Campus boundary mismatch." };
    }

    return { allowed: true, reason: "Student can access own portal." };
  }

  private canTeacher(user: PermissionSubject, request: PermissionRequest): PermissionDecision {
    if (!this.campusBoundaryMatches(user, request)) {
      return { allowed: false, reason: "Campus boundary mismatch." };
    }

    for (const assignment of user.assignments) {
      const defaults = DEFAULT_TEACHER_ROLE_ACTIONS[assignment.role];
      const explicit = assignment.permissions as PermissionAction[];
      const allowedActions = new Set([...defaults, ...explicit]);

      if (!allowedActions.has(request.action)) {
        continue;
      }

      if (!hasScopeBoundary(request.scope ?? {}) || scopeContains(assignment, request.scope)) {
        return { allowed: true, reason: `${assignment.role} assignment allows this action in scope.` };
      }
    }

    return { allowed: false, reason: "No active teacher assignment allows this action in the requested scope." };
  }

  private campusBoundaryMatches(user: PermissionSubject, request: PermissionRequest): boolean {
    const scope = request.scope;
    if (!scope) {
      return true;
    }

    if (scope.campusGroupId && user.campusGroupId && scope.campusGroupId !== user.campusGroupId) {
      return false;
    }

    if (scope.campusId && user.campusId && scope.campusId !== user.campusId) {
      return false;
    }

    return true;
  }
}
