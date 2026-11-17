import { describe, expect, it } from "vitest";
import { staffChipState, studentChipState } from "./schedule";

const now = new Date("2026-11-17T10:00:00Z");
const past = { status: "scheduled", end_at: "2026-11-16T10:00:00Z" } as const;
const upcoming = { status: "scheduled", end_at: "2026-11-20T10:00:00Z" } as const;
const cancelled = { status: "cancelled", end_at: "2026-11-20T10:00:00Z" } as const;

describe("staffChipState", () => {
  it("asks for an entry once a lesson has ended without one", () => {
    expect(staffChipState(past, false, now)).toEqual({ tone: "attention", note: "Entry needed" });
    expect(staffChipState(past, true, now)).toEqual({ tone: "done", note: "Entry written" });
  });

  it("keeps upcoming and cancelled lessons simple", () => {
    expect(staffChipState(upcoming, false, now).tone).toBe("scheduled");
    expect(staffChipState(cancelled, false, now).tone).toBe("cancelled");
  });
});

describe("studentChipState", () => {
  it("flags only upcoming lessons that the hours do not cover", () => {
    expect(studentChipState(upcoming, false, now).tone).toBe("warning");
    expect(studentChipState(upcoming, true, now).tone).toBe("scheduled");
    expect(studentChipState(past, false, now).tone).toBe("done");
    expect(studentChipState(cancelled, false, now).tone).toBe("cancelled");
  });
});
