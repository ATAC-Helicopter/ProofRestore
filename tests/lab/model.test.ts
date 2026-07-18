import { describe, expect, it } from "vitest";

import {
  createDeletionSnapshot,
  createLabSession,
  createModifiedSnapshot,
  injectLabCondition,
  toLabManifest,
  type LabFileInput,
} from "@/app/lab";
import { planRecovery } from "@/app/recovery";

const BASELINE_TIME = "2026-07-18T12:00:00.000Z";

function input(path: string, content: string): LabFileInput {
  const bytes = new TextEncoder().encode(content);
  return {
    name: path.split("/").at(-1) ?? path,
    path,
    size: bytes.byteLength,
    lastModified: Date.parse(BASELINE_TIME) - 60_000,
    bytes: bytes.buffer,
  };
}

describe("Recovery Lab model", () => {
  it("creates a schema-valid baseline with parent directories and matching hashes", async () => {
    const session = await createLabSession(
      [input("Documents/Notes.txt", "evidence")],
      BASELINE_TIME,
    );
    const manifest = toLabManifest(session);

    expect(manifest.snapshots).toHaveLength(1);
    expect(manifest.snapshots[0]?.jobReportedSuccess).toBe(true);
    expect(manifest.snapshots[0]?.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "Documents", type: "directory" }),
        expect.objectContaining({
          path: "Documents/Notes.txt",
          type: "file",
        }),
      ]),
    );
    const file = manifest.snapshots[0]?.files.find(
      (entry) => entry.type === "file",
    );
    const object = manifest.objects.find(
      (entry) => entry.id === file?.objectId,
    );
    expect(object?.observedHash).toBe(file?.expectedHash);
    expect(JSON.stringify(manifest)).not.toContain("evidence");
  });

  it("flips virtual stored bytes without changing the expected snapshot hash", async () => {
    const baseline = await createLabSession(
      [input("Documents/Notes.txt", "healthy bytes")],
      BASELINE_TIME,
    );
    const before = toLabManifest(baseline);
    const expected = before.snapshots[0]?.files.find(
      (entry) => entry.type === "file",
    );
    const corrupted = await injectLabCondition(baseline, {
      condition: "corrupt_object",
      snapshotId: "lab-snapshot-001",
      path: "Documents/Notes.txt",
      at: "2026-07-18T12:01:00.000Z",
    });
    const manifest = toLabManifest(corrupted);
    const plan = planRecovery(manifest, {
      path: "Documents/Notes.txt",
      snapshotId: "lab-snapshot-001",
      destinationMode: "safe_copy",
      includeChildren: false,
    });

    const after = manifest.snapshots[0]?.files.find(
      (entry) => entry.type === "file",
    );
    expect(after?.expectedHash).toBe(expected?.expectedHash);
    expect(manifest.objects[0]?.observedHash).not.toBe(after?.expectedHash);
    expect(plan.verdict).toBe("unrecoverable");
    expect(plan.evidence.map((item) => item.code)).toContain("hash_mismatch");
    expect(corrupted.events.at(-1)?.message).toContain("Flipped a byte");
  });

  it("detects a successful snapshot whose virtual object was removed", async () => {
    const baseline = await createLabSession(
      [input("Plan.txt", "recover me")],
      BASELINE_TIME,
    );
    const missing = await injectLabCondition(baseline, {
      condition: "remove_object",
      snapshotId: "lab-snapshot-001",
      path: "Plan.txt",
    });
    const manifest = toLabManifest(missing);
    const plan = planRecovery(manifest, {
      path: "Plan.txt",
      snapshotId: "lab-snapshot-001",
      destinationMode: "safe_copy",
      includeChildren: false,
    });

    expect(manifest.snapshots[0]?.status).toBe("complete");
    expect(manifest.snapshots[0]?.jobReportedSuccess).toBe(true);
    expect(plan.verdict).toBe("unrecoverable");
    expect(plan.evidence.map((item) => item.code)).toContain("object_missing");
  });

  it("keeps content recoverable while exposing original-location conflicts", async () => {
    const baseline = await createLabSession(
      [input("Plan.txt", "recover me")],
      BASELINE_TIME,
    );
    const conflicted = await injectLabCondition(baseline, {
      condition: "destination_conflict",
      snapshotId: "lab-snapshot-001",
      path: "Plan.txt",
      at: "2026-07-18T12:01:00.000Z",
    });
    const manifest = toLabManifest(conflicted);
    const original = planRecovery(manifest, {
      path: "Plan.txt",
      snapshotId: "lab-snapshot-001",
      destinationMode: "original_location",
      includeChildren: false,
    });
    const safeCopy = planRecovery(manifest, {
      path: "Plan.txt",
      snapshotId: "lab-snapshot-001",
      destinationMode: "safe_copy",
      includeChildren: false,
    });

    expect(original.verdict).toBe("fully_recoverable");
    expect(original.items[0]?.action).toBe("conflict");
    expect(safeCopy.items[0]?.action).toBe("create");
  });

  it("preserves historical versions across virtual modification and deletion", async () => {
    const baseline = await createLabSession(
      [input("Plan.txt", "version one")],
      BASELINE_TIME,
    );
    const modified = await createModifiedSnapshot(
      baseline,
      "Plan.txt",
      "2026-07-18T12:02:00.000Z",
    );
    const deleted = await createDeletionSnapshot(
      modified,
      "Plan.txt",
      "2026-07-18T12:03:00.000Z",
    );
    const manifest = toLabManifest(deleted);

    expect(manifest.snapshots).toHaveLength(3);
    expect(
      manifest.snapshots[0]?.files.some((entry) => entry.path === "Plan.txt"),
    ).toBe(true);
    expect(
      manifest.snapshots[1]?.files.some((entry) => entry.path === "Plan.txt"),
    ).toBe(true);
    expect(
      manifest.snapshots[2]?.files.some((entry) => entry.path === "Plan.txt"),
    ).toBe(false);
  });

  it("rejects unsafe and duplicate upload paths before a session is created", async () => {
    await expect(
      createLabSession([input("../secret.txt", "nope")], BASELINE_TIME),
    ).rejects.toThrow();

    await expect(
      createLabSession(
        [input("Notes.txt", "first"), input("Notes.txt", "second")],
        BASELINE_TIME,
      ),
    ).rejects.toThrow(/duplicate/i);
  });

  it("reports a partially recoverable folder when one child is corrupted", async () => {
    const baseline = await createLabSession(
      [
        input("Project/healthy.txt", "healthy"),
        input("Project/damaged.txt", "damaged"),
      ],
      BASELINE_TIME,
    );
    const corrupted = await injectLabCondition(baseline, {
      condition: "corrupt_object",
      snapshotId: "lab-snapshot-001",
      path: "Project/damaged.txt",
    });
    const plan = planRecovery(toLabManifest(corrupted), {
      path: "Project",
      snapshotId: "lab-snapshot-001",
      destinationMode: "safe_copy",
      includeChildren: true,
    });

    expect(plan.verdict).toBe("partially_recoverable");
    expect(plan.totals.recoverableItems).toBe(1);
    expect(plan.totals.unavailableItems).toBe(1);
    expect(plan.evidence.map((item) => item.code)).toContain("hash_mismatch");
  });
});
