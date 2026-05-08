import { BadRequestException } from "@nestjs/common";

export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function assertValidBatchYears(startYear: number, endYear: number) {
  if (endYear <= startYear) {
    throw new BadRequestException("Batch end year must be greater than start year.");
  }

  if (endYear - startYear > 6) {
    throw new BadRequestException("Batch duration looks invalid. Please check start and end year.");
  }
}

export function assertValidClassPlacement(yearNumber: number, semesterNumber: number, programSemesters: number) {
  if (semesterNumber > programSemesters) {
    throw new BadRequestException(`Semester ${semesterNumber} exceeds program limit of ${programSemesters}.`);
  }

  const expectedYear = Math.ceil(semesterNumber / 2);
  if (yearNumber !== expectedYear) {
    throw new BadRequestException(`Semester ${semesterNumber} belongs to year ${expectedYear}.`);
  }
}

export function assertValidSubjectSemester(semesterNumber: number, programSemesters: number) {
  if (semesterNumber > programSemesters) {
    throw new BadRequestException(`Subject semester ${semesterNumber} exceeds program limit of ${programSemesters}.`);
  }
}

export function classLabelForSemester(semesterNumber: number) {
  const yearNumber = Math.ceil(semesterNumber / 2);
  return `${yearNumber}${ordinalSuffix(yearNumber)} Year / Sem ${semesterNumber}`;
}

function ordinalSuffix(value: number) {
  if (value === 1) return "st";
  if (value === 2) return "nd";
  if (value === 3) return "rd";
  return "th";
}
