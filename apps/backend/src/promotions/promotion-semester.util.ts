/**
 * Promotion-only: linear semester index 1..2N (N = branch duration in years).
 * Display as Y.S (academic year . slot in year). Not used outside the promotions module.
 */

export function academicYearIndexFromLinearSemester(linearSemester: number): number {
  if (linearSemester < 1) return 1;
  return Math.ceil(linearSemester / 2);
}

export function slotInYearFromLinearSemester(linearSemester: number): 1 | 2 {
  return linearSemester % 2 === 1 ? 1 : 2;
}

export function formatLinearSemesterLabel(linearSemester: number): string {
  const y = academicYearIndexFromLinearSemester(linearSemester);
  const s = slotInYearFromLinearSemester(linearSemester);
  return `${y}.${s}`;
}

export function semesterPairLabelForAcademicYear(academicYearIndex: number): string {
  return `${academicYearIndex}.1 / ${academicYearIndex}.2`;
}

export function linearSemestersForAcademicYear(academicYearIndex: number): [number, number] {
  const first = 2 * academicYearIndex - 1;
  return [first, first + 1];
}

/** First semester index of the academic year immediately after the year containing `linearSemester`. */
export function nextAcademicYearFirstLinearSemester(linearSemester: number): number {
  const y = academicYearIndexFromLinearSemester(linearSemester);
  return 2 * y + 1;
}

export function maxLinearSemesterForBranchDurationYears(durationYears: number): number {
  return Math.max(0, durationYears) * 2;
}

export function isLinearSemesterWithinBranch(linearSemester: number, durationYears: number): boolean {
  const max = maxLinearSemesterForBranchDurationYears(durationYears);
  return linearSemester >= 1 && linearSemester <= max;
}

export function semesterPairsForBranch(durationYears: number): { academicYearIndex: number; label: string; semesterNumbers: [number, number] }[] {
  const n = Math.max(1, Math.floor(durationYears));
  const pairs: { academicYearIndex: number; label: string; semesterNumbers: [number, number] }[] = [];
  for (let y = 1; y <= n; y += 1) {
    const semesterNumbers = linearSemestersForAcademicYear(y);
    pairs.push({ academicYearIndex: y, label: semesterPairLabelForAcademicYear(y), semesterNumbers });
  }
  return pairs;
}
