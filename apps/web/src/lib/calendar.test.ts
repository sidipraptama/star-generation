import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildHref,
  countOccurrences,
  isValidDate,
  layoutDay,
  parseCalendarParams,
  rangeTitle,
  shiftDate,
  visibleDays,
  visibleRange,
  weekStart,
} from "./calendar";
import { coverUpcoming } from "./hours";
import { wibDateOf, wibInstant, wibMinutesOfDay } from "./time";

describe("weeks and months", () => {
  it("starts the week on Monday", () => {
    expect(weekStart("2026-11-17")).toBe("2026-11-16");
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekStart("2026-11-22")).toBe("2026-11-16");
  });

  it("shows seven days in week view and six full weeks in month view", () => {
    expect(visibleDays("week", "2026-11-17")).toHaveLength(7);
    const month = visibleDays("month", "2026-11-17");
    expect(month).toHaveLength(42);
    expect(month[0]).toBe("2026-10-26");
    expect(month[41]).toBe("2026-12-06");
  });

  it("returns a half-open range", () => {
    expect(visibleRange("week", "2026-11-17")).toEqual({ from: "2026-11-16", to: "2026-11-23" });
  });

  it("moves by week or by month", () => {
    expect(shiftDate("week", "2026-11-17", 1)).toBe("2026-11-24");
    expect(shiftDate("week", "2026-11-17", -1)).toBe("2026-11-10");
    expect(shiftDate("month", "2026-11-17", 1)).toBe("2026-12-01");
    expect(shiftDate("month", "2026-01-31", -1)).toBe("2025-12-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
  });

  it("titles the visible range", () => {
    expect(rangeTitle("month", "2026-11-17")).toBe("November 2026");
    expect(rangeTitle("week", "2026-11-17")).toBe("16–22 Nov 2026");
    expect(rangeTitle("week", "2026-11-30")).toBe("30 Nov – 6 Dec 2026");
    expect(rangeTitle("week", "2026-12-30")).toBe("28 Dec 2026 – 3 Jan 2027");
  });
});

describe("parameters", () => {
  it("falls back to the week of today for missing or invalid input", () => {
    expect(parseCalendarParams({}, "2026-11-17")).toEqual({ view: "week", date: "2026-11-17" });
    expect(parseCalendarParams({ view: "year", date: "2026-02-31" }, "2026-11-17")).toEqual({
      view: "week",
      date: "2026-11-17",
    });
    expect(parseCalendarParams({ view: "month", date: "2026-12-01" }, "2026-11-17")).toEqual({
      view: "month",
      date: "2026-12-01",
    });
  });

  it("validates dates strictly", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("17-11-2026")).toBe(false);
  });

  it("builds links without empty parameters", () => {
    expect(buildHref("/admin/schedule", { view: "week", tutor: "", date: "2026-11-17" })).toBe(
      "/admin/schedule?view=week&date=2026-11-17",
    );
    expect(buildHref("/admin/schedule", {})).toBe("/admin/schedule");
  });
});

describe("WIB helpers", () => {
  it("assigns late-night lessons to the WIB date", () => {
    expect(wibDateOf("2026-11-30T17:30:00Z")).toBe("2026-12-01");
    expect(wibDateOf(wibInstant("2026-11-30", "23:30"))).toBe("2026-11-30");
  });

  it("returns minutes since midnight in WIB", () => {
    expect(wibMinutesOfDay(wibInstant("2026-11-17", "16:30"))).toBe(16 * 60 + 30);
  });
});

describe("recurring lessons", () => {
  it("counts the chosen weekdays between two dates, inclusive", () => {
    expect(countOccurrences("2026-11-16", "2026-11-29", [1, 3])).toBe(4);
    expect(countOccurrences("2026-11-16", "2026-11-16", [2])).toBe(0);
    expect(countOccurrences("2026-11-20", "2026-11-16", [1])).toBe(0);
  });
});

describe("layoutDay", () => {
  const lesson = (start: number, end: number) => ({ startMinutes: start, endMinutes: end });

  it("keeps separate lessons full width", () => {
    const [first, second] = layoutDay([lesson(600, 690), lesson(720, 810)]);
    expect([first.lane, first.lanes, second.lane, second.lanes]).toEqual([0, 1, 0, 1]);
  });

  it("puts overlapping lessons side by side", () => {
    const placed = layoutDay([lesson(600, 720), lesson(630, 690), lesson(700, 760)]);
    expect(placed.map((p) => [p.lane, p.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [1, 2],
    ]);
  });

  it("does not widen unrelated lessons that share a day", () => {
    const placed = layoutDay([lesson(600, 700), lesson(650, 720), lesson(900, 960)]);
    expect(placed[2].lanes).toBe(1);
  });
});

describe("coverUpcoming", () => {
  const lesson = (id: string, day: string) => ({
    id,
    start_at: wibInstant(day, "16:00"),
    end_at: wibInstant(day, "17:30"),
  });

  it("covers lessons in order until the hours run out", () => {
    const covered = coverUpcoming(200, [
      lesson("c", "2026-12-20"),
      lesson("a", "2026-12-06"),
      lesson("b", "2026-12-13"),
    ]);
    expect([covered.get("a"), covered.get("b"), covered.get("c")]).toEqual([true, true, false]);
  });

  it("covers nothing when there are no hours left", () => {
    expect(coverUpcoming(0, [lesson("a", "2026-12-06")]).get("a")).toBe(false);
    expect(coverUpcoming(-30, [lesson("a", "2026-12-06")]).get("a")).toBe(false);
  });
});
