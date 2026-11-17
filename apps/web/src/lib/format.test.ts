import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatLessonWhen,
  formatMonth,
  formatRupiah,
  lessonMinutes,
} from "./format";
import { todayInWib, wibInstant, wibMonthOf } from "./time";

describe("formatRupiah", () => {
  it("groups thousands with dots and no decimals", () => {
    expect(formatRupiah(150000)).toBe("Rp150.000");
    expect(formatRupiah(1800000)).toBe("Rp1.800.000");
  });
});

describe("formatDuration", () => {
  it("formats whole hours, minutes and mixed values", () => {
    expect(formatDuration(720)).toBe("12h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(45)).toBe("45m");
  });

  it("never shows negative time", () => {
    expect(formatDuration(-30)).toBe("0m");
  });
});

describe("WIB handling", () => {
  it("builds an instant from WIB date and time", () => {
    expect(new Date(wibInstant("2026-11-17", "16:00")).toISOString()).toBe(
      "2026-11-17T09:00:00.000Z",
    );
  });

  it("assigns a late-night WIB lesson to the month it starts in", () => {
    expect(wibMonthOf(wibInstant("2026-11-30", "23:30"))).toBe("2026-11-01");
    expect(wibMonthOf("2026-11-30T17:30:00Z")).toBe("2026-12-01");
  });

  it("returns today's date as YYYY-MM-DD", () => {
    expect(todayInWib()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("lesson formatting", () => {
  const start = wibInstant("2026-11-17", "16:00");
  const end = wibInstant("2026-11-17", "17:30");

  it("shows the lesson time in WIB", () => {
    expect(formatLessonWhen(start, end)).toBe("Tue 17 Nov 2026 · 16:00–17:30 WIB");
  });

  it("computes minutes between start and end", () => {
    expect(lessonMinutes(start, end)).toBe(90);
  });

  it("formats a month label", () => {
    expect(formatMonth("2026-11-01")).toBe("November 2026");
  });
});
