import { normalizeManifestPath } from "@/app/manifest/path";
import { parseVaultManifest } from "@/app/manifest/parse";
import type {
  DestinationStateEntry,
  Snapshot,
  SnapshotDirectory,
  SnapshotFile,
  StoredObject,
  VaultManifest,
} from "@/app/types/manifest";

export const LAB_LIMITS = {
  files: 50,
  perFileBytes: 20 * 1024 * 1024,
  totalBytes: 50 * 1024 * 1024,
  snapshots: 10,
} as const;

export type LabFileInput = {
  name: string;
  path: string;
  size: number;
  lastModified: number;
  bytes: ArrayBuffer;
};

export type LabWorkingFile = {
  id: string;
  path: string;
  size: number;
  modifiedAt: string;
  hash: string;
  bytes: Uint8Array;
};

export type LabObject = StoredObject & {
  snapshotId: string;
  path: string;
  bytes: Uint8Array;
};

export type LabEvent = {
  id: string;
  at: string;
  action:
    | "files_loaded"
    | "snapshot_created"
    | "working_copy_modified"
    | "working_copy_deleted"
    | "object_corrupted"
    | "object_removed"
    | "destination_conflict"
    | "verification_run"
    | "manifest_exported";
  target?: string;
  message: string;
};

export type RecoveryLabSession = {
  id: string;
  createdAt: string;
  workingFiles: LabWorkingFile[];
  snapshots: Snapshot[];
  objects: LabObject[];
  destinationState: DestinationStateEntry[];
  events: LabEvent[];
};

export type LabCondition =
  "corrupt_object" | "remove_object" | "destination_conflict";

function hex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return `sha256:${hex(digest)}`;
}

function event(
  session: Pick<RecoveryLabSession, "events">,
  at: string,
  action: LabEvent["action"],
  message: string,
  target?: string,
): LabEvent {
  return {
    id: `lab-event-${String(session.events.length + 1).padStart(3, "0")}`,
    at,
    action,
    message,
    ...(target ? { target } : {}),
  };
}

function parentDirectories(paths: string[], at: string): SnapshotDirectory[] {
  const directories = new Set<string>();
  for (const path of paths) {
    const parts = path.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }
  return [...directories].sort().map((path) => ({
    path,
    type: "directory" as const,
    size: 0,
    modifiedAt: at,
    tags: ["recovery-lab"],
  }));
}

async function appendSnapshot(
  session: RecoveryLabSession,
  workingFiles: LabWorkingFile[],
  at: string,
  label: string,
): Promise<RecoveryLabSession> {
  if (session.snapshots.length >= LAB_LIMITS.snapshots) {
    throw new Error(
      `Recovery Lab supports at most ${LAB_LIMITS.snapshots} snapshots`,
    );
  }
  const sequence = session.snapshots.length + 1;
  const snapshotId = `lab-snapshot-${String(sequence).padStart(3, "0")}`;
  const newObjects: LabObject[] = [];
  const files: SnapshotFile[] = workingFiles.map((file, index) => {
    const objectId = `lab-object-${String(sequence).padStart(3, "0")}-${String(index + 1).padStart(3, "0")}`;
    const storedBytes = new Uint8Array(file.bytes);
    newObjects.push({
      id: objectId,
      observedHash: file.hash,
      size: storedBytes.byteLength,
      availability: "available",
      storageLocation: `lab://virtual-store/${objectId}`,
      verificationTimestamp: at,
      snapshotId,
      path: file.path,
      bytes: storedBytes,
    });
    return {
      path: file.path,
      type: "file",
      size: file.size,
      modifiedAt: file.modifiedAt,
      expectedHash: file.hash,
      objectId,
      tags: ["recovery-lab"],
    };
  });
  const snapshot: Snapshot = {
    id: snapshotId,
    createdAt: at,
    completedAt: at,
    status: "complete",
    jobReportedSuccess: true,
    files: [
      ...parentDirectories(
        files.map((file) => file.path),
        at,
      ),
      ...files,
    ],
    warnings: [],
    metadata: { labAction: label, browserOnly: true },
  };
  const next: RecoveryLabSession = {
    ...session,
    workingFiles,
    snapshots: [...session.snapshots, snapshot],
    objects: [...session.objects, ...newObjects],
    events: session.events,
  };
  return {
    ...next,
    events: [
      ...next.events,
      event(
        next,
        at,
        "snapshot_created",
        `Created ${snapshotId} with ${files.length} file${files.length === 1 ? "" : "s"}. The backup job reports success.`,
        snapshotId,
      ),
    ],
  };
}

export async function createLabSession(
  inputs: LabFileInput[],
  at = new Date().toISOString(),
): Promise<RecoveryLabSession> {
  if (inputs.length === 0) throw new Error("Choose at least one file");
  if (inputs.length > LAB_LIMITS.files) {
    throw new Error(`Recovery Lab supports at most ${LAB_LIMITS.files} files`);
  }
  const total = inputs.reduce((sum, input) => sum + input.size, 0);
  if (total > LAB_LIMITS.totalBytes) {
    throw new Error("Selected files exceed the 50 MiB Recovery Lab limit");
  }
  const seen = new Set<string>();
  const workingFiles: LabWorkingFile[] = [];
  for (const [index, input] of inputs.entries()) {
    if (input.size > LAB_LIMITS.perFileBytes) {
      throw new Error(`${input.name} exceeds the 20 MiB per-file limit`);
    }
    const path = normalizeManifestPath(input.path || input.name);
    if (seen.has(path))
      throw new Error(`Duplicate uploaded path ${JSON.stringify(path)}`);
    seen.add(path);
    const bytes = new Uint8Array(input.bytes.slice(0));
    if (bytes.byteLength !== input.size) {
      throw new Error(`Size changed while reading ${path}`);
    }
    workingFiles.push({
      id: `lab-file-${String(index + 1).padStart(3, "0")}`,
      path,
      size: bytes.byteLength,
      modifiedAt: new Date(input.lastModified || Date.parse(at)).toISOString(),
      hash: await sha256(bytes),
      bytes,
    });
  }
  workingFiles.sort((left, right) => left.path.localeCompare(right.path));
  const session: RecoveryLabSession = {
    id: `lab-${at.replaceAll(/[^0-9]/g, "").slice(0, 14)}`,
    createdAt: at,
    workingFiles,
    snapshots: [],
    objects: [],
    destinationState: [],
    events: [],
  };
  const loaded: RecoveryLabSession = {
    ...session,
    events: [
      event(
        session,
        at,
        "files_loaded",
        `Read and hashed ${workingFiles.length} local file${workingFiles.length === 1 ? "" : "s"}; source files remain unchanged.`,
      ),
    ],
  };
  return appendSnapshot(loaded, workingFiles, at, "baseline");
}

export async function createCleanSnapshot(
  session: RecoveryLabSession,
  at = new Date().toISOString(),
): Promise<RecoveryLabSession> {
  return appendSnapshot(session, session.workingFiles, at, "clean snapshot");
}

export async function createModifiedSnapshot(
  session: RecoveryLabSession,
  path: string,
  at = new Date().toISOString(),
): Promise<RecoveryLabSession> {
  const target = session.workingFiles.find((file) => file.path === path);
  if (!target) throw new Error(`Working file not found: ${path}`);
  const changedBytes = new Uint8Array(target.bytes.byteLength + 1);
  changedBytes.set(target.bytes);
  changedBytes[changedBytes.length - 1] = (session.snapshots.length * 37) % 256;
  const changed: LabWorkingFile = {
    ...target,
    bytes: changedBytes,
    size: changedBytes.byteLength,
    hash: await sha256(changedBytes),
    modifiedAt: at,
  };
  const files = session.workingFiles.map((file) =>
    file.path === path ? changed : file,
  );
  const changedSession: RecoveryLabSession = {
    ...session,
    workingFiles: files,
    events: [
      ...session.events,
      event(
        session,
        at,
        "working_copy_modified",
        "Changed one byte in the virtual working copy. Uploaded source bytes were not modified.",
        path,
      ),
    ],
  };
  return appendSnapshot(changedSession, files, at, "modified working copy");
}

export async function createDeletionSnapshot(
  session: RecoveryLabSession,
  path: string,
  at = new Date().toISOString(),
): Promise<RecoveryLabSession> {
  if (!session.workingFiles.some((file) => file.path === path)) {
    throw new Error(`Working file not found: ${path}`);
  }
  const files = session.workingFiles.filter((file) => file.path !== path);
  const changed: RecoveryLabSession = {
    ...session,
    workingFiles: files,
    events: [
      ...session.events,
      event(
        session,
        at,
        "working_copy_deleted",
        "Removed the file from the virtual working set only. Earlier snapshots still reference it.",
        path,
      ),
    ],
  };
  return appendSnapshot(changed, files, at, "deleted from working copy");
}

export async function injectLabCondition(
  session: RecoveryLabSession,
  input: {
    condition: LabCondition;
    snapshotId: string;
    path: string;
    at?: string;
  },
): Promise<RecoveryLabSession> {
  const at = input.at ?? new Date().toISOString();
  const snapshot = session.snapshots.find(
    (item) => item.id === input.snapshotId,
  );
  const file = snapshot?.files.find(
    (item): item is SnapshotFile =>
      item.type === "file" && item.path === input.path,
  );
  if (!snapshot || !file)
    throw new Error("Selected snapshot version was not found");
  if (input.condition === "corrupt_object") {
    const stored = session.objects.find(
      (object) => object.id === file.objectId,
    );
    if (!stored) throw new Error("The selected object is already missing");
    const corrupted =
      stored.bytes.byteLength === 0
        ? new Uint8Array([255])
        : new Uint8Array(stored.bytes);
    if (stored.bytes.byteLength > 0) corrupted[0] ^= 255;
    const replacement: LabObject = {
      ...stored,
      bytes: corrupted,
      observedHash: await sha256(corrupted),
      size: corrupted.byteLength,
      availability: "available",
      verificationTimestamp: at,
    };
    const next = {
      ...session,
      objects: session.objects.map((object) =>
        object.id === stored.id ? replacement : object,
      ),
    };
    return {
      ...next,
      events: [
        ...next.events,
        event(
          next,
          at,
          "object_corrupted",
          `Flipped a byte in ${stored.id}. Expected snapshot hash stayed ${file.expectedHash.slice(0, 20)}…; observed hash is now ${replacement.observedHash.slice(0, 20)}….`,
          input.path,
        ),
      ],
    };
  }
  if (input.condition === "remove_object") {
    const next = {
      ...session,
      objects: session.objects.filter((object) => object.id !== file.objectId),
    };
    return {
      ...next,
      events: [
        ...next.events,
        event(
          next,
          at,
          "object_removed",
          `Removed ${file.objectId} from the virtual object store while the successful snapshot still references it.`,
          input.path,
        ),
      ],
    };
  }
  const conflictBytes = new Uint8Array(file.size + 1);
  conflictBytes[conflictBytes.length - 1] = 91;
  const conflict: DestinationStateEntry = {
    path: input.path,
    currentHash: await sha256(conflictBytes),
    currentSize: conflictBytes.byteLength,
    modifiedAt: at,
  };
  const next = {
    ...session,
    destinationState: [
      ...session.destinationState.filter((entry) => entry.path !== input.path),
      conflict,
    ],
  };
  return {
    ...next,
    events: [
      ...next.events,
      event(
        next,
        at,
        "destination_conflict",
        "Added a newer, different virtual destination file. Original-location simulation will protect it as a conflict.",
        input.path,
      ),
    ],
  };
}

export function toLabManifest(session: RecoveryLabSession): VaultManifest {
  const generatedAt =
    session.events.at(-1)?.at ??
    session.snapshots.at(-1)?.createdAt ??
    session.createdAt;
  return parseVaultManifest({
    schemaVersion: "1.0",
    vaultId: session.id,
    vaultName: "Recovery Lab Vault",
    generatedAt,
    source: "ProofRestore Recovery Lab — controlled browser simulation",
    snapshots: session.snapshots,
    objects: session.objects.map((object) => ({
      id: object.id,
      observedHash: object.observedHash,
      size: object.size,
      availability: object.availability,
      storageLocation: object.storageLocation,
      verificationTimestamp: object.verificationTimestamp,
    })),
    retentionPolicy: {
      mode: "keep_all",
      keepLast: 0,
      keepDaily: 0,
      keepWeekly: 0,
    },
    ...(session.destinationState.length
      ? { destinationState: session.destinationState }
      : {}),
  });
}

export function appendLabEvent(
  session: RecoveryLabSession,
  action: "verification_run" | "manifest_exported",
  message: string,
  at = new Date().toISOString(),
): RecoveryLabSession {
  return {
    ...session,
    events: [...session.events, event(session, at, action, message)],
  };
}
