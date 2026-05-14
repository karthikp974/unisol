import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertSectionMatchesCampus, buildStudentFallbackEmail, normalizeRollNumber } from "../src/students/student.util";

describe("student utilities", () => {
  it("normalizes roll number", () => {
    expect(normalizeRollNumber("  24 cs 001 ")).toBe("24CS001");
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
