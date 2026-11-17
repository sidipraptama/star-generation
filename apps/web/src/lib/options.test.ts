import { describe, expect, it } from "vitest";
import { escapeLike, filterOptions, PAGE_SIZE, parseOffset, toPage } from "./options";

const options = [
  { value: "1", label: "Budi Santoso", hint: "budi@example.com" },
  { value: "2", label: "Sari Wulandari", hint: "sari@example.com" },
  { value: "3", label: "Math Club" },
];

describe("filterOptions", () => {
  it("returns everything for an empty search", () => {
    expect(filterOptions(options, "  ")).toHaveLength(3);
  });

  it("matches the label or the hint, ignoring case", () => {
    expect(filterOptions(options, "SARI").map((o) => o.value)).toEqual(["2"]);
    expect(filterOptions(options, "example.com")).toHaveLength(2);
    expect(filterOptions(options, "math")[0].value).toBe("3");
  });

  it("returns nothing when there is no match", () => {
    expect(filterOptions(options, "zzz")).toEqual([]);
  });
});

describe("escapeLike", () => {
  it("escapes wildcard characters so they are searched literally", () => {
    expect(escapeLike("100%_done")).toBe("100\\%\\_done");
    expect(escapeLike("a\\b")).toBe("a\\\\b");
  });
});

describe("parseOffset", () => {
  it("accepts non-negative integers and clamps everything else", () => {
    expect(parseOffset(40)).toBe(40);
    expect(parseOffset("20")).toBe(20);
    expect(parseOffset(-5)).toBe(0);
    expect(parseOffset("abc")).toBe(0);
    expect(parseOffset(Number.POSITIVE_INFINITY)).toBe(0);
    expect(parseOffset(10 ** 9)).toBe(100_000);
  });
});

describe("toPage", () => {
  it("reports more rows when the extra row was fetched", () => {
    const rows = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => i);
    const page = toPage(rows, (n) => ({ value: String(n), label: `Row ${n}` }));
    expect(page.options).toHaveLength(PAGE_SIZE);
    expect(page.hasMore).toBe(true);
  });

  it("reports the end of the list otherwise", () => {
    const page = toPage([1, 2, 3], (n) => ({ value: String(n), label: String(n) }));
    expect(page.options).toHaveLength(3);
    expect(page.hasMore).toBe(false);
  });
});
