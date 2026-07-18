"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { demoVault, DEMO_SCENARIOS } from "@/app/demo";
import { interpretWithoutModel } from "@/app/interpret/fallback";
import { interpretedRecoveryRequestSchema } from "@/app/interpret/types";
import {
  DEFAULT_MAX_MANIFEST_BYTES,
  parseVaultManifestJson,
} from "@/app/manifest";
import {
  analyzeRetention,
  evaluateIntegrity,
  planRecovery,
  type Evidence,
  type RecoveryPlan,
} from "@/app/recovery";
import { generateProofReport } from "@/app/reports/markdown";
import type { VaultManifest } from "@/app/types/manifest";

const DEMO_QUERY = "Can I recover my thesis from Tuesday evening?";
const STAGES = [
  { id: 1, short: "Health", label: "Vault health" },
  { id: 2, short: "Request", label: "Recovery request" },
  { id: 3, short: "Simulate", label: "Restore simulation" },
  { id: 4, short: "Proof", label: "Proof report" },
] as const;

type Stage = (typeof STAGES)[number]["id"];
type DestinationMode = "safe_copy" | "original_location";

function humanBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function parentPath(path: string): string {
  return path.split("/").slice(0, -1).join(" / ") || "Vault root";
}

function uniquePaths(manifest: VaultManifest): string[] {
  return Array.from(
    new Set(
      manifest.snapshots.flatMap((snapshot) =>
        snapshot.files.map((entry) => entry.path),
      ),
    ),
  ).sort();
}

function toneForVerdict(plan: RecoveryPlan): "verified" | "warning" | "danger" {
  if (plan.verdict === "fully_recoverable") return "verified";
  if (plan.verdict === "partially_recoverable") return "warning";
  return "danger";
}

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "blue" | "neutral";
  children: React.ReactNode;
}) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

function Brand() {
  return (
    <div className="brand" aria-label="ProofRestore">
      <span className="brand-mark" aria-hidden="true">
        PR
      </span>
      <span>ProofRestore</span>
    </div>
  );
}

function StageStepper({
  active,
  highestAvailable,
  onSelect,
}: {
  active: Stage;
  highestAvailable: Stage;
  onSelect: (stage: Stage) => void;
}) {
  return (
    <nav className="stage-nav" aria-label="Recovery workflow">
      <ol>
        {STAGES.map((stage) => {
          const completed = stage.id < active || stage.id < highestAvailable;
          const available = stage.id <= highestAvailable;
          return (
            <li key={stage.id}>
              <button
                type="button"
                className={`stage-button${active === stage.id ? " active" : ""}${completed ? " complete" : ""}`}
                aria-current={active === stage.id ? "step" : undefined}
                disabled={!available}
                onClick={() => onSelect(stage.id)}
              >
                <span className="stage-number" aria-hidden="true">
                  {completed ? "✓" : stage.id}
                </span>
                <span className="stage-label">
                  <span className="stage-short">{stage.short}</span>
                  <span className="stage-long">{stage.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="evidence-list">
      {evidence.map((item) => (
        <li className="evidence-item" key={item.id}>
          <span className="evidence-code mono">{item.code}</span>
          <span>{item.message}</span>
          <StatusPill
            tone={
              item.severity === "error"
                ? "red"
                : item.severity === "warning"
                  ? "amber"
                  : "green"
            }
          >
            {item.severity}
          </StatusPill>
        </li>
      ))}
    </ul>
  );
}

export function ProofRestoreApp() {
  const [started, setStarted] = useState(false);
  const [activeStage, setActiveStage] = useState<Stage>(1);
  const [manifest, setManifest] = useState<VaultManifest>(demoVault);
  const [manifestKind, setManifestKind] = useState<"demo" | "imported">("demo");
  const [search, setSearch] = useState("Thesis-Final.docx");
  const [selectedPath, setSelectedPath] = useState<string>();
  const [query, setQuery] = useState(DEMO_QUERY);
  const [destinationMode, setDestinationMode] =
    useState<DestinationMode>("safe_copy");
  const [includeChildren, setIncludeChildren] = useState(false);
  const [recoveryPoint, setRecoveryPoint] = useState("interpreted");
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const [plan, setPlan] = useState<RecoveryPlan>();
  const [interpretation, setInterpretation] = useState<string>();
  const [interpreterSource, setInterpreterSource] = useState<
    "openai" | "deterministic_fallback"
  >();
  const [investigating, setInvestigating] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [report, setReport] = useState<string>();
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");

  const welcomeHeadingRef = useRef<HTMLHeadingElement>(null);
  const vaultHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const paths = useMemo(() => uniquePaths(manifest), [manifest]);
  const objects = useMemo(
    () => new Map(manifest.objects.map((object) => [object.id, object])),
    [manifest],
  );
  const matchingPaths = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("en-US");
    return needle
      ? paths.filter((path) => path.toLocaleLowerCase("en-US").includes(needle))
      : paths.slice(0, 12);
  }, [paths, search]);
  const latest = useMemo(
    () =>
      [...manifest.snapshots].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )[0],
    [manifest],
  );
  const latestFiles = useMemo(
    () => latest?.files.filter((file) => file.type === "file") ?? [],
    [latest],
  );
  const latestIntegrity = useMemo(
    () =>
      latestFiles.map((file) => ({
        file,
        result: evaluateIntegrity(file, objects.get(file.objectId)),
      })),
    [latestFiles, objects],
  );
  const latestVerified = latestIntegrity.filter(
    ({ result }) => result.verdict === "verified",
  ).length;
  const integrityIssues = latestIntegrity.filter(
    ({ result }) => result.verdict !== "verified",
  );
  const retention = useMemo(
    () => analyzeRetention(manifest, new Date(manifest.generatedAt)),
    [manifest],
  );
  const retentionRisks = retention.filter(
    (item) => !item.healthyAlternativeSurvives,
  );
  const selectedVersions = useMemo(
    () =>
      selectedPath
        ? manifest.snapshots
            .flatMap((snapshot) => {
              const entry = snapshot.files.find(
                (candidate) => candidate.path === selectedPath,
              );
              if (!entry) return [];
              return [{ snapshot, entry }];
            })
            .sort((a, b) =>
              b.snapshot.createdAt.localeCompare(a.snapshot.createdAt),
            )
        : [],
    [manifest, selectedPath],
  );
  const selectedEntry = selectedVersions[0]?.entry;
  const selectedIsDirectory = selectedEntry?.type === "directory";

  const backupStatus = !latest
    ? { label: "Unavailable", detail: "No snapshot", tone: "red" as const }
    : latest.status === "complete" && latest.jobReportedSuccess
      ? { label: "Completed", detail: "Job succeeded", tone: "green" as const }
      : latest.status === "partial"
        ? {
            label: "Partial",
            detail: "Review required",
            tone: "amber" as const,
          }
        : { label: "Failed", detail: "Job incomplete", tone: "red" as const };
  const recoverabilityStatus =
    latestFiles.length > 0 &&
    integrityIssues.length === 0 &&
    retentionRisks.length === 0
      ? {
          label: "Verified",
          detail: "Evidence healthy",
          tone: "green" as const,
        }
      : latestFiles.length === 0
        ? {
            label: "Unknown",
            detail: "No files verified",
            tone: "amber" as const,
          }
        : {
            label: "At risk",
            detail: "Action needed",
            tone: "amber" as const,
          };

  const highestAvailable: Stage = simulated ? 4 : plan ? 3 : 2;

  useEffect(() => {
    if (activeStage === 3 && plan) {
      const focusTimer = window.setTimeout(
        () => resultHeadingRef.current?.focus({ preventScroll: true }),
        0,
      );
      return () => window.clearTimeout(focusTimer);
    }
  }, [activeStage, plan]);

  function focusSoon(ref: React.RefObject<HTMLElement | null>) {
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      ref.current?.focus({ preventScroll: true });
    }, 0);
  }

  function goToStage(stage: Stage) {
    setActiveStage(stage);
    window.setTimeout(() => {
      document
        .getElementById(`stage-title-${stage}`)
        ?.focus({ preventScroll: true });
      document
        .getElementById("active-stage")
        ?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 0);
  }

  function resetDownstream(message?: string) {
    const hadResult = Boolean(plan || report || simulated);
    setPlan(undefined);
    setSimulated(false);
    setReport(undefined);
    setInterpretation(undefined);
    setInterpreterSource(undefined);
    if (activeStage > 2) setActiveStage(2);
    if (hadResult || message) {
      setAnnouncement(
        message ??
          "Recovery inputs changed. Verify again to refresh the result.",
      );
    }
  }

  function openDemo() {
    setManifest(demoVault);
    setManifestKind("demo");
    setStarted(true);
    setActiveStage(1);
    setSearch("Thesis-Final.docx");
    setSelectedPath(undefined);
    setQuery(DEMO_QUERY);
    setDestinationMode("safe_copy");
    setRecoveryPoint("interpreted");
    setShowOlderVersions(false);
    setPlan(undefined);
    setSimulated(false);
    setReport(undefined);
    setError(undefined);
    setAnnouncement("Demo vault opened. Start with the vault health summary.");
    focusSoon(vaultHeadingRef);
  }

  function backToWelcome() {
    setStarted(false);
    setAnnouncement("Returned to the ProofRestore welcome screen.");
    focusSoon(welcomeHeadingRef);
  }

  function choosePath(path: string) {
    const entry = manifest.snapshots
      .flatMap((snapshot) => snapshot.files)
      .find((candidate) => candidate.path === path);
    setSelectedPath(path);
    setIncludeChildren(entry?.type === "directory");
    setQuery(
      path === DEMO_SCENARIOS.thesisPath
        ? DEMO_QUERY
        : `Can I recover ${path}?`,
    );
    setRecoveryPoint("interpreted");
    setShowOlderVersions(false);
    resetDownstream(`${basename(path)} selected.`);
  }

  async function importManifest(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > DEFAULT_MAX_MANIFEST_BYTES) {
        throw new Error("Manifest exceeds the 5 MiB import limit");
      }
      const imported = parseVaultManifestJson(await file.text());
      setManifest(imported);
      setManifestKind("imported");
      setStarted(true);
      setActiveStage(1);
      setSelectedPath(undefined);
      setPlan(undefined);
      setSimulated(false);
      setReport(undefined);
      setSearch("");
      setQuery("");
      setDestinationMode("safe_copy");
      setRecoveryPoint("interpreted");
      setShowOlderVersions(false);
      setError(undefined);
      setAnnouncement(`${imported.vaultName} imported and validated.`);
      focusSoon(vaultHeadingRef);
    } catch (importError) {
      const message =
        importError instanceof Error
          ? `Import rejected: ${importError.message}`
          : "Import rejected.";
      setError(message);
      setAnnouncement(message);
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function investigate() {
    setError(undefined);
    if (!selectedPath) {
      setError("Select a protected file or folder before verification.");
      setAnnouncement("Select a protected path before verification.");
      return;
    }

    setInvestigating(true);
    setAnnouncement("Interpreting the recovery request.");
    const interpreterInput = {
      query: query || `Recover ${selectedPath}`,
      pathCandidates: paths,
      referenceDateTime: manifest.generatedAt,
    };
    let interpreted = interpretWithoutModel(interpreterInput);
    let source: "openai" | "deterministic_fallback" = "deterministic_fallback";

    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(interpreterInput),
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          result?: unknown;
          interpreter?: unknown;
        };
        const parsed = interpretedRecoveryRequestSchema.safeParse(
          payload.result,
        );
        if (parsed.success) {
          interpreted = parsed.data;
          source = payload.interpreter === "openai" ? "openai" : source;
        }
      }
    } catch {
      // The deterministic interpretation above is a complete no-network fallback.
    }

    const manualSnapshot =
      recoveryPoint === "interpreted" ? undefined : recoveryPoint;
    const requestedAt = manualSnapshot
      ? undefined
      : interpreted.requestedDateTime;
    if (!manualSnapshot && !requestedAt) {
      setError("Add a date to the request or choose an exact snapshot below.");
      setAnnouncement("A recovery point is required.");
      setInvestigating(false);
      return;
    }

    const nextPlan = planRecovery(manifest, {
      path: selectedPath,
      ...(manualSnapshot ? { snapshotId: manualSnapshot } : { requestedAt }),
      snapshotMode: "at_or_before",
      includeChildren,
      destinationMode,
    });
    setInterpretation(
      manualSnapshot
        ? "An exact snapshot was chosen manually"
        : interpreted.dateInterpretation,
    );
    setInterpreterSource(source);
    setPlan(nextPlan);
    setSimulated(false);
    setReport(undefined);
    setInvestigating(false);
    goToStage(3);
    setAnnouncement(
      `Verification complete. Result: ${nextPlan.verdict.replaceAll("_", " ")}.`,
    );
  }

  function runSimulation() {
    setSimulated(true);
    setAnnouncement(
      plan?.totals.conflicts
        ? "Restore simulation complete. No files changed. A destination conflict needs review."
        : "Restore simulation complete. No files changed.",
    );
  }

  function downloadReport(markdown: string) {
    const url = URL.createObjectURL(
      new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proof-of-recoverability.md";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function createReport() {
    if (!plan) return;
    const generated = generateProofReport({
      manifest,
      plan,
      originalRequest: query || `Recover ${selectedPath ?? "selected path"}`,
      generatedAt: new Date().toISOString(),
      retentionFindings: retention,
    });
    setReport(generated);
    downloadReport(generated);
    setAnnouncement("Proof report ready and downloaded as Markdown.");
  }

  function startAnotherCheck() {
    setSelectedPath(undefined);
    setSearch("");
    setQuery("");
    setDestinationMode("safe_copy");
    setRecoveryPoint("interpreted");
    setShowOlderVersions(false);
    setPlan(undefined);
    setSimulated(false);
    setReport(undefined);
    goToStage(2);
    setAnnouncement("Ready for another recovery check.");
  }

  if (!started) {
    return (
      <main className="welcome-shell">
        <div className="site-container">
          <header className="public-header">
            <Brand />
            <span className="header-kicker">Recovery verification</span>
          </header>

          <section className="welcome-hero">
            <div className="hero-copy">
              <span className="eyebrow">Evidence before emergency</span>
              <h1 ref={welcomeHeadingRef} tabIndex={-1}>
                Know your backup will restore before you need it.
              </h1>
              <p className="hero-lede">
                Verify backup history, safely simulate recovery, and keep exact
                evidence for every result.
              </p>
              <div className="hero-actions">
                <button className="button primary large" onClick={openDemo}>
                  Explore demo vault
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  className="button secondary large"
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                >
                  Import backup manifest
                </button>
                <input
                  ref={importInputRef}
                  id="welcome-import"
                  className="visually-hidden"
                  tabIndex={-1}
                  type="file"
                  accept="application/json,.json"
                  aria-label="Choose a backup manifest to import"
                  onChange={(event) =>
                    void importManifest(event.target.files?.[0])
                  }
                />
              </div>
              {error ? (
                <p className="inline-alert" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <aside className="trust-preview" aria-label="ProofRestore summary">
              <div className="preview-contrast">
                <div>
                  <span>Backup job</span>
                  <strong>Completed</strong>
                </div>
                <div>
                  <span>Recovery</span>
                  <strong>At risk</strong>
                </div>
              </div>
              <p>
                A green backup status can still hide corruption, missing
                objects, conflicts, and expiring healthy copies.
              </p>
              <div className="preview-evidence mono">
                <span>hash_match</span>
                <span>object_found</span>
                <span>destination_conflict</span>
              </div>
            </aside>
          </section>

          <section className="how-it-works" aria-labelledby="how-title">
            <div>
              <span className="eyebrow">A two-minute answer</span>
              <h2 id="how-title">From backup status to recovery proof.</h2>
            </div>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <strong>Choose what you need</strong>
                  <p>Find a protected path and recovery point.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Verify the evidence</strong>
                  <p>
                    Test object availability, hashes, sizes, and eligibility.
                  </p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Simulate safely</strong>
                  <p>See conflicts and export proof without changing a file.</p>
                </div>
              </li>
            </ol>
          </section>

          <p className="closing-line">
            Backup success is not recovery success.
          </p>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </main>
    );
  }

  const planTone = plan ? toneForVerdict(plan) : "warning";
  const hasConflict = Boolean(
    plan?.items.some((item) => item.action === "conflict"),
  );
  const hasUnavailable = Boolean(
    plan?.items.some((item) => item.action === "unavailable"),
  );
  const restoreSafety = hasConflict
    ? "Conflict review required"
    : hasUnavailable
      ? "Cannot complete"
      : simulated
        ? "Simulation passed"
        : "Ready to simulate";
  const simulationTone = hasUnavailable
    ? "danger"
    : hasConflict
      ? "warning"
      : "verified";

  return (
    <main className="workspace-shell">
      <a className="skip-link" href="#active-stage">
        Skip to active recovery step
      </a>
      <header className="workspace-header">
        <div className="site-container workspace-header-inner">
          <div className="workspace-identity">
            <Brand />
            <span className="header-divider" aria-hidden="true" />
            <div>
              <h1 ref={vaultHeadingRef} tabIndex={-1}>
                {manifest.vaultName}
              </h1>
              <div className="vault-meta">
                <StatusPill tone="blue">
                  {manifestKind === "demo" ? "Demo vault" : "Imported manifest"}
                </StatusPill>
                <span>Generated {displayDate(manifest.generatedAt)}</span>
              </div>
            </div>
          </div>
          <div className="header-statuses" aria-label="Current vault status">
            <div>
              <span>Latest backup</span>
              <strong>{backupStatus.label}</strong>
            </div>
            <div>
              <span>Recoverability</span>
              <strong>{recoverabilityStatus.label}</strong>
            </div>
          </div>
          <div className="header-utilities">
            <button
              className="button quiet"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              Import
            </button>
            <input
              ref={importInputRef}
              id="dashboard-import"
              className="visually-hidden"
              tabIndex={-1}
              type="file"
              accept="application/json,.json"
              aria-label="Choose another backup manifest to import"
              onChange={(event) => void importManifest(event.target.files?.[0])}
            />
            <button className="button quiet" onClick={backToWelcome}>
              Exit vault
            </button>
          </div>
        </div>
      </header>

      <div className="site-container workspace-body">
        <StageStepper
          active={activeStage}
          highestAvailable={highestAvailable}
          onSelect={goToStage}
        />

        <section id="active-stage" className="stage-panel">
          {activeStage === 1 ? (
            <div className="stage-content health-stage">
              <div className="stage-heading-row">
                <div>
                  <span className="eyebrow">Step 1 · Vault health</span>
                  <h2 id="stage-title-1" tabIndex={-1}>
                    The backup completed, but recovery is at risk.
                  </h2>
                  <p>
                    The latest job reported success. Deterministic verification
                    found{" "}
                    {` ${integrityIssues.length} integrity issue${integrityIssues.length === 1 ? "" : "s"}`}{" "}
                    and{" "}
                    {` ${retentionRisks.length} retention risk${retentionRisks.length === 1 ? "" : "s"}`}{" "}
                    that need attention.
                  </p>
                </div>
                <button className="button primary" onClick={() => goToStage(2)}>
                  Check a file
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="health-contrast">
                <article>
                  <div>
                    <span className="card-label">Latest backup job</span>
                    <strong>{backupStatus.label}</strong>
                    <p>
                      {backupStatus.detail} according to the source manifest.
                    </p>
                  </div>
                  <StatusPill tone={backupStatus.tone}>
                    {backupStatus.detail}
                  </StatusPill>
                </article>
                <article>
                  <div>
                    <span className="card-label">Verified recoverability</span>
                    <strong>{recoverabilityStatus.label}</strong>
                    <p>
                      Integrity and retention checks found hidden recovery risk.
                    </p>
                  </div>
                  <StatusPill tone={recoverabilityStatus.tone}>
                    {recoverabilityStatus.detail}
                  </StatusPill>
                </article>
              </div>

              <div
                className="priority-metrics"
                aria-label="Priority vault metrics"
              >
                <article>
                  <span>Snapshots analyzed</span>
                  <strong>{manifest.snapshots.length}</strong>
                  <small>Fixed recovery points</small>
                </article>
                <article>
                  <span>Protected files</span>
                  <strong>{latestFiles.length}</strong>
                  <small>
                    {latestVerified} verified in the latest snapshot
                  </small>
                </article>
                <article>
                  <span>Latest integrity issues</span>
                  <strong>{integrityIssues.length}</strong>
                  <small>
                    {latestVerified} of {latestFiles.length} latest files
                    verified
                  </small>
                </article>
                <article>
                  <span>Vault-wide retention risks</span>
                  <strong>{retentionRisks.length}</strong>
                  <small>Healthy copies nearing expiry</small>
                </article>
                <article>
                  <span>Last restore test</span>
                  <strong className="metric-text">Not run</strong>
                  <small>Start with a protected file</small>
                </article>
              </div>

              <details className="findings-disclosure">
                <summary>View vault findings and details</summary>
                <div className="findings-grid">
                  <div>
                    <h3>Integrity findings</h3>
                    {integrityIssues.length ? (
                      <ul className="compact-list">
                        {integrityIssues.map(({ file, result }) => (
                          <li key={file.path}>
                            <span className="path-text">{file.path}</span>
                            <StatusPill tone="red">{result.verdict}</StatusPill>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No latest-snapshot integrity issues.</p>
                    )}
                  </div>
                  <div>
                    <h3>Retention findings</h3>
                    {retentionRisks.length ? (
                      <ul className="compact-list">
                        {retentionRisks.map((finding) => (
                          <li key={`${finding.path}-${finding.snapshotId}`}>
                            <span className="path-text">{finding.path}</span>
                            <StatusPill tone="amber">
                              {finding.urgency}
                            </StatusPill>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No vault-wide retention risks.</p>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ) : null}

          {activeStage === 2 ? (
            <div className="stage-content request-stage">
              <div className="stage-heading-row compact">
                <div>
                  <span className="eyebrow">Step 2 · Recovery request</span>
                  <h2 id="stage-title-2" tabIndex={-1}>
                    What do you need to recover?
                  </h2>
                  <p>
                    Search protected history, choose a path, then describe the
                    recovery point you need.
                  </p>
                </div>
                <div className="trust-note">
                  Language finds intent and time. Tested code decides recovery.
                </div>
              </div>

              <div className="request-workspace">
                <section
                  className="path-picker"
                  aria-labelledby="path-picker-title"
                >
                  <div className="section-heading">
                    <div>
                      <span className="step-chip">1</span>
                      <h3 id="path-picker-title">Choose a protected path</h3>
                    </div>
                    <span className="result-count" role="status">
                      {matchingPaths.length} match
                      {matchingPaths.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <label htmlFor="file-search">Search files and folders</label>
                  <div className="search-control">
                    <span aria-hidden="true">⌕</span>
                    <input
                      id="file-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search protected paths"
                    />
                  </div>
                  <ul
                    className="path-results"
                    aria-label="Matching protected paths"
                  >
                    {matchingPaths.slice(0, 8).map((path) => {
                      const versions = manifest.snapshots.filter((snapshot) =>
                        snapshot.files.some((entry) => entry.path === path),
                      );
                      const newestSnapshot = [...versions].sort((a, b) =>
                        b.createdAt.localeCompare(a.createdAt),
                      )[0];
                      const newest = newestSnapshot?.files.find(
                        (entry) => entry.path === path,
                      );
                      const integrity =
                        newest?.type === "file"
                          ? evaluateIntegrity(
                              newest,
                              objects.get(newest.objectId),
                            )
                          : undefined;
                      const selected = selectedPath === path;
                      return (
                        <li key={path}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => choosePath(path)}
                          >
                            <span className="file-glyph" aria-hidden="true">
                              {newest?.type === "directory" ? "▱" : "▤"}
                            </span>
                            <span className="path-result-copy">
                              <strong>{basename(path)}</strong>
                              <span>{parentPath(path)}</span>
                              <small>
                                {versions.length} historical version
                                {versions.length === 1 ? "" : "s"}
                              </small>
                            </span>
                            <span className="path-result-status">
                              {selected ? (
                                <StatusPill tone="green">Selected</StatusPill>
                              ) : integrity?.verdict === "verified" ? (
                                <StatusPill tone="green">Verified</StatusPill>
                              ) : integrity ? (
                                <StatusPill tone="red">
                                  {integrity.verdict}
                                </StatusPill>
                              ) : (
                                <StatusPill tone="neutral">Folder</StatusPill>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {matchingPaths.length === 0 ? (
                    <div className="empty-state">
                      <strong>No protected paths match.</strong>
                      <span>Try a file name, folder, or shorter search.</span>
                    </div>
                  ) : null}
                </section>

                <aside
                  className="version-panel"
                  aria-labelledby="timeline-title"
                >
                  <div className="section-heading">
                    <div>
                      <span className="step-chip">2</span>
                      <h3 id="timeline-title">Choose a recovery point</h3>
                    </div>
                  </div>
                  {!selectedPath ? (
                    <div className="empty-state tall">
                      <strong>Select a path first.</strong>
                      <span>
                        Its verified and damaged versions will appear here.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="selected-path-summary">
                        <strong>{basename(selectedPath)}</strong>
                        <span className="path-text">{selectedPath}</span>
                      </div>
                      <label className="interpretation-option">
                        <input
                          type="radio"
                          name="recovery-point"
                          value="interpreted"
                          checked={recoveryPoint === "interpreted"}
                          onChange={() => {
                            setRecoveryPoint("interpreted");
                            resetDownstream();
                          }}
                        />
                        <span>
                          <strong>Use time from my request</strong>
                          <small>
                            Language identifies the time. Tested code selects
                            the eligible snapshot.
                          </small>
                        </span>
                      </label>

                      <details className="version-history-disclosure">
                        <summary>
                          <span>
                            {recoveryPoint === "interpreted"
                              ? "Choose an exact snapshot"
                              : "Exact snapshot selected"}
                          </span>
                          <small>{selectedVersions.length} versions</small>
                        </summary>
                        <ul className="version-timeline">
                          {(showOlderVersions
                            ? selectedVersions
                            : selectedVersions.slice(0, 4)
                          ).map(({ snapshot, entry }) => {
                            const integrity =
                              entry.type === "file"
                                ? evaluateIntegrity(
                                    entry,
                                    objects.get(entry.objectId),
                                  )
                                : undefined;
                            const expiry =
                              manifest.retentionPolicy.snapshotExpiries?.[
                                snapshot.id
                              ];
                            return (
                              <li key={snapshot.id}>
                                <button
                                  type="button"
                                  className="version-option"
                                  aria-pressed={recoveryPoint === snapshot.id}
                                  aria-label={`${displayDate(snapshot.createdAt)}, ${integrity?.verdict ?? "folder"}, snapshot ${snapshot.status}`}
                                  onClick={() => {
                                    setRecoveryPoint(snapshot.id);
                                    resetDownstream();
                                  }}
                                >
                                  <span className="timeline-row">
                                    <strong>
                                      {displayDate(snapshot.createdAt)}
                                    </strong>
                                    <StatusPill
                                      tone={
                                        integrity?.verdict === "verified"
                                          ? "green"
                                          : integrity
                                            ? "red"
                                            : "neutral"
                                      }
                                    >
                                      {integrity?.verdict ?? "folder"}
                                    </StatusPill>
                                  </span>
                                  <span className="timeline-meta">
                                    {snapshot.status} snapshot
                                    {entry.type === "file"
                                      ? ` · ${humanBytes(entry.size)}`
                                      : ""}
                                    {expiry
                                      ? ` · retained until ${displayDate(expiry)}`
                                      : " · no expiry listed"}
                                  </span>
                                  <small className="timeline-snapshot-id mono">
                                    {snapshot.id}
                                  </small>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                        {selectedVersions.length > 4 ? (
                          <button
                            className="show-versions-button"
                            type="button"
                            aria-expanded={showOlderVersions}
                            onClick={() =>
                              setShowOlderVersions((current) => !current)
                            }
                          >
                            {showOlderVersions
                              ? "Show fewer versions"
                              : `Show ${selectedVersions.length - 4} older versions`}
                          </button>
                        ) : null}
                      </details>
                    </>
                  )}
                </aside>
              </div>

              <section
                className="request-form"
                aria-labelledby="request-form-title"
              >
                <div className="section-heading">
                  <div>
                    <span className="step-chip">3</span>
                    <h3 id="request-form-title">Describe the recovery</h3>
                  </div>
                </div>
                <div className="request-grid">
                  <div className="request-query">
                    <label htmlFor="request">Recovery request</label>
                    <textarea
                      id="request"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        resetDownstream();
                      }}
                      placeholder="For example: Can I recover my thesis from Tuesday evening?"
                      rows={3}
                    />
                    <small>
                      Use natural language, or choose an exact snapshot above.
                    </small>
                  </div>
                  <fieldset className="destination-control">
                    <legend>Simulation destination</legend>
                    <label>
                      <input
                        type="radio"
                        name="destination"
                        value="safe_copy"
                        checked={destinationMode === "safe_copy"}
                        onChange={() => {
                          setDestinationMode("safe_copy");
                          resetDownstream();
                        }}
                      />
                      <span>
                        <strong>Separate safe copy</strong>
                        <small>Avoid overwriting current files.</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="destination"
                        value="original_location"
                        checked={destinationMode === "original_location"}
                        onChange={() => {
                          setDestinationMode("original_location");
                          resetDownstream();
                        }}
                      />
                      <span>
                        <strong>Original location</strong>
                        <small>Check overwrites and conflicts.</small>
                      </span>
                    </label>
                    {selectedIsDirectory ? (
                      <label className="recursive-toggle">
                        <input
                          type="checkbox"
                          checked={includeChildren}
                          onChange={(event) => {
                            setIncludeChildren(event.target.checked);
                            resetDownstream();
                          }}
                        />
                        <span>Include everything inside this folder</span>
                      </label>
                    ) : null}
                  </fieldset>
                </div>
                {error ? (
                  <p className="inline-alert" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="form-action-row">
                  <p>
                    <strong>Safe by design.</strong> Verification and simulation
                    never write, overwrite, or delete files.
                  </p>
                  <button
                    className="button primary large"
                    onClick={() => void investigate()}
                    disabled={investigating || !selectedPath}
                    aria-busy={investigating}
                  >
                    {investigating
                      ? "Verifying evidence…"
                      : "Verify recoverability"}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeStage === 3 && plan ? (
            <div className="stage-content simulation-stage">
              <div className={`verdict-hero ${planTone}`}>
                <div>
                  <span className="eyebrow">Step 3 · Verified recovery</span>
                  <h2 id="stage-title-3" ref={resultHeadingRef} tabIndex={-1}>
                    {plan.verdict === "fully_recoverable"
                      ? "Yes — this version is fully recoverable."
                      : plan.verdict === "partially_recoverable"
                        ? "Some of this recovery is unavailable."
                        : "This recovery point is not recoverable."}
                  </h2>
                  <p>
                    {plan.resolvedPath
                      ? `ProofRestore evaluated ${basename(plan.resolvedPath)} against the selected recovery point.`
                      : "ProofRestore could not resolve the requested path at this recovery point."}
                  </p>
                </div>
                <StatusPill
                  tone={
                    planTone === "verified"
                      ? "green"
                      : planTone === "warning"
                        ? "amber"
                        : "red"
                  }
                >
                  {plan.verdict.replaceAll("_", " ")}
                </StatusPill>
              </div>

              <div className="verification-facts">
                <article>
                  <span>Recovery point</span>
                  <strong>
                    {plan.snapshot
                      ? displayDate(plan.snapshot.createdAt)
                      : "Not found"}
                  </strong>
                  <small className="mono">
                    {plan.snapshot?.id ?? "No eligible snapshot"}
                  </small>
                </article>
                <article>
                  <span>Object availability</span>
                  <strong>
                    {plan.items.every((item) =>
                      ["verified", "recoverable_with_warning"].includes(
                        item.verdict,
                      ),
                    )
                      ? "Available"
                      : "Issues found"}
                  </strong>
                  <small>
                    {plan.totals.recoverableItems} of{" "}
                    {plan.totals.selectedItems} selected items
                  </small>
                </article>
                <article>
                  <span>Integrity</span>
                  <strong>
                    {plan.items.every((item) => item.verdict === "verified")
                      ? "Hash and size verified"
                      : "Review findings"}
                  </strong>
                  <small>Deterministic object checks</small>
                </article>
                <article>
                  <span>Recoverable size</span>
                  <strong>{humanBytes(plan.totals.recoverableBytes)}</strong>
                  <small>
                    {plan.totals.recoverableItems} recoverable file
                    {plan.totals.recoverableItems === 1 ? "" : "s"}
                  </small>
                </article>
              </div>

              <div className="provenance-strip">
                <div>
                  <strong>Request</strong>
                  <span>{query || `Recover ${selectedPath}`}</span>
                </div>
                <div>
                  <strong>Path</strong>
                  <span className="mono">{selectedPath}</span>
                </div>
                <div>
                  <strong>Destination</strong>
                  <span>
                    {destinationMode === "safe_copy"
                      ? "Separate safe copy"
                      : "Original location"}
                  </span>
                </div>
              </div>

              <details className="decision-disclosure">
                <summary>How this was decided</summary>
                <p>
                  Request interpreted by{" "}
                  {interpreterSource === "openai"
                    ? "OpenAI structured output"
                    : "the deterministic fallback"}
                  .{" "}
                  {interpretation ?? "The recovery point was selected manually"}
                  . Snapshot selection, path resolution, integrity, restore
                  actions, and the verdict were computed by the trusted recovery
                  engine.
                </p>
              </details>

              {!simulated ? (
                <div className="next-action-card">
                  <div>
                    <span className="card-label">
                      Next: test restore safety
                    </span>
                    <h3>See exactly what a restore would do.</h3>
                    <p>
                      No files will be changed. The simulation only returns a
                      plan.
                    </p>
                  </div>
                  <button
                    className="button primary large"
                    onClick={runSimulation}
                  >
                    Run restore simulation
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              ) : (
                <div className="simulation-results">
                  <div className={`simulation-summary ${simulationTone}`}>
                    <div>
                      <span className="eyebrow">
                        Simulation complete · no files changed
                      </span>
                      <h3>
                        {hasUnavailable
                          ? "This restore cannot complete with the selected recovery point."
                          : hasConflict
                            ? "The backup is recoverable, but the original location needs a decision."
                            : "The restore plan is ready for review."}
                      </h3>
                      <p>
                        {hasUnavailable
                          ? "At least one selected item is unavailable. Review the item and exact evidence before relying on this plan."
                          : hasConflict
                            ? "A newer, different destination file is protected from overwrite. Use a safe copy or review the conflict first."
                            : "The dry run calculated every action without touching the destination."}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        hasUnavailable ? "red" : hasConflict ? "amber" : "green"
                      }
                    >
                      Restore plan: {restoreSafety}
                    </StatusPill>
                  </div>

                  <div
                    className="action-groups"
                    aria-label="Restore simulation totals"
                  >
                    {[
                      {
                        label: "Will restore",
                        actions: ["create", "create_directory"],
                      },
                      { label: "Will overwrite", actions: ["overwrite"] },
                      { label: "Will skip", actions: ["skip_identical"] },
                      { label: "Cannot recover", actions: ["unavailable"] },
                      { label: "Warnings", actions: ["conflict"] },
                    ]
                      .map((group) => ({
                        ...group,
                        count: plan.items.filter((item) =>
                          group.actions.includes(item.action),
                        ).length,
                      }))
                      .filter((group) => group.count > 0)
                      .map((group) => (
                        <article key={group.label}>
                          <span>{group.label}</span>
                          <strong>{group.count}</strong>
                        </article>
                      ))}
                  </div>

                  <ul className="restore-plan-list">
                    {plan.items.map((item) => (
                      <li key={item.path}>
                        <div>
                          <strong>{basename(item.path)}</strong>
                          <span className="path-text mono">{item.path}</span>
                          {item.action === "conflict" ? (
                            <small>
                              Keep the newer destination file safe. Restore to a
                              separate location or review before overwrite.
                            </small>
                          ) : null}
                        </div>
                        <StatusPill
                          tone={
                            item.action === "conflict"
                              ? "amber"
                              : item.action === "unavailable"
                                ? "red"
                                : "green"
                          }
                        >
                          {item.action.replaceAll("_", " ")}
                        </StatusPill>
                      </li>
                    ))}
                  </ul>

                  <details className="evidence-disclosure">
                    <summary>
                      Open exact evidence ({plan.evidence.length})
                    </summary>
                    <p>
                      Every verdict above traces to these deterministic checks
                      for snapshot{" "}
                      <span className="mono">{plan.snapshot?.id}</span>.
                    </p>
                    <EvidenceList evidence={plan.evidence} />
                  </details>

                  <div className="continue-row">
                    <p>
                      Simulation only. No files were written, overwritten, or
                      deleted.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => goToStage(4)}
                    >
                      Continue to proof report
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {activeStage === 4 && plan ? (
            <div className="stage-content report-stage">
              <div className="report-heading">
                <div>
                  <span className="eyebrow">Step 4 · Portable evidence</span>
                  <h2 id="stage-title-4" tabIndex={-1}>
                    Proof of Recoverability
                  </h2>
                  <p>
                    A portable record of the request, recovery point, integrity
                    checks, restore plan, conflicts, retention findings, and
                    exact evidence.
                  </p>
                </div>
                <StatusPill tone={report ? "green" : "blue"}>
                  {report ? "Proof report ready" : "Ready to generate"}
                </StatusPill>
              </div>

              <div className="report-document">
                <div className="report-document-header">
                  <div>
                    <span>ProofRestore</span>
                    <h3>Proof of Recoverability</h3>
                  </div>
                  <StatusPill
                    tone={
                      planTone === "verified"
                        ? "green"
                        : planTone === "warning"
                          ? "amber"
                          : "red"
                    }
                  >
                    {plan.verdict.replaceAll("_", " ")}
                  </StatusPill>
                </div>
                <div className="report-summary-grid">
                  <div>
                    <span>Vault</span>
                    <strong>{manifest.vaultName}</strong>
                  </div>
                  <div>
                    <span>Recovery point</span>
                    <strong>
                      {plan.snapshot
                        ? displayDate(plan.snapshot.createdAt)
                        : "None"}
                    </strong>
                  </div>
                  <div>
                    <span>Recoverable</span>
                    <strong>{humanBytes(plan.totals.recoverableBytes)}</strong>
                  </div>
                  <div>
                    <span>Restore safety</span>
                    <strong>{restoreSafety}</strong>
                  </div>
                </div>
                {hasConflict ? (
                  <div className="report-warning">
                    <strong>Conflict recorded</strong>
                    <span>
                      A newer destination file is protected from overwrite.
                    </span>
                  </div>
                ) : null}
                <div className="simulation-statement">
                  Simulation only — no files were changed.
                </div>
                {report ? (
                  <pre className="report-preview mono">
                    {report.slice(0, 2_400)}
                  </pre>
                ) : (
                  <ul className="report-includes">
                    <li>Original request and selected snapshot</li>
                    <li>Verified files, unavailable items, and conflicts</li>
                    <li>Retention warnings and restore actions</li>
                    <li>Methodology and exact evidence appendix</li>
                  </ul>
                )}
              </div>

              <div className="report-actions">
                <div>
                  <p>
                    {report
                      ? "The Markdown proof has been prepared. Download it again or start another check."
                      : "Generates and downloads a Markdown report. No backup or destination data is modified."}
                  </p>
                  <button className="button quiet" onClick={startAnotherCheck}>
                    Start another recovery check
                  </button>
                </div>
                <button
                  className="button primary large"
                  onClick={() =>
                    report ? downloadReport(report) : createReport()
                  }
                >
                  {report
                    ? "Download Markdown again"
                    : "Generate and download Markdown report"}
                  <span aria-hidden="true">↓</span>
                </button>
              </div>

              <p className="report-closing">
                Backups should not require faith.
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </main>
  );
}
