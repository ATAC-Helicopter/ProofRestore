import { describe, expect, it } from "vitest";
import { demoVault } from "@/app/demo";
import { DEMO_SCENARIOS } from "@/app/demo/scenarios";
import { analyzeRetention, planRecovery } from "@/app/recovery";

describe("demo vault recovery integration", () => {
  it("proves the mandatory Tuesday-evening thesis recovery without AI", () => {
    const result = planRecovery(demoVault, {
      path: DEMO_SCENARIOS.thesisPath,
      requestedAt: DEMO_SCENARIOS.thesisTuesdayRequest,
      snapshotMode: "at_or_before",
      includeChildren: false,
      destinationMode: "safe_copy",
    });

    expect(result.snapshot?.id).toBe(DEMO_SCENARIOS.healthyTuesdaySnapshotId);
    expect(result.resolvedPath).toBe(DEMO_SCENARIOS.thesisPath);
    expect(result.verdict).toBe("fully_recoverable");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      verdict: "verified",
      action: "create",
    });
    expect(result.items[0].evidence.map((item) => item.code)).toEqual([
      "object_found",
      "hash_match",
      "size_match",
    ]);
  });

  it("detects the misleading successful job with a corrupted thesis", () => {
    const result = planRecovery(demoVault, {
      path: DEMO_SCENARIOS.thesisPath,
      snapshotId: DEMO_SCENARIOS.laterCorruptedSnapshotId,
    });

    expect(result.snapshot?.jobReportedSuccess).toBe(true);
    expect(result.verdict).toBe("unrecoverable");
    expect(result.items[0].verdict).toBe("corrupted");
    expect(
      result.items[0].evidence.some((item) => item.code === "hash_mismatch"),
    ).toBe(true);
  });

  it("detects partial folder recovery caused by the missing presentation object", () => {
    const result = planRecovery(demoVault, {
      path: "Projects",
      snapshotId: DEMO_SCENARIOS.missingObjectSnapshotId,
      includeChildren: true,
    });

    expect(result.verdict).toBe("partially_recoverable");
    expect(result.items.some((item) => item.verdict === "unavailable")).toBe(
      true,
    );
  });

  it("proves the tax return is the last healthy copy at retention risk", () => {
    const finding = analyzeRetention(
      demoVault,
      new Date("2026-07-18T10:00:00.000Z"),
    ).find((item) => item.path === DEMO_SCENARIOS.retentionRiskPath);

    expect(finding).toMatchObject({
      snapshotId: DEMO_SCENARIOS.retentionRiskSnapshotId,
      expiresAt: DEMO_SCENARIOS.retentionRiskExpiresAt,
      healthyAlternativeSurvives: false,
      urgency: "critical",
    });
    expect(finding?.evidence.at(-1)?.code).toBe("last_healthy_copy_at_risk");
  });
});
