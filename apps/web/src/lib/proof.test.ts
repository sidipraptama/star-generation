import { describe, expect, it } from "vitest";
import { checkProofFile, formatFileSize, MAX_PROOF_BYTES, proofPath, proofUrl } from "./proof";

describe("checkProofFile", () => {
  it("accepts JPG, PNG and WebP images up to 5 MB", () => {
    expect(checkProofFile({ size: 1000, type: "image/jpeg" })).toBeNull();
    expect(checkProofFile({ size: 1000, type: "image/png" })).toBeNull();
    expect(checkProofFile({ size: MAX_PROOF_BYTES, type: "image/webp" })).toBeNull();
  });

  it("asks for a file when there is none or it is empty", () => {
    expect(checkProofFile(null)).toMatch(/Choose a photo/);
    expect(checkProofFile({ size: 0, type: "image/png" })).toMatch(/Choose a photo/);
  });

  it("refuses other kinds of files", () => {
    expect(checkProofFile({ size: 1000, type: "application/pdf" })).toMatch(/JPG, PNG or WebP/);
    expect(checkProofFile({ size: 1000, type: "image/svg+xml" })).toMatch(/JPG, PNG or WebP/);
    expect(checkProofFile({ size: 1000, type: "" })).toMatch(/JPG, PNG or WebP/);
  });

  it("refuses images over 5 MB", () => {
    expect(checkProofFile({ size: MAX_PROOF_BYTES + 1, type: "image/png" })).toMatch(/too large/);
  });
});

describe("proofPath", () => {
  it("builds <student>/<invoice>/<file>.<extension>", () => {
    expect(proofPath("s1", "i1", "image/png", "f1")).toBe("s1/i1/f1.png");
    expect(proofPath("s1", "i1", "image/jpeg", "f1")).toBe("s1/i1/f1.jpg");
    expect(proofPath("s1", "i1", "image/webp", "f1")).toBe("s1/i1/f1.webp");
  });
});

describe("proofUrl", () => {
  it("changes when the proof is replaced", () => {
    const first = proofUrl("i1", "2026-11-17T03:00:00Z");
    const second = proofUrl("i1", "2026-11-17T04:00:00Z");
    expect(first).toMatch(/^\/proofs\/i1\?v=\d+$/);
    expect(first).not.toBe(second);
  });
});

describe("formatFileSize", () => {
  it("shows KB below 1 MB and MB above", () => {
    expect(formatFileSize(200)).toBe("1 KB");
    expect(formatFileSize(150 * 1024)).toBe("150 KB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
