import { createEvidenceCollector, evidenceMessage } from "./evidence";
import { evaluateIntegrity } from "./integrity";
import { normalizeRecoveryPath, resolveSnapshotPath } from "./paths";
import { selectSnapshot } from "./snapshots";
import type {
  DestinationStateEntry,
  Evidence,
  RecoveryItem,
  RecoveryPlan,
  RecoveryRequest,
  RecoveryTotals,
  RequestVerdict,
  RestoreAction,
  SnapshotEntry,
  VaultManifest,
} from "./types";

function destinationFor(
  destinationState: DestinationStateEntry[] | undefined,
  path: string,
): DestinationStateEntry | undefined {
  return destinationState?.find(
    (entry) =>
      normalizeRecoveryPath(entry.path) === normalizeRecoveryPath(path),
  );
}

function determineAction(
  file: SnapshotEntry,
  recoverable: boolean,
  destination: DestinationStateEntry | undefined,
  destinationMode: RecoveryRequest["destinationMode"],
): RestoreAction {
  if (file.type === "directory") return "create_directory";
  if (!recoverable) return "unavailable";
  if (destinationMode === "safe_copy" || !destination) return "create";
  if (
    destination.currentHash === file.expectedHash &&
    destination.currentSize === file.size
  ) {
    return "skip_identical";
  }
  if (Date.parse(destination.modifiedAt) > Date.parse(file.modifiedAt))
    return "conflict";
  return "overwrite";
}

function calculateTotals(items: RecoveryItem[]): RecoveryTotals {
  const files = items.filter((item) => item.file.type === "file");
  const recoverable = files.filter(
    (item) =>
      item.verdict === "verified" ||
      item.verdict === "recoverable_with_warning",
  );
  return {
    selectedItems: items.length,
    recoverableItems: recoverable.length,
    unavailableItems: files.length - recoverable.length,
    conflicts: items.filter((item) => item.action === "conflict").length,
    selectedBytes: files.reduce((total, item) => total + item.file.size, 0),
    recoverableBytes: recoverable.reduce(
      (total, item) => total + item.file.size,
      0,
    ),
    operationCount: items.filter(
      (item) =>
        item.action !== "skip_identical" && item.action !== "unavailable",
    ).length,
  };
}

function requestVerdict(items: RecoveryItem[]): RequestVerdict {
  const files = items.filter((item) => item.file.type === "file");
  if (files.length === 0) {
    return items.some((item) => item.action === "create_directory")
      ? "fully_recoverable"
      : "unrecoverable";
  }
  const recoverableCount = files.filter(
    (item) =>
      item.verdict === "verified" ||
      item.verdict === "recoverable_with_warning",
  ).length;
  if (recoverableCount === 0) return "unrecoverable";
  return recoverableCount === files.length
    ? "fully_recoverable"
    : "partially_recoverable";
}

const EMPTY_TOTALS: RecoveryTotals = {
  selectedItems: 0,
  recoverableItems: 0,
  unavailableItems: 0,
  conflicts: 0,
  selectedBytes: 0,
  recoverableBytes: 0,
  operationCount: 0,
};

export function planRecovery(
  manifest: VaultManifest,
  request: RecoveryRequest,
): RecoveryPlan {
  // Normalize first so invalid input fails closed even if no snapshots exist.
  const normalizedRequestPath = normalizeRecoveryPath(request.path);
  const selection = selectSnapshot(manifest.snapshots, {
    snapshotId: request.snapshotId,
    requestedAt: request.requestedAt,
    mode: request.snapshotMode,
  });
  if (!selection.snapshot) {
    return {
      verdict: "unrecoverable",
      requestedPath: normalizedRequestPath,
      items: [],
      totals: EMPTY_TOTALS,
      evidence: selection.evidence,
    };
  }

  const collector = createEvidenceCollector("recovery");
  const resolved = resolveSnapshotPath(
    selection.snapshot,
    normalizedRequestPath,
    request.includeChildren,
  );
  if (!resolved) {
    collector.add({
      code: "path_not_found",
      severity: "error",
      message: evidenceMessage("path_not_found", normalizedRequestPath),
      entities: {
        path: normalizedRequestPath,
        snapshotId: selection.snapshot.id,
      },
    });
    return {
      verdict: "unrecoverable",
      snapshot: selection.snapshot,
      requestedPath: normalizedRequestPath,
      items: [],
      totals: EMPTY_TOTALS,
      evidence: [...selection.evidence, ...collector.all()],
    };
  }

  collector.add({
    code: "path_found",
    severity: "success",
    message: evidenceMessage("path_found", resolved.resolvedPath),
    entities: {
      path: resolved.resolvedPath,
      snapshotId: selection.snapshot.id,
    },
    values: { selectedItems: resolved.files.length },
  });

  const objects = new Map(
    manifest.objects.map((object) => [object.id, object]),
  );
  const items = resolved.files.map((file): RecoveryItem => {
    const integrity = evaluateIntegrity(
      file,
      file.type === "file" && file.objectId
        ? objects.get(file.objectId)
        : undefined,
    );
    const recoverable =
      integrity.verdict === "verified" ||
      integrity.verdict === "recoverable_with_warning";
    const destination = destinationFor(manifest.destinationState, file.path);
    const action = determineAction(
      file,
      recoverable,
      destination,
      request.destinationMode,
    );
    const itemEvidence: Evidence[] = integrity.evidence.map((input) =>
      collector.add(input),
    );
    if (destination && action === "skip_identical") {
      itemEvidence.push(
        collector.add({
          code: "destination_identical",
          severity: "info",
          message: evidenceMessage("destination_identical", file.path),
          entities: { path: file.path },
        }),
      );
    } else if (
      destination &&
      (action === "overwrite" || action === "conflict")
    ) {
      itemEvidence.push(
        collector.add({
          code: "destination_conflict",
          severity: action === "conflict" ? "warning" : "info",
          message: evidenceMessage("destination_conflict", file.path),
          entities: { path: file.path },
          values: { action },
        }),
      );
    }
    return {
      path: file.path,
      file,
      verdict: integrity.verdict,
      action,
      warnings: integrity.warnings,
      evidence: itemEvidence,
    };
  });

  return {
    verdict: requestVerdict(items),
    snapshot: selection.snapshot,
    requestedPath: normalizedRequestPath,
    resolvedPath: resolved.resolvedPath,
    items,
    totals: calculateTotals(items),
    evidence: [...selection.evidence, ...collector.all()],
  };
}
