import { describe, expect, it } from "vitest";
import { parseTime, timeRows, timeSlots } from "./time-picker";

describe("timeSlots", () => {
  it("lists the whole day in steps", () => {
    const slots = timeSlots(15);
    expect(slots).toHaveLength(96);
    expect(slots[0]).toBe("00:00");
    expect(slots[67]).toBe("16:45");
    expect(slots[95]).toBe("23:45");
    expect(timeSlots(60)).toHaveLength(24);
  });
});

describe("parseTime", () => {
  it("accepts common ways of typing a time", () => {
    expect(parseTime("16")).toBe("16:00");
    expect(parseTime("930")).toBe("09:30");
    expect(parseTime("1630")).toBe("16:30");
    expect(parseTime("16:30")).toBe("16:30");
    expect(parseTime(" 9.05 ")).toBe("09:05");
  });

  it("rejects things that are not a time", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:75")).toBeNull();
    expect(parseTime("163")).toBeNull();
    expect(parseTime("noon")).toBeNull();
  });
});

describe("timeRows", () => {
  const slots = timeSlots(15);

  it("returns every slot for an empty search", () => {
    expect(timeRows(slots, "")).toHaveLength(96);
    expect(timeRows(slots, "  ")).toHaveLength(96);
  });

  it("matches by hour with or without a leading zero", () => {
    expect(timeRows(slots, "16")).toEqual(["16:00", "16:15", "16:30", "16:45"]);
    expect(timeRows(slots, "9")).toContain("09:30");
    expect(timeRows(slots, "9")).not.toContain("19:30");
    expect(timeRows(slots, "930")).toEqual(["09:30"]);
  });

  it("offers a typed time that is not a slot", () => {
    expect(timeRows(slots, "16:07")).toEqual(["16:07"]);
    expect(timeRows(slots, "16:30")).toEqual(["16:30"]);
  });

  it("returns nothing when no time matches", () => {
    expect(timeRows(slots, "2599")).toEqual([]);
  });
});
