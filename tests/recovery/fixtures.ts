import type {
  Snapshot,
  SnapshotEntry,
  SnapshotFile,
  StoredObject,
  VaultManifest,
} from "@/app/recovery";

export const healthyFile: SnapshotFile = {
  path: "Documents/Thesis-Final.docx",
  type: "file",
  size: 100,
  modifiedAt: "2026-07-14T17:00:00.000Z",
  expectedHash: "sha256:healthy",
  objectId: "object-healthy",
};

export const healthyObject: StoredObject = {
  id: "object-healthy",
  observedHash: "sha256:healthy",
  size: 100,
  availability: "available",
  storageLocation: "demo://object-healthy",
  verificationTimestamp: "2026-07-15T00:00:00.000Z",
};

export function snapshot(
  id: string,
  createdAt: string,
  files: SnapshotEntry[] = [healthyFile],
  status: Snapshot["status"] = "complete",
): Snapshot {
  return {
    id,
    createdAt,
    completedAt: createdAt,
    status,
    jobReportedSuccess: true,
    files,
    warnings: [],
    metadata: {},
  };
}

export function manifest(
  overrides: Partial<VaultManifest> = {},
): VaultManifest {
  return {
    schemaVersion: "1.0",
    vaultId: "vault-demo",
    vaultName: "Demo",
    generatedAt: "2026-07-18T00:00:00.000Z",
    source: "test",
    snapshots: [snapshot("tuesday", "2026-07-14T18:00:00.000Z")],
    objects: [healthyObject],
    retentionPolicy: {
      mode: "explicit",
      keepLast: 0,
      keepDaily: 0,
      keepWeekly: 0,
    },
    destinationState: [],
    ...overrides,
  };
}
