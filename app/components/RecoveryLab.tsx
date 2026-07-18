"use client";

import { useMemo, useRef, useState } from "react";

import {
  appendLabEvent,
  createCleanSnapshot,
  createDeletionSnapshot,
  createLabSession,
  createModifiedSnapshot,
  injectLabCondition,
  toLabManifest,
  type LabCondition,
  type LabFileInput,
  type RecoveryLabSession,
} from "@/app/lab";
import { planRecovery, type RecoveryPlan } from "@/app/recovery";
import type { VaultManifest } from "@/app/types/manifest";

type DestinationMode = "safe_copy" | "original_location";

type OpenLabVaultInput = {
  manifest: VaultManifest;
  path: string;
  snapshotId: string;
  destinationMode: DestinationMode;
};

function humanBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function verdictCopy(plan: RecoveryPlan): string {
  if (plan.verdict === "fully_recoverable") return "Fully recoverable";
  if (plan.verdict === "partially_recoverable") return "Partially recoverable";
  return "Unrecoverable";
}

function toneForPlan(plan: RecoveryPlan): string {
  if (plan.verdict === "fully_recoverable") return "lab-result-verified";
  if (plan.verdict === "partially_recoverable") return "lab-result-warning";
  return "lab-result-danger";
}

async function browserFiles(files: File[]): Promise<LabFileInput[]> {
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      path:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name,
      size: file.size,
      lastModified: file.lastModified,
      bytes: await file.arrayBuffer(),
    })),
  );
}

export function RecoveryLab({
  onClose,
  onOpenVault,
}: {
  onClose: () => void;
  onOpenVault: (input: OpenLabVaultInput) => void;
}) {
  const [session, setSession] = useState<RecoveryLabSession>();
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState("");
  const [condition, setCondition] = useState<LabCondition>("corrupt_object");
  const [destinationMode, setDestinationMode] =
    useState<DestinationMode>("original_location");
  const [result, setResult] = useState<RecoveryPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const manifest = useMemo(
    () => (session ? toLabManifest(session) : undefined),
    [session],
  );
  const issueCount = useMemo(() => {
    if (!manifest) return 0;
    const objectIssues = manifest.objects.filter(
      (object) => object.availability !== "available",
    ).length;
    const mismatches = manifest.snapshots.reduce(
      (count, snapshot) =>
        count +
        snapshot.files.filter((entry) => {
          if (entry.type !== "file") return false;
          const object = manifest.objects.find(
            (item) => item.id === entry.objectId,
          );
          return !object || object.observedHash !== entry.expectedHash;
        }).length,
      0,
    );
    return objectIssues + mismatches + (manifest.destinationState?.length ?? 0);
  }, [manifest]);

  function syncSelection(next: RecoveryLabSession) {
    const latest = next.snapshots.at(-1);
    const latestFile = latest?.files.find((entry) => entry.type === "file");
    setSelectedSnapshot(latest?.id ?? "");
    if (latestFile) setSelectedPath(latestFile.path);
    setResult(undefined);
  }

  async function loadInputs(inputs: LabFileInput[]) {
    setBusy(true);
    setError(undefined);
    try {
      const next = await createLabSession(inputs);
      setSession(next);
      syncSelection(next);
      setAnnouncement(
        `Recovery Lab created with ${inputs.length} file${inputs.length === 1 ? "" : "s"} and one baseline snapshot.`,
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Files could not be read";
      setError(message);
      setAnnouncement(message);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  }

  async function loadFiles(files: FileList | null) {
    if (!files?.length) return;
    await loadInputs(await browserFiles([...files]));
  }

  async function loadSamples() {
    const encoder = new TextEncoder();
    const samples = [
      [
        "Documents/Recovery-Plan.txt",
        "Recovery priorities and owner contacts.\n",
      ],
      ["Documents/Budget.csv", "category,amount\noperations,4200\n"],
      [
        "Projects/Launch-Notes.md",
        "# Launch notes\nEvidence before emergency.\n",
      ],
    ] as const;
    await loadInputs(
      samples.map(([path, content], index) => {
        const bytes = encoder.encode(content);
        return {
          name: path.split("/").at(-1) ?? path,
          path,
          size: bytes.byteLength,
          lastModified: Date.now() - index * 60_000,
          bytes: bytes.buffer,
        };
      }),
    );
  }

  async function updateSession(
    operation: (current: RecoveryLabSession) => Promise<RecoveryLabSession>,
    successMessage: string,
  ) {
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      const next = await operation(session);
      setSession(next);
      syncSelection(next);
      setAnnouncement(successMessage);
    } catch (operationError) {
      const message =
        operationError instanceof Error
          ? operationError.message
          : "Lab action failed";
      setError(message);
      setAnnouncement(message);
    } finally {
      setBusy(false);
    }
  }

  async function applyCondition() {
    if (!session || !selectedPath || !selectedSnapshot) return;
    await updateSession(
      (current) =>
        injectLabCondition(current, {
          condition,
          path: selectedPath,
          snapshotId: selectedSnapshot,
        }),
      "Controlled condition applied to the virtual vault.",
    );
    setSelectedPath(selectedPath);
    setSelectedSnapshot(selectedSnapshot);
  }

  function verify() {
    if (!session || !selectedPath || !selectedSnapshot) return;
    const nextManifest = toLabManifest(session);
    const nextResult = planRecovery(nextManifest, {
      path: selectedPath,
      snapshotId: selectedSnapshot,
      includeChildren: false,
      destinationMode,
    });
    setResult(nextResult);
    setSession(
      appendLabEvent(
        session,
        "verification_run",
        `Deterministic engine returned ${nextResult.verdict.replaceAll("_", " ")} with evidence: ${nextResult.evidence.map((item) => item.code).join(", ")}.`,
      ),
    );
    setAnnouncement(`Lab verification complete: ${verdictCopy(nextResult)}.`);
    window.setTimeout(() => resultRef.current?.focus(), 0);
  }

  function exportManifest() {
    if (!session) return;
    const content = JSON.stringify(toLabManifest(session), null, 2);
    const url = URL.createObjectURL(
      new Blob([content], { type: "application/json;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proofrestore-recovery-lab.json";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setSession(
      appendLabEvent(
        session,
        "manifest_exported",
        "Exported the schema-valid lab manifest.",
      ),
    );
    setAnnouncement("Recovery Lab manifest exported.");
  }

  function resetLab() {
    if (
      session &&
      !window.confirm("Clear this temporary Recovery Lab session?")
    )
      return;
    setSession(undefined);
    setSelectedPath("");
    setSelectedSnapshot("");
    setResult(undefined);
    setError(undefined);
    setAnnouncement(
      "Recovery Lab cleared. Uploaded originals were not changed.",
    );
  }

  const selectedVersion = manifest?.snapshots
    .find((snapshot) => snapshot.id === selectedSnapshot)
    ?.files.find(
      (entry) => entry.type === "file" && entry.path === selectedPath,
    );

  return (
    <main className="lab-shell">
      <header className="lab-header">
        <div className="site-container lab-header-inner">
          <button className="button quiet" type="button" onClick={onClose}>
            ← Back to home
          </button>
          <div>
            <span className="eyebrow">Interactive test harness</span>
            <strong>Recovery Lab</strong>
          </div>
          <span className="status-pill status-blue">Local session</span>
        </div>
      </header>

      <div className="site-container lab-body">
        <section className="lab-intro" aria-labelledby="lab-title">
          <div>
            <span className="eyebrow">Controlled recovery experiment</span>
            <h1 id="lab-title">
              Break a virtual backup. Watch ProofRestore prove it.
            </h1>
            <p>
              Upload non-sensitive files, create browser-only snapshots, inject
              a failure, and inspect the deterministic evidence yourself.
            </p>
          </div>
          <button className="button quiet" type="button" onClick={resetLab}>
            Reset lab
          </button>
        </section>

        <section
          className="lab-trust"
          aria-label="Recovery Lab safety boundary"
        >
          <strong>Your originals stay untouched.</strong>
          <p>
            Files are read and hashed in this browser tab. Snapshots, byte
            changes, deletions, and conflicts affect in-memory copies only;
            nothing is uploaded, restored, overwritten, or deleted. Refreshing
            clears the lab.
          </p>
          <p>
            This controlled simulation tests ProofRestore behavior. Because
            baseline hashes originate from the same upload, it is not
            independent proof of a real backup.
          </p>
        </section>

        <section className="lab-metrics" aria-label="Recovery Lab summary">
          <div>
            <span>Files</span>
            <strong>{session?.workingFiles.length ?? 0}</strong>
          </div>
          <div>
            <span>Snapshots</span>
            <strong>{session?.snapshots.length ?? 0}</strong>
          </div>
          <div>
            <span>Stored objects</span>
            <strong>{session?.objects.length ?? 0}</strong>
          </div>
          <div>
            <span>Injected issues</span>
            <strong>{issueCount}</strong>
          </div>
        </section>

        {error ? (
          <p className="inline-alert" role="alert">
            {error}
          </p>
        ) : null}

        <div className="lab-layout">
          <div className="lab-workflow">
            <section className="lab-step" aria-labelledby="lab-step-files">
              <div className="lab-step-heading">
                <span>1</span>
                <div>
                  <h2 id="lab-step-files">Add test data</h2>
                  <p>
                    A baseline snapshot is created automatically after local
                    SHA-256 hashing.
                  </p>
                </div>
              </div>
              <div className="lab-actions">
                <button
                  className="button primary"
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => folderInputRef.current?.click()}
                >
                  Choose a folder
                </button>
                <button
                  className="button quiet"
                  type="button"
                  disabled={busy}
                  onClick={() => void loadSamples()}
                >
                  Use sample files
                </button>
              </div>
              <input
                ref={fileInputRef}
                id="lab-file-input"
                className="visually-hidden"
                type="file"
                multiple
                onChange={(event) => void loadFiles(event.target.files)}
              />
              <input
                ref={(node) => {
                  folderInputRef.current = node;
                  node?.setAttribute("webkitdirectory", "");
                  node?.setAttribute("directory", "");
                }}
                id="lab-folder-input"
                className="visually-hidden"
                type="file"
                multiple
                onChange={(event) => void loadFiles(event.target.files)}
              />
              {busy ? (
                <p className="lab-progress" role="status">
                  Reading and hashing local copies…
                </p>
              ) : null}
              {session ? (
                <ul className="lab-file-list" aria-label="Lab working files">
                  {session.workingFiles.map((file) => (
                    <li key={file.id}>
                      <div>
                        <strong>{file.path}</strong>
                        <span>{humanBytes(file.size)}</span>
                      </div>
                      <details>
                        <summary>View SHA-256</summary>
                        <code>{file.hash}</code>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="lab-empty">
                  Choose a few non-sensitive files or use the prepared sample
                  set.
                </p>
              )}
            </section>

            <section className="lab-step" aria-labelledby="lab-step-history">
              <div className="lab-step-heading">
                <span>2</span>
                <div>
                  <h2 id="lab-step-history">Build recovery history</h2>
                  <p>
                    These snapshots are virtual records in this browser tab.
                  </p>
                </div>
              </div>
              <div className="lab-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={!session || busy}
                  onClick={() =>
                    void updateSession(
                      (current) => createCleanSnapshot(current),
                      "Clean virtual snapshot created.",
                    )
                  }
                >
                  Create clean snapshot
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={!session || !selectedPath || busy}
                  onClick={() =>
                    void updateSession(
                      (current) =>
                        createModifiedSnapshot(current, selectedPath),
                      "Changed virtual version and captured a new snapshot.",
                    )
                  }
                >
                  Modify selected file + snapshot
                </button>
                <button
                  className="button quiet"
                  type="button"
                  disabled={!session || !selectedPath || busy}
                  onClick={() =>
                    void updateSession(
                      (current) =>
                        createDeletionSnapshot(current, selectedPath),
                      "Removed file from working copy and captured a new snapshot.",
                    )
                  }
                >
                  Delete selected file + snapshot
                </button>
              </div>
              {session ? (
                <ol className="lab-snapshot-list">
                  {session.snapshots.map((snapshot) => (
                    <li
                      key={snapshot.id}
                      className={
                        snapshot.id === selectedSnapshot ? "selected" : ""
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSnapshot(snapshot.id)}
                        aria-pressed={snapshot.id === selectedSnapshot}
                      >
                        <span>
                          <strong>{snapshot.id}</strong>
                          <small>
                            {new Date(snapshot.createdAt).toLocaleTimeString()}
                          </small>
                        </span>
                        <span>
                          {
                            snapshot.files.filter(
                              (entry) => entry.type === "file",
                            ).length
                          }{" "}
                          files · job success
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>

            <section className="lab-step" aria-labelledby="lab-step-condition">
              <div className="lab-step-heading">
                <span>3</span>
                <div>
                  <h2 id="lab-step-condition">Inject a test condition</h2>
                  <p>
                    Choose the exact snapshot version and make one controlled
                    evidence change.
                  </p>
                </div>
              </div>
              <div className="lab-target-grid">
                <label>
                  Target snapshot
                  <select
                    value={selectedSnapshot}
                    disabled={!session}
                    onChange={(event) =>
                      setSelectedSnapshot(event.target.value)
                    }
                  >
                    {session?.snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {snapshot.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Target file
                  <select
                    value={selectedPath}
                    disabled={!session}
                    onChange={(event) => setSelectedPath(event.target.value)}
                  >
                    {manifest?.snapshots
                      .find((snapshot) => snapshot.id === selectedSnapshot)
                      ?.files.filter((entry) => entry.type === "file")
                      .map((entry) => (
                        <option key={entry.path} value={entry.path}>
                          {entry.path}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <fieldset className="lab-condition-options">
                <legend>Controlled condition</legend>
                {(
                  [
                    [
                      "corrupt_object",
                      "Corrupt stored copy",
                      "Flip a byte. Expected hash stays fixed; observed hash changes.",
                      "hash_mismatch",
                    ],
                    [
                      "remove_object",
                      "Remove stored copy",
                      "Keep the successful snapshot reference but remove its object.",
                      "object_missing",
                    ],
                    [
                      "destination_conflict",
                      "Create destination conflict",
                      "Add a newer, different virtual destination file.",
                      "destination_conflict",
                    ],
                  ] as const
                ).map(([value, label, copy, code]) => (
                  <label
                    key={value}
                    className={condition === value ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="lab-condition"
                      value={value}
                      checked={condition === value}
                      onChange={() => setCondition(value)}
                    />
                    <span>
                      <strong>{label}</strong>
                      <small>{copy}</small>
                      <code>{code}</code>
                    </span>
                  </label>
                ))}
              </fieldset>
              <button
                className="button primary"
                type="button"
                disabled={!selectedVersion || busy}
                onClick={() => void applyCondition()}
              >
                Apply to virtual vault
              </button>
            </section>

            <section className="lab-step" aria-labelledby="lab-step-verify">
              <div className="lab-step-heading">
                <span>4</span>
                <div>
                  <h2 id="lab-step-verify">Verify recovery</h2>
                  <p>
                    The existing deterministic engine evaluates the generated
                    manifest.
                  </p>
                </div>
              </div>
              <fieldset className="lab-destination-options">
                <legend>Simulation destination</legend>
                <label>
                  <input
                    type="radio"
                    name="lab-destination"
                    checked={destinationMode === "safe_copy"}
                    onChange={() => setDestinationMode("safe_copy")}
                  />{" "}
                  Separate safe copy
                </label>
                <label>
                  <input
                    type="radio"
                    name="lab-destination"
                    checked={destinationMode === "original_location"}
                    onChange={() => setDestinationMode("original_location")}
                  />{" "}
                  Original location
                </label>
              </fieldset>
              <div className="lab-actions">
                <button
                  className="button primary"
                  type="button"
                  disabled={!selectedVersion}
                  onClick={verify}
                >
                  Run recovery check
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={!session}
                  onClick={exportManifest}
                >
                  Export generated manifest
                </button>
              </div>
              {result ? (
                <div className={`lab-result ${toneForPlan(result)}`}>
                  <span className="eyebrow">Deterministic result</span>
                  <h3 ref={resultRef} tabIndex={-1}>
                    {verdictCopy(result)}
                  </h3>
                  <p>
                    {result.totals.recoverableItems} recoverable ·{" "}
                    {result.totals.unavailableItems} unavailable ·{" "}
                    {result.totals.conflicts} conflicts
                  </p>
                  <div className="lab-evidence-codes">
                    {result.evidence.map((item) => (
                      <code key={item.id}>{item.code}</code>
                    ))}
                  </div>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() =>
                      onOpenVault({
                        manifest: toLabManifest(session!),
                        path: selectedPath,
                        snapshotId: selectedSnapshot,
                        destinationMode,
                      })
                    }
                  >
                    Open full recovery workflow →
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <aside className="lab-log" aria-labelledby="lab-log-title">
            <div>
              <span className="eyebrow">Full visibility</span>
              <h2 id="lab-log-title">Activity & evidence</h2>
            </div>
            {session?.events.length ? (
              <ol>
                {session.events.map((item, index) => (
                  <li key={item.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.action.replaceAll("_", " ")}</strong>
                      {item.target ? <code>{item.target}</code> : null}
                      <p>{item.message}</p>
                      <small>{new Date(item.at).toLocaleTimeString()}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="lab-empty">
                Every hash, snapshot, mutation, and verdict will appear here in
                order.
              </p>
            )}
          </aside>
        </div>
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}
