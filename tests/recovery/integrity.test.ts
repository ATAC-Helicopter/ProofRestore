import { describe, expect, it } from "vitest";
import { evaluateIntegrity, type SnapshotEntry } from "@/app/recovery";
import { healthyFile, healthyObject } from "./fixtures";

describe("evaluateIntegrity", () => {
  it("verifies matching hashes and sizes", () => {
    const result = evaluateIntegrity(healthyFile, healthyObject);
    expect(result.verdict).toBe("verified");
    expect(result.evidence.map((item) => item.code)).toEqual([
      "object_found",
      "hash_match",
      "size_match",
    ]);
  });

  it("detects a missing object", () => {
    const result = evaluateIntegrity(healthyFile, undefined);
    expect(result.verdict).toBe("unavailable");
    expect(result.evidence[0].code).toBe("object_missing");
  });

  it("detects an object marked missing", () => {
    const result = evaluateIntegrity(healthyFile, {
      ...healthyObject,
      availability: "missing",
    });
    expect(result.verdict).toBe("unavailable");
    expect(result.evidence.at(-1)?.code).toBe("object_unavailable");
  });

  it("detects a mismatching hash", () => {
    const result = evaluateIntegrity(healthyFile, {
      ...healthyObject,
      observedHash: "sha256:corrupt",
    });
    expect(result.verdict).toBe("corrupted");
    expect(result.evidence.at(-1)?.code).toBe("hash_mismatch");
  });

  it("detects a mismatching size", () => {
    const result = evaluateIntegrity(healthyFile, {
      ...healthyObject,
      size: 99,
    });
    expect(result.verdict).toBe("corrupted");
    expect(result.evidence.at(-1)?.code).toBe("size_mismatch");
  });

  it("does not claim integrity without hashes", () => {
    const result = evaluateIntegrity(
      { ...healthyFile, expectedHash: undefined } as unknown as SnapshotEntry,
      healthyObject,
    );
    expect(result.verdict).toBe("unknown");
  });
});
