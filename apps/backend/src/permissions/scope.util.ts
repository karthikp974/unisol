import { ScopeRef } from "../auth/auth.types";

const SCOPE_KEYS: (keyof ScopeRef)[] = [
  "campusGroupId",
  "campusId",
  "programId",
  "branchId",
  "batchId",
  "classId",
  "sectionId",
  "subjectId"
];

export function scopeContains(assignmentScope: ScopeRef, targetScope: ScopeRef = {}): boolean {
  let matchedBoundary = false;

  for (const key of SCOPE_KEYS) {
    const assigned = assignmentScope[key];
    const target = targetScope[key];

    if (assigned && target && assigned !== target) {
      return false;
    }

    if (assigned && target && assigned === target) {
      matchedBoundary = true;
    }

    if (target && key === "campusGroupId" && assignmentScope.campusId && !assignmentScope.campusGroupId) {
      return false;
    }
  }

  return matchedBoundary;
}

export function hasScopeBoundary(scope: ScopeRef): boolean {
  return SCOPE_KEYS.some((key) => Boolean(scope[key]));
}
