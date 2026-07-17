import { createEvidenceCollector, evidenceMessage } from "./evidence";
import type { Evidence, Snapshot } from "./types";

export interface SnapshotSelection {
  snapshot?: Snapshot;
  evidence: Evidence[];
}

function timestamp(value: string): number | undefined {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isEligible(snapshot: Snapshot): boolean {
  return (
    snapshot.status !== "failed" && timestamp(snapshot.createdAt) !== undefined
  );
}

export function selectSnapshot(
  snapshots: Snapshot[],
  options: {
    snapshotId?: string;
    requestedAt?: string;
    mode?: "at_or_before" | "closest";
  },
): SnapshotSelection {
  const evidence = createEvidenceCollector("snapshot");
  let selected: Snapshot | undefined;

  if (options.snapshotId) {
    selected = snapshots.find(
      (snapshot) => snapshot.id === options.snapshotId && isEligible(snapshot),
    );
  } else {
    const requested = options.requestedAt
      ? timestamp(options.requestedAt)
      : undefined;
    if (options.requestedAt && requested === undefined) {
      selected = undefined;
    } else {
      const eligible = snapshots.filter(isEligible);
      if (requested === undefined) {
        selected = eligible.sort(
          (a, b) =>
            (timestamp(b.createdAt) ?? 0) - (timestamp(a.createdAt) ?? 0),
        )[0];
      } else if (options.mode === "closest") {
        selected = eligible.sort((a, b) => {
          const distance = Math.abs((timestamp(a.createdAt) ?? 0) - requested);
          const otherDistance = Math.abs(
            (timestamp(b.createdAt) ?? 0) - requested,
          );
          return (
            distance - otherDistance ||
            (timestamp(b.createdAt) ?? 0) - (timestamp(a.createdAt) ?? 0)
          );
        })[0];
      } else {
        selected = eligible
          .filter(
            (snapshot) =>
              (timestamp(snapshot.createdAt) ?? Infinity) <= requested,
          )
          .sort(
            (a, b) =>
              (timestamp(b.createdAt) ?? 0) - (timestamp(a.createdAt) ?? 0),
          )[0];
      }
    }
  }

  evidence.add({
    code: selected ? "snapshot_selected" : "snapshot_not_found",
    severity: selected ? "success" : "error",
    message: evidenceMessage(
      selected ? "snapshot_selected" : "snapshot_not_found",
    ),
    entities: selected ? { snapshotId: selected.id } : {},
    values: {
      requestedAt: options.requestedAt ?? null,
      requestedSnapshotId: options.snapshotId ?? null,
    },
  });

  return { snapshot: selected, evidence: evidence.all() };
}
