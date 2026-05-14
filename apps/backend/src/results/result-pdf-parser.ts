import { ResultEntryStatus } from "@prisma/client";

export type ParsedResultRow = {
  rollNumber: string;
  subjectCode: string;
  subjectName: string;
  internals: number | null;
  grade: string | null;
  credits: number | null;
  status: ResultEntryStatus;
};

export function parseResultRows(text: string): ParsedResultRow[] {
  const rows: ParsedResultRow[] = [];
  const lines = text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^\d+\s+([A-Z0-9-_/]+)\s+([A-Z0-9-_/]+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([A-Z0-9+\-]+|ABSENT|WITHHELD|AB|W)\s+(\d+(?:\.\d+)?)$/i);
    if (!match) continue;
    const grade = normalizeGrade(match[5]);
    rows.push({
      rollNumber: match[1].toUpperCase(),
      subjectCode: match[2].toUpperCase(),
      subjectName: match[3].trim(),
      internals: Number(match[4]),
      grade,
      credits: Number(match[6]),
      status: gradeToStatus(grade)
    });
  }

  return rows;
}

function normalizeGrade(value: string) {
  const grade = value.trim().toUpperCase();
  return grade === "--" ? null : grade;
}

function gradeToStatus(grade: string | null): ResultEntryStatus {
  if (!grade) return ResultEntryStatus.WITHHELD;
  if (["AB", "ABSENT"].includes(grade)) return ResultEntryStatus.ABSENT;
  if (["W", "WH", "WITHHELD"].includes(grade)) return ResultEntryStatus.WITHHELD;
  if (["F", "FAIL"].includes(grade)) return ResultEntryStatus.FAIL;
  return ResultEntryStatus.PASS;
}
