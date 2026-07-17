import { describe, expect, it } from "vitest";
import { analyzeRetention } from "@/app/recovery";
import { healthyFile, healthyObject, manifest, snapshot } from "./fixtures";

describe("analyzeRetention", () => {
  it("identifies the final healthy copy at risk", () => {
    const vault = manifest({
      retentionPolicy: {
        mode: "explicit",
        keepLast: 0,
        keepDaily: 0,
        keepWeekly: 0,
        snapshotExpiries: { tuesday: "2026-07-20T00:00:00.000Z" },
      },
    });
    const findings = analyzeRetention(
      vault,
      new Date("2026-07-18T00:00:00.000Z"),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      healthyAlternativeSurvives: false,
      urgency: "warning",
    });
    expect(findings[0].evidence.at(-1)?.code).toBe("last_healthy_copy_at_risk");
  });

  it("reports when a distinct healthy copy survives", () => {
    const secondFile = {
      ...healthyFile,
      objectId: "object-second",
      expectedHash: "second",
    };
    const secondObject = {
      ...healthyObject,
      id: "object-second",
      observedHash: "second",
    };
    const vault = manifest({
      snapshots: [
        snapshot("tuesday", "2026-07-14T18:00:00.000Z"),
        snapshot("wednesday", "2026-07-15T18:00:00.000Z", [secondFile]),
      ],
      objects: [healthyObject, secondObject],
      retentionPolicy: {
        mode: "explicit",
        keepLast: 0,
        keepDaily: 0,
        keepWeekly: 0,
        snapshotExpiries: { tuesday: "2026-07-20T00:00:00.000Z" },
      },
    });
    const findings = analyzeRetention(
      vault,
      new Date("2026-07-18T00:00:00.000Z"),
    );
    expect(findings[0].healthyAlternativeSurvives).toBe(true);
    expect(findings[0].evidence.at(-1)?.code).toBe("healthy_copy_survives");
  });

  it("ignores corrupted alternatives", () => {
    const badFile = {
      ...healthyFile,
      objectId: "bad",
      expectedHash: "expected",
    };
    const badObject = { ...healthyObject, id: "bad", observedHash: "wrong" };
    const vault = manifest({
      snapshots: [
        snapshot("tuesday", "2026-07-14T18:00:00.000Z"),
        snapshot("wednesday", "2026-07-15T18:00:00.000Z", [badFile]),
      ],
      objects: [healthyObject, badObject],
      retentionPolicy: {
        mode: "explicit",
        keepLast: 0,
        keepDaily: 0,
        keepWeekly: 0,
        snapshotExpiries: { tuesday: "2026-07-20T00:00:00.000Z" },
      },
    });
    expect(
      analyzeRetention(vault, new Date("2026-07-18T00:00:00.000Z"))[0]
        .healthyAlternativeSurvives,
    ).toBe(false);
  });
});
