import type { Snapshot, SnapshotEntry } from "@/app/types/manifest";

export type {
  DestinationStateEntry,
  ObjectAvailability,
  RetentionPolicy,
  Snapshot,
  SnapshotDirectory,
  SnapshotEntry,
  SnapshotFile,
  SnapshotStatus,
  StoredObject,
  VaultManifest,
} from "@/app/types/manifest";

export type EvidenceCode =
  | "snapshot_selected"
  | "snapshot_not_found"
  | "path_found"
  | "path_not_found"
  | "object_found"
  | "object_missing"
  | "object_unavailable"
  | "hash_match"
  | "hash_mismatch"
  | "size_match"
  | "size_mismatch"
  | "destination_identical"
  | "destination_conflict"
  | "retention_expiry"
  | "healthy_copy_survives"
  | "last_healthy_copy_at_risk";

export interface Evidence {
  id: string;
  code: EvidenceCode;
  severity: "info" | "success" | "warning" | "error";
  message: string;
  entities: Record<string, string>;
  values?: Record<string, string | number | boolean | null>;
}

export type ItemVerdict =
  | "verified"
  | "recoverable_with_warning"
  | "unavailable"
  | "corrupted"
  | "unknown";

export type RequestVerdict =
  "fully_recoverable" | "partially_recoverable" | "unrecoverable";

export type RestoreAction =
  | "create"
  | "overwrite"
  | "skip_identical"
  | "conflict"
  | "unavailable"
  | "create_directory";

export interface RecoveryItem {
  path: string;
  file: SnapshotEntry;
  verdict: ItemVerdict;
  action: RestoreAction;
  warnings: string[];
  evidence: Evidence[];
}

export interface RecoveryTotals {
  selectedItems: number;
  recoverableItems: number;
  unavailableItems: number;
  conflicts: number;
  selectedBytes: number;
  recoverableBytes: number;
  operationCount: number;
}

export interface RecoveryRequest {
  path: string;
  includeChildren?: boolean;
  snapshotId?: string;
  requestedAt?: string;
  snapshotMode?: "at_or_before" | "closest";
  destinationMode?: "safe_copy" | "original_location";
}

export interface RecoveryPlan {
  verdict: RequestVerdict;
  snapshot?: Snapshot;
  requestedPath: string;
  resolvedPath?: string;
  items: RecoveryItem[];
  totals: RecoveryTotals;
  evidence: Evidence[];
}

export interface RetentionFinding {
  path: string;
  objectId: string;
  snapshotId: string;
  expiresAt: string;
  urgency: "expired" | "critical" | "warning";
  healthyAlternativeSurvives: boolean;
  evidence: Evidence[];
}
