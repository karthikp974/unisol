import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertSectionMatchesCampus, buildStudentFallbackEmail, normalizeAdmissionNo, normalizeRollNumber } from "../src/students/student.util";

describe("student utilities", () => {
  it("normalizes roll number and admission number", () => {
    expect(normalizeRollNumber("  24 cs 001 ")).toBe("24CS001");
    expect(normalizeAdmissionNo(" adm 123 ")).toBe("ADM123");
    expect(normalizeAdmissionNo(" ")).toBeUndefined();
  });

  it("builds stable fallback email", () => {
    expect(buildStudentFallbackEmail(" 24 CS 001 ")).toBe("24cs001@students.local");
  });

  it("rejects campus and section mismatch", () => {
    expect(() => assertSectionMatchesCampus("campus-a", "campus-a")).not.toThrow();
    expect(() => assertSectionMatchesCampus("campus-a", undefined)).not.toThrow();
    expect(() => assertSectionMatchesCampus("campus-a", "campus-b")).toThrow(BadRequestException);
  });
});
