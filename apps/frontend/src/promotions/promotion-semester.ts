/** Promotion UI only: labels and academic-year index from linear semester. */

export function academicYearIndexFromLinearSemester(linearSemester: number): number {
  if (linearSemester < 1) return 1;
  return Math.ceil(linearSemester / 2);
}

export function semesterPairLabelForAcademicYear(academicYearIndex: number): string {
  return `${academicYearIndex}.1 / ${academicYearIndex}.2`;
}
