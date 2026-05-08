import { PermissionAction, UserType } from "@prisma/client";
import { AuthUser, ScopeRef } from "../auth/auth.types";

export type PermissionRequest = {
  action: PermissionAction;
  scope?: ScopeRef;
};

export type PermissionDecision = {
  allowed: boolean;
  reason: string;
};

export type PermissionSubject = Pick<AuthUser, "id" | "type" | "campusId" | "campusGroupId" | "assignments">;

export const ADMIN_ACTIONS = new Set<PermissionAction>(Object.values(PermissionAction));

export const STUDENT_ACTIONS = new Set<PermissionAction>([PermissionAction.VIEW_STUDENT_PORTAL]);

export const PORTAL_ACTION_BY_USER_TYPE: Record<UserType, PermissionAction> = {
  ADMIN: PermissionAction.VIEW_ADMIN_PORTAL,
  TEACHER: PermissionAction.VIEW_TEACHER_PORTAL,
  STUDENT: PermissionAction.VIEW_STUDENT_PORTAL
};
