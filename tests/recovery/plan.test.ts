import { describe, expect, it } from "vitest";
import { planRecovery } from "@/app/recovery";
import { healthyFile, healthyObject, manifest, snapshot } from "./fixtures";

describe("planRecovery", () => {
  it("completes the Tuesday-evening thesis demo flow", () => {
    const plan = planRecovery(manifest(), {
      path: "Documents/Thesis-Final.docx",
      requestedAt: "2026-07-14T20:00:00.000Z",
      destinationMode: "safe_copy",
    });
    expect(plan.snapshot?.id).toBe("tuesday");
    expect(plan.verdict).toBe("fully_recoverable");
    expect(plan.items[0]).toMatchObject({
      verdict: "verified",
      action: "create",
    });
    expect(plan.totals).toMatchObject({
      recoverableItems: 1,
      recoverableBytes: 100,
    });
  });

  it("returns unrecoverable for a missing path", () => {
    const plan = planRecovery(manifest(), { path: "Documents/Missing.txt" });
    expect(plan.verdict).toBe("unrecoverable");
    expect(plan.evidence.at(-1)?.code).toBe("path_not_found");
  });

  it("creates a partial folder plan with correct totals", () => {
    const directory = {
      path: "Documents",
      type: "directory" as const,
      size: 0,
      modifiedAt: healthyFile.modifiedAt,
    };
    const missing = {
      ...healthyFile,
      path: "Documents/Missing.txt",
      size: 40,
      objectId: "object-missing",
    };
    const vault = manifest({
      snapshots: [
        snapshot("tuesday", "2026-07-14T18:00:00.000Z", [
          directory,
          healthyFile,
          missing,
        ]),
      ],
    });
    const plan = planRecovery(vault, {
      path: "Documents",
      includeChildren: true,
    });
    expect(plan.verdict).toBe("partially_recoverable");
    expect(plan.items.map((item) => item.action)).toEqual([
      "create_directory",
      "create",
      "unavailable",
    ]);
    expect(plan.totals).toEqual({
      selectedItems: 3,
      recoverableItems: 1,
      unavailableItems: 1,
      conflicts: 0,
      selectedBytes: 140,
      recoverableBytes: 100,
      operationCount: 2,
    });
  });

  it("skips an identical destination", () => {
    const plan = planRecovery(
      manifest({
        destinationState: [
          {
            path: healthyFile.path,
            currentHash: healthyFile.expectedHash,
            currentSize: healthyFile.size,
            modifiedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
      }),
      { path: healthyFile.path, destinationMode: "original_location" },
    );
    expect(plan.items[0].action).toBe("skip_identical");
    expect(
      plan.evidence.some((item) => item.code === "destination_identical"),
    ).toBe(true);
  });

  it("flags newer different destination content as a conflict", () => {
    const plan = planRecovery(
      manifest({
        destinationState: [
          {
            path: healthyFile.path,
            currentHash: "different",
            currentSize: 101,
            modifiedAt: "2026-07-15T00:00:00.000Z",
          },
        ],
      }),
      { path: healthyFile.path, destinationMode: "original_location" },
    );
    expect(plan.items[0].action).toBe("conflict");
    expect(plan.totals.conflicts).toBe(1);
  });

  it("plans overwrite of older different destination content", () => {
    const plan = planRecovery(
      manifest({
        destinationState: [
          {
            path: healthyFile.path,
            currentHash: "different",
            currentSize: 90,
            modifiedAt: "2026-07-13T00:00:00.000Z",
          },
        ],
      }),
      { path: healthyFile.path, destinationMode: "original_location" },
    );
    expect(plan.items[0].action).toBe("overwrite");
  });

  it("exposes stable unique evidence ids and hidden failure despite job success", () => {
    const corruptedObject = { ...healthyObject, observedHash: "wrong" };
    const plan = planRecovery(manifest({ objects: [corruptedObject] }), {
      path: healthyFile.path,
    });
    expect(plan.snapshot?.jobReportedSuccess).toBe(true);
    expect(plan.verdict).toBe("unrecoverable");
    expect(plan.evidence.map((item) => item.id)).toEqual([
      "snapshot-0001",
      "recovery-0001",
      "recovery-0002",
      "recovery-0003",
    ]);
    expect(new Set(plan.evidence.map((item) => item.id)).size).toBe(
      plan.evidence.length,
    );
  });
});
