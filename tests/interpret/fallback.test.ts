import { describe, expect, it } from "vitest";
import { interpretWithoutModel } from "@/app/interpret/fallback";

const input = {
  query: "Can I recover my thesis from Tuesday evening?",
  pathCandidates: [
    "Documents/University/Thesis-Final.docx",
    "Documents/University/Research-Notes.md",
  ],
  referenceDateTime: "2025-07-18T12:00:00.000Z",
};

describe("deterministic interpretation fallback", () => {
  it("resolves the demo thesis request without deciding recoverability", () => {
    expect(interpretWithoutModel(input)).toMatchObject({
      intent: "recover_path",
      resolvedPath: "Documents/University/Thesis-Final.docx",
      requestedDateTime: "2025-07-15T19:00:00.000Z",
      needsClarification: false,
    });
  });

  it("never fabricates a missing path", () => {
    const result = interpretWithoutModel({
      ...input,
      query: "Recover secret plans",
    });
    expect(result.resolvedPath).toBeUndefined();
    expect(result.needsClarification).toBe(true);
  });
});
