import { describe, expect, it } from "vitest";
import {
  isEditable,
  logbookProgress,
  monthFromSlug,
  monthRange,
  summarizeMonths,
  type LessonRow,
} from "./logbook";

const past = (id: string, status: LessonRow["status"] = "scheduled"): LessonRow => ({
  id,
  class_id: "class-1",
  start_at: "2020-03-10T09:00:00Z",
  end_at: "2020-03-10T10:30:00Z",
  status,
});

const future: LessonRow = {
  id: "future",
  class_id: "class-1",
  start_at: "2999-03-10T09:00:00Z",
  end_at: "2999-03-10T10:30:00Z",
  status: "scheduled",
};

describe("month helpers", () => {
  it("accepts only YYYY-MM slugs", () => {
    expect(monthFromSlug("2026-11")).toBe("2026-11-01");
    expect(monthFromSlug("2026-13")).toBeNull();
    expect(monthFromSlug("nov-2026")).toBeNull();
  });

  it("covers a WIB month and rolls over the year", () => {
    expect(monthRange("2026-12-01")).toEqual({
      from: "2026-12-01T00:00:00+07:00",
      to: "2027-01-01T00:00:00+07:00",
    });
  });
});

describe("logbookProgress", () => {
  it("is ready when every finished lesson has an entry", () => {
    const result = logbookProgress([past("a"), past("b")], new Set(["a", "b"]));
    expect(result).toMatchObject({ total: 2, logged: 2, missing: 0, unfinished: 0, ready: true });
  });

  it("is not ready while a lesson has no entry or has not finished", () => {
    expect(logbookProgress([past("a"), past("b")], new Set(["a"])).missing).toBe(1);
    expect(logbookProgress([past("a"), future], new Set(["a"])).ready).toBe(false);
  });

  it("ignores cancelled lessons", () => {
    const result = logbookProgress([past("a"), past("b", "cancelled")], new Set(["a"]));
    expect(result).toMatchObject({ total: 1, ready: true });
  });
});

describe("summarizeMonths", () => {
  it("groups lessons by class and WIB month with the matching logbook", () => {
    const logbook = {
      id: "lb",
      class_id: "class-1",
      month: "2020-03-01",
      status: "draft" as const,
      review_note: null,
    };
    const [summary] = summarizeMonths([past("a")], [{ lesson_id: "a" }], [logbook]);
    expect(summary).toMatchObject({ month: "2020-03-01", logbook, progress: { ready: true } });
  });
});

describe("isEditable", () => {
  it("allows editing before submission and after changes were requested", () => {
    expect(isEditable(undefined)).toBe(true);
    expect(isEditable("changes_requested")).toBe(true);
    expect(isEditable("submitted")).toBe(false);
    expect(isEditable("approved")).toBe(false);
  });
});
