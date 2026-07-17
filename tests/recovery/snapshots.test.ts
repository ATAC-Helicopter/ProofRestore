import { describe, expect, it } from "vitest";
import { selectSnapshot } from "@/app/recovery";
import { snapshot } from "./fixtures";

const snapshots = [
  snapshot("monday", "2026-07-13T18:00:00.000Z"),
  snapshot("tuesday", "2026-07-14T18:00:00.000Z"),
  snapshot("failed-wednesday", "2026-07-15T18:00:00.000Z", [], "failed"),
  snapshot("thursday", "2026-07-16T18:00:00.000Z"),
];

describe("selectSnapshot", () => {
  it("selects an exact eligible snapshot", () => {
    const result = selectSnapshot(snapshots, { snapshotId: "tuesday" });
    expect(result.snapshot?.id).toBe("tuesday");
    expect(result.evidence[0].code).toBe("snapshot_selected");
  });

  it("selects the latest eligible snapshot at or before a time", () => {
    const result = selectSnapshot(snapshots, {
      requestedAt: "2026-07-15T20:00:00.000Z",
    });
    expect(result.snapshot?.id).toBe("tuesday");
  });

  it("fails explicitly before the earliest snapshot", () => {
    const result = selectSnapshot(snapshots, {
      requestedAt: "2026-07-12T20:00:00.000Z",
    });
    expect(result.snapshot).toBeUndefined();
    expect(result.evidence[0].code).toBe("snapshot_not_found");
  });

  it("can select the closest eligible snapshot and uses the later on a tie", () => {
    const result = selectSnapshot(snapshots, {
      requestedAt: "2026-07-14T06:00:00.000Z",
      mode: "closest",
    });
    expect(result.snapshot?.id).toBe("tuesday");
  });

  it("does not select a failed snapshot by id", () => {
    expect(
      selectSnapshot(snapshots, { snapshotId: "failed-wednesday" }).snapshot,
    ).toBeUndefined();
  });
});
