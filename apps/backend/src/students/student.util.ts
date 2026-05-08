import { BadRequestException } from "@nestjs/common";

export function normalizeRollNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeAdmissionNo(value?: string) {
  const normalized = value?.trim().toUpperCase().replace(/\s+/g, "");
  return normalized || undefined;
}

export function buildStudentFallbackEmail(rollNumber: string) {
  return `${normalizeRollNumber(rollNumber).toLowerCase()}@students.local`;
}

export function assertSectionMatchesCampus(sectionCampusId: string, campusId?: string) {
  if (campusId && campusId !== sectionCampusId) {
    throw new BadRequestException("Selected campus does not match the selected section.");
  }
}
