import { describe, expect, it } from "vitest";
import { parseAddParam, plusMinutes } from "./schedule";

describe("parseAddParam", () => {
  it("prefills the start and a 90 minute end from a slot link", () => {
    expect(parseAddParam("2026-11-18T16:00")).toEqual({
      date: "2026-11-18",
      start: "16:00",
      end: "17:30",
    });
  });

  it("accepts a date alone and ignores bad input", () => {
    expect(parseAddParam("2026-11-18")).toEqual({ date: "2026-11-18", start: "", end: "" });
    expect(parseAddParam("2026-11-18T25:00")?.start).toBe("");
    expect(parseAddParam("tomorrow")).toBeNull();
    expect(parseAddParam(undefined)).toBeNull();
  });
});

describe("plusMinutes", () => {
  it("adds minutes and stops before midnight", () => {
    expect(plusMinutes("16:00", 90)).toBe("17:30");
    expect(plusMinutes("23:00", 90)).toBe("23:59");
  });
});
