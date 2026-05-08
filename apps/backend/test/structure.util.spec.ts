import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  assertValidBatchYears,
  assertValidClassPlacement,
  assertValidSubjectSemester,
  classLabelForSemester,
  normalizeCode,
  normalizeName
} from "../src/core/structure.util";

describe("structure utilities", () => {
  it("normalizes codes and names consistently", () => {
    expect(normalizeCode(" ai ml ")).toBe("AI_ML");
    expect(normalizeName("  Artificial   Intelligence  ")).toBe("Artificial Intelligence");
  });

  it("rejects invalid batch years", () => {
    expect(() => assertValidBatchYears(2024, 2028)).not.toThrow();
    expect(() => assertValidBatchYears(2024, 2024)).toThrow(BadRequestException);
    expect(() => assertValidBatchYears(2024, 2035)).toThrow(BadRequestException);
  });

  it("keeps class year aligned to semester", () => {
    expect(() => assertValidClassPlacement(1, 1, 8)).not.toThrow();
    expect(() => assertValidClassPlacement(2, 3, 8)).not.toThrow();
    expect(() => assertValidClassPlacement(1, 3, 8)).toThrow(BadRequestException);
    expect(() => assertValidClassPlacement(5, 9, 8)).toThrow(BadRequestException);
  });

  it("validates subjects and generates readable class labels", () => {
    expect(() => assertValidSubjectSemester(8, 8)).not.toThrow();
    expect(() => assertValidSubjectSemester(9, 8)).toThrow(BadRequestException);
    expect(classLabelForSemester(1)).toBe("1st Year / Sem 1");
    expect(classLabelForSemester(4)).toBe("2nd Year / Sem 4");
  });
});
