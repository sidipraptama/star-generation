import { describe, expect, it } from "vitest";
import { cancelBlockedReason } from "./invoices";

describe("cancelBlockedReason", () => {
  it("explains a paid invoice whose hours were partly used", () => {
    expect(
      cancelBlockedReason({ status: "paid", canCancel: false, balanceMinutes: 540, hours: 12 }),
    ).toBe("Cannot cancel: hours are already used (9h left of 12h).");
  });

  it("explains a paid invoice whose hours are all used", () => {
    expect(
      cancelBlockedReason({ status: "paid", canCancel: false, balanceMinutes: 0, hours: 6 }),
    ).toBe("Cannot cancel: all 6h are already used.");
    expect(
      cancelBlockedReason({ status: "paid", canCancel: false, balanceMinutes: -30, hours: 6 }),
    ).toBe("Cannot cancel: all 6h are already used.");
  });

  it("never shows more hours left than the invoice has", () => {
    expect(
      cancelBlockedReason({ status: "paid", canCancel: false, balanceMinutes: 2000, hours: 6 }),
    ).toContain("(6h left of 6h)");
  });

  it("has nothing to say when the invoice can be cancelled or is not paid", () => {
    expect(
      cancelBlockedReason({ status: "paid", canCancel: true, balanceMinutes: 720, hours: 12 }),
    ).toBeUndefined();
    expect(
      cancelBlockedReason({ status: "unpaid", canCancel: true, balanceMinutes: null, hours: 12 }),
    ).toBeUndefined();
    expect(
      cancelBlockedReason({ status: "void", canCancel: false, balanceMinutes: null, hours: 12 }),
    ).toBeUndefined();
  });
});
