import { describe, expect, it } from "vitest";
import { caretAfterDigits, clamp, parseDigits, stepValue } from "./number-input";

const rate = { min: 10_000, max: 10_000_000, step: 10_000 };
const seats = { min: 1, max: 100, step: 1 };

describe("parseDigits", () => {
  it("keeps only the digits", () => {
    expect(parseDigits("Rp 150.000")).toBe(150_000);
    expect(parseDigits("abc")).toBeNull();
    expect(parseDigits("")).toBeNull();
    expect(parseDigits("007")).toBe(7);
  });
});

describe("clamp", () => {
  it("keeps the value between min and max", () => {
    expect(clamp(5, seats)).toBe(5);
    expect(clamp(0, seats)).toBe(1);
    expect(clamp(500, seats)).toBe(100);
  });
});

describe("stepValue", () => {
  it("moves a rate by 10,000 and snaps odd values to the next multiple", () => {
    expect(stepValue(150_000, 1, rate)).toBe(160_000);
    expect(stepValue(150_000, -1, rate)).toBe(140_000);
    expect(stepValue(155_500, 1, rate)).toBe(160_000);
    expect(stepValue(155_500, -1, rate)).toBe(150_000);
  });

  it("stops at the limits", () => {
    expect(stepValue(10_000, -1, rate)).toBe(10_000);
    expect(stepValue(10_000_000, 1, rate)).toBe(10_000_000);
    expect(stepValue(5_000, 1, rate)).toBe(10_000);
  });

  it("starts from the minimum when the field is empty", () => {
    expect(stepValue(null, 1, rate)).toBe(10_000);
    expect(stepValue(null, -1, seats)).toBe(1);
  });

  it("moves seats by one", () => {
    expect(stepValue(2, 1, seats)).toBe(3);
    expect(stepValue(1, -1, seats)).toBe(1);
  });
});

describe("caretAfterDigits", () => {
  it("finds the caret position after a number of digits in formatted text", () => {
    expect(caretAfterDigits("1.500", 0)).toBe(0);
    expect(caretAfterDigits("1.500", 1)).toBe(1);
    expect(caretAfterDigits("1.500", 2)).toBe(3);
    expect(caretAfterDigits("1.500", 4)).toBe(5);
    expect(caretAfterDigits("1.500", 9)).toBe(5);
  });
});
