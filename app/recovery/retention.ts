import { createEvidenceCollector, evidenceMessage } from "./evidence";
import { evaluateIntegrity } from "./integrity";
import type { RetentionFinding, Snapshot, VaultManifest } from "./types";

const DAY = 86_400_000;

function expiryFor(
  manifest: VaultManifest,
  snapshot: Snapshot,
): string | undefined {
  return manifest.retentionPolicy.snapshotExpiries?.[snapshot.id];
}

/**
 * Finds healthy file versions whose underlying content has no healthy copy that
 * survives their imminent expiry. Copies are deduplicated by object id.
 */
export function analyzeRetention(
  manifest: VaultManifest,
  now = new Date(),
  warningWindowDays = 7,
): RetentionFinding[] {
  const nowMs = now.getTime();
  const warningWindow = warningWindowDays * DAY;
  const objects = new Map(
    manifest.objects.map((object) => [object.id, object]),
  );
  const byPath = new Map<
    string,
    Array<{ snapshot: Snapshot; objectId: string; expiresAt?: string }>
  >();

  for (const snapshot of manifest.snapshots) {
    for (const file of snapshot.files) {
      if (file.type !== "file" || !file.objectId) continue;
      if (
        evaluateIntegrity(file, objects.get(file.objectId)).verdict !==
        "verified"
      )
        continue;
      const versions = byPath.get(file.path) ?? [];
      versions.push({
        snapshot,
        objectId: file.objectId,
        expiresAt: expiryFor(manifest, snapshot),
      });
      byPath.set(file.path, versions);
    }
  }

  const findings: RetentionFinding[] = [];
  for (const [path, versions] of byPath) {
    const uniqueCopies = [
      ...new Map(
        versions.map((version) => [version.objectId, version]),
      ).values(),
    ];
    for (const version of uniqueCopies) {
      if (!version.expiresAt) continue;
      const expiresMs = Date.parse(version.expiresAt);
      if (!Number.isFinite(expiresMs) || expiresMs - nowMs > warningWindow)
        continue;

      const alternativeSurvives = uniqueCopies.some((candidate) => {
        if (candidate.objectId === version.objectId) return false;
        if (!candidate.expiresAt) return true;
        const candidateExpiry = Date.parse(candidate.expiresAt);
        return Number.isFinite(candidateExpiry) && candidateExpiry > expiresMs;
      });
      const evidence = createEvidenceCollector(
        `retention-${findings.length + 1}`,
      );
      evidence.add({
        code: "retention_expiry",
        severity: expiresMs <= nowMs ? "error" : "warning",
        message: evidenceMessage("retention_expiry", path),
        entities: {
          path,
          snapshotId: version.snapshot.id,
          objectId: version.objectId,
        },
        values: { expiresAt: version.expiresAt },
      });
      evidence.add({
        code: alternativeSurvives
          ? "healthy_copy_survives"
          : "last_healthy_copy_at_risk",
        severity: alternativeSurvives ? "success" : "error",
        message: evidenceMessage(
          alternativeSurvives
            ? "healthy_copy_survives"
            : "last_healthy_copy_at_risk",
          path,
        ),
        entities: {
          path,
          snapshotId: version.snapshot.id,
          objectId: version.objectId,
        },
      });
      findings.push({
        path,
        objectId: version.objectId,
        snapshotId: version.snapshot.id,
        expiresAt: version.expiresAt,
        urgency:
          expiresMs <= nowMs
            ? "expired"
            : expiresMs - nowMs <= DAY
              ? "critical"
              : "warning",
        healthyAlternativeSurvives: alternativeSurvives,
        evidence: evidence.all(),
      });
    }
  }

  return findings.sort(
    (a, b) =>
      a.expiresAt.localeCompare(b.expiresAt) || a.path.localeCompare(b.path),
  );
}
