import { describe, expect, it } from "vitest";
import {
  listHref,
  orIlike,
  otherPages,
  pageBounds,
  pageCount,
  pageSummary,
  pageWindow,
  param,
  parsePage,
  parseSearch,
  recentMonths,
} from "./list";

describe("param", () => {
  it("returns the first non-empty value", () => {
    expect(param("abc")).toBe("abc");
    expect(param(["x", "y"])).toBe("x");
    expect(param("  ")).toBeUndefined();
    expect(param("")).toBeUndefined();
    expect(param(undefined)).toBeUndefined();
  });
});

describe("parseSearch", () => {
  it("trims, collapses spaces and caps the length", () => {
    expect(parseSearch("  Alya   Putri ")).toBe("Alya Putri");
    expect(parseSearch("a".repeat(300))).toHaveLength(100);
    expect(parseSearch("")).toBeUndefined();
  });
});

describe("parsePage", () => {
  it("accepts positive whole numbers and falls back to 1", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("3.9")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("99999999999")).toBe(100_000);
  });
});

describe("pageBounds and pageCount", () => {
  it("gives the inclusive row range of a page", () => {
    expect(pageBounds(1)).toEqual({ from: 0, to: 19 });
    expect(pageBounds(3)).toEqual({ from: 40, to: 59 });
    expect(pageBounds(2, 10)).toEqual({ from: 10, to: 19 });
  });

  it("counts pages and always has at least one", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(20)).toBe(1);
    expect(pageCount(21)).toBe(2);
    expect(pageCount(132)).toBe(7);
  });
});

describe("pageWindow", () => {
  it("shows every page when there are few", () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("collapses long stretches into a gap", () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, "gap", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "gap", 9, 10, 11, "gap", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "gap", 19, 20]);
  });

  it("fills a gap of a single page with that page", () => {
    expect(pageWindow(4, 8)).toEqual([1, 2, 3, 4, 5, "gap", 8]);
    expect(pageWindow(5, 8)).toEqual([1, "gap", 4, 5, 6, 7, 8]);
  });
});

describe("pageSummary", () => {
  it("describes the rows on a page", () => {
    expect(pageSummary(1, 132)).toEqual({ first: 1, last: 20 });
    expect(pageSummary(7, 132)).toEqual({ first: 121, last: 132 });
    expect(pageSummary(1, 0)).toEqual({ first: 0, last: 0 });
  });
});

describe("orIlike", () => {
  it("matches the text in each column", () => {
    expect(orIlike(["name", "email"], "alya")).toBe('name.ilike."%alya%",email.ilike."%alya%"');
  });

  it("keeps commas, brackets and quotes inside the pattern", () => {
    expect(orIlike(["name"], "a,b)")).toBe('name.ilike."%a,b)%"');
    expect(orIlike(["name"], 'say "hi"')).toBe('name.ilike."%say \\"hi\\"%"');
  });

  it("treats % and _ as plain characters", () => {
    expect(orIlike(["name"], "100%")).toBe('name.ilike."%100\\\\%%"');
    expect(orIlike(["name"], "a_b")).toBe('name.ilike."%a\\\\_b%"');
  });
});

describe("listHref", () => {
  it("leaves out empty values and page 1", () => {
    expect(listHref("/admin/invoices", { q: "alya", status: undefined })).toBe(
      "/admin/invoices?q=alya",
    );
    expect(listHref("/admin/invoices", { q: "alya" }, 1)).toBe("/admin/invoices?q=alya");
    expect(listHref("/admin/invoices", {}, 1)).toBe("/admin/invoices");
  });

  it("adds the page, using a custom parameter when asked", () => {
    expect(listHref("/admin/invoices", { q: "alya" }, 3)).toBe("/admin/invoices?q=alya&page=3");
    expect(listHref("/x", { past: "2" }, 4, "upcoming")).toBe("/x?past=2&upcoming=4");
  });
});

describe("recentMonths", () => {
  it("lists the current month first and goes back across years", () => {
    const months = recentMonths("2026-02-17", 4);
    expect(months.map((month) => month.value)).toEqual([
      "2026-02-01",
      "2026-01-01",
      "2025-12-01",
      "2025-11-01",
    ]);
    expect(months[0].label).toBe("February 2026");
  });
});

describe("otherPages", () => {
  it("keeps the pages of the other lists and leaves out page 1", () => {
    expect(otherPages({ upcoming: 2, past: 1, notes: 4 }, "upcoming")).toEqual({ notes: "4" });
    expect(otherPages({ upcoming: 1 }, "past")).toEqual({});
  });
});
