export const MANIFEST_SCHEMA_VERSION = "1.0" as const;

export type ManifestSchemaVersion = typeof MANIFEST_SCHEMA_VERSION;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SnapshotStatus = "complete" | "partial" | "failed";
export type ObjectAvailability = "available" | "missing" | "corrupted";
export type RetentionMode = "keep_all" | "tiered" | "explicit";

interface SnapshotEntryBase {
  path: string;
  modifiedAt: string;
  tags?: string[];
}

export interface SnapshotFile extends SnapshotEntryBase {
  type: "file";
  size: number;
  expectedHash: string;
  objectId: string;
}

export interface SnapshotDirectory extends SnapshotEntryBase {
  type: "directory";
  /** Runtime manifest validation constrains directory size to zero. */
  size: number;
  expectedHash?: never;
  objectId?: never;
}

export type SnapshotEntry = SnapshotFile | SnapshotDirectory;

export interface Snapshot {
  id: string;
  createdAt: string;
  completedAt: string;
  status: SnapshotStatus;
  jobReportedSuccess: boolean;
  files: SnapshotEntry[];
  warnings: string[];
  metadata: Record<string, JsonValue>;
}

export interface StoredObject {
  id: string;
  observedHash: string;
  size: number;
  availability: ObjectAvailability;
  storageLocation: string;
  verificationTimestamp: string;
}

export interface RetentionPolicy {
  mode: RetentionMode;
  keepLast: number;
  keepDaily: number;
  keepWeekly: number;
  /** Explicit UTC expiry instants keyed by snapshot ID. */
  snapshotExpiries?: Record<string, string>;
}

export interface DestinationStateEntry {
  path: string;
  currentHash: string;
  currentSize: number;
  modifiedAt: string;
}

export interface VaultManifest {
  schemaVersion: ManifestSchemaVersion;
  vaultId: string;
  vaultName: string;
  generatedAt: string;
  source: string;
  snapshots: Snapshot[];
  objects: StoredObject[];
  retentionPolicy: RetentionPolicy;
  destinationState?: DestinationStateEntry[];
}
