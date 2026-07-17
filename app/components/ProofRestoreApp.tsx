"use client";

import { useMemo, useRef, useState } from "react";
import { demoVault, DEMO_SCENARIOS } from "@/app/demo";
import { interpretWithoutModel } from "@/app/interpret/fallback";
import { parseVaultManifestJson } from "@/app/manifest";
import {
  analyzeRetention,
  evaluateIntegrity,
  planRecovery,
  type RecoveryPlan,
} from "@/app/recovery";
import { generateProofReport } from "@/app/reports/markdown";
import type { VaultManifest } from "@/app/types/manifest";

const DEMO_QUERY = "Can I recover my thesis from Tuesday evening?";

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

function uniquePaths(manifest: VaultManifest): string[] {
  return Array.from(
    new Set(
      manifest.snapshots.flatMap((snapshot) =>
        snapshot.files
          .filter((file) => file.type === "file")
          .map((file) => file.path),
      ),
    ),
  ).sort();
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

export function ProofRestoreApp() {
  const [started, setStarted] = useState(false);
  const [manifest, setManifest] = useState<VaultManifest>(demoVault);
  const [search, setSearch] = useState("Thesis-Final.docx");
  const [selectedPath, setSelectedPath] = useState<string>();
  const [query, setQuery] = useState(DEMO_QUERY);
  const [plan, setPlan] = useState<RecoveryPlan>();
  const [interpretation, setInterpretation] = useState<string>();
  const [simulated, setSimulated] = useState(false);
  const [report, setReport] = useState<string>();
  const [error, setError] = useState<string>();
  const resultRef = useRef<HTMLDivElement>(null);

  const paths = useMemo(() => uniquePaths(manifest), [manifest]);
  const matchingPaths = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("en-US");
    return needle
      ? paths.filter((path) => path.toLocaleLowerCase("en-US").includes(needle))
      : paths.slice(0, 8);
  }, [paths, search]);
  const objects = useMemo(
    () => new Map(manifest.objects.map((object) => [object.id, object])),
    [manifest],
  );
  const timeline = useMemo(
    () =>
      selectedPath
        ? manifest.snapshots
            .flatMap((snapshot) => {
              const file = snapshot.files.find(
                (entry) => entry.path === selectedPath,
              );
              if (!file || file.type !== "file") return [];
              return [
                {
                  snapshot,
                  file,
                  integrity: evaluateIntegrity(
                    file,
                    objects.get(file.objectId),
                  ),
                },
              ];
            })
            .sort((a, b) =>
              b.snapshot.createdAt.localeCompare(a.snapshot.createdAt),
            )
        : [],
    [manifest, objects, selectedPath],
  );
  const retention = useMemo(
    () => analyzeRetention(manifest, new Date("2026-07-18T12:00:00.000Z")),
    [manifest],
  );

  const latest = [...manifest.snapshots].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const latestFiles =
    latest?.files.filter((file) => file.type === "file") ?? [];
  const latestVerified = latestFiles.filter((file) => {
    return (
      evaluateIntegrity(file, objects.get(file.objectId)).verdict === "verified"
    );
  }).length;
  const integrityIssues = latestFiles.length - latestVerified;

  function choosePath(path: string) {
    setSelectedPath(path);
    setQuery(
      path === DEMO_SCENARIOS.thesisPath
        ? DEMO_QUERY
        : `Can I recover ${path}?`,
    );
    setPlan(undefined);
    setSimulated(false);
    setReport(undefined);
    setError(undefined);
  }

  function investigate() {
    setError(undefined);
    const interpreted = interpretWithoutModel({
      query,
      pathCandidates: paths,
      referenceDateTime: manifest.generatedAt,
    });
    const resolvedPath = interpreted.resolvedPath ?? selectedPath;
    if (!resolvedPath) {
      setError(
        interpreted.clarificationQuestion ?? "Choose a protected path first.",
      );
      return;
    }
    const requestedAt = interpreted.requestedDateTime;
    if (!requestedAt) {
      setError("Choose a recovery point or include a date in the request.");
      return;
    }
    const nextPlan = planRecovery(manifest, {
      path: resolvedPath,
      requestedAt,
      snapshotMode: "at_or_before",
      includeChildren: false,
      destinationMode: "original_location",
    });
    setSelectedPath(resolvedPath);
    setInterpretation(interpreted.dateInterpretation);
    setPlan(nextPlan);
    setSimulated(false);
    setReport(undefined);
    window.setTimeout(
      () =>
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      0,
    );
  }

  async function importManifest(file: File | undefined) {
    if (!file) return;
    try {
      const imported = parseVaultManifestJson(await file.text());
      setManifest(imported);
      setStarted(true);
      setSelectedPath(undefined);
      setPlan(undefined);
      setSimulated(false);
      setReport(undefined);
      setSearch("");
      setError(undefined);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? `Import rejected: ${importError.message}`
          : "Import rejected.",
      );
    }
  }

  function createReport() {
    if (!plan) return;
    const generated = generateProofReport({
      manifest,
      plan,
      originalRequest: query,
      generatedAt: new Date().toISOString(),
      retentionFindings: retention,
    });
    setReport(generated);
    const url = URL.createObjectURL(
      new Blob([generated], { type: "text/markdown;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "proof-of-recoverability.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!started) {
    return (
      <main className="app-shell">
        <div className="container">
          <header className="topbar">
            <Brand />
            <span className="muted mono">RECOVERY VERIFICATION</span>
          </header>
          <section className="hero">
            <div className="eyebrow">Evidence before emergency</div>
            <h1>Know your backup will restore before you need it.</h1>
            <p>
              ProofRestore verifies backup history, simulates recovery, and
              shows the evidence behind every result.
            </p>
            <div className="actions">
              <button
                className="button primary"
                onClick={() => setStarted(true)}
              >
                Explore demo vault
              </button>
              <label className="button" htmlFor="welcome-import">
                Import backup manifest
              </label>
              <input
                id="welcome-import"
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  void importManifest(event.target.files?.[0])
                }
              />
            </div>
            {error ? (
              <p className="notice" role="alert">
                {error}
              </p>
            ) : null}
          </section>
          <p className="footer-line">Backup success is not recovery success.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="container">
        <header className="topbar">
          <Brand />
          <button className="button" onClick={() => setStarted(false)}>
            Back to welcome
          </button>
        </header>
        <section className="dashboard" aria-labelledby="vault-title">
          <div className="dashboard-head">
            <div>
              <div className="eyebrow">Vault health</div>
              <h1 id="vault-title">{manifest.vaultName}</h1>
              <span className="muted">
                Generated {displayDate(manifest.generatedAt)}
              </span>
            </div>
            <label className="button" htmlFor="dashboard-import">
              Import another manifest
            </label>
            <input
              id="dashboard-import"
              className="sr-only"
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importManifest(event.target.files?.[0])}
            />
          </div>

          <div className="status-grid">
            <article className="card status-card">
              <div>
                <div className="muted">Backup status</div>
                <div className="status-value">Completed</div>
              </div>
              <span className="pill green">Job succeeded</span>
            </article>
            <article className="card status-card">
              <div>
                <div className="muted">Recoverability status</div>
                <div className="status-value">At risk</div>
              </div>
              <span className="pill amber">Action needed</span>
            </article>
          </div>

          <div className="metric-grid" aria-label="Vault metrics">
            <div className="card metric">
              <span className="muted">Snapshots</span>
              <strong>{manifest.snapshots.length}</strong>
            </div>
            <div className="card metric">
              <span className="muted">Protected files</span>
              <strong>{paths.length}</strong>
            </div>
            <div className="card metric">
              <span className="muted">Latest verified</span>
              <strong>{latestVerified}</strong>
            </div>
            <div className="card metric">
              <span className="muted">Integrity issues</span>
              <strong>{integrityIssues}</strong>
            </div>
            <div className="card metric">
              <span className="muted">Retention risks</span>
              <strong>
                {
                  retention.filter((item) => !item.healthyAlternativeSurvives)
                    .length
                }
              </strong>
            </div>
            <div className="card metric">
              <span className="muted">Last restore test</span>
              <strong>Now</strong>
            </div>
          </div>

          <div className="two-col">
            <section className="card" aria-labelledby="investigation-title">
              <div className="card-header">
                <div>
                  <div className="eyebrow">Recovery investigation</div>
                  <h2 id="investigation-title">What do you need to recover?</h2>
                </div>
              </div>
              <label htmlFor="file-search" className="muted">
                Search protected paths
              </label>
              <div className="search-row">
                <input
                  id="file-search"
                  className="field"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Thesis-Final.docx"
                />
              </div>
              <ul className="file-list" aria-label="Matching files">
                {matchingPaths.slice(0, 6).map((path) => (
                  <li className="file-item" key={path}>
                    <button
                      onClick={() => choosePath(path)}
                      aria-pressed={selectedPath === path}
                    >
                      <span className="path mono">{path}</span>
                      <span className="muted">Select →</span>
                    </button>
                  </li>
                ))}
              </ul>
              {matchingPaths.length === 0 ? (
                <p className="muted">No protected path matches this search.</p>
              ) : null}
              <div className="section-title">Recovery request</div>
              <label htmlFor="request" className="sr-only">
                Natural-language recovery request
              </label>
              <input
                id="request"
                className="field"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="actions">
                <button className="button primary" onClick={investigate}>
                  Verify recoverability
                </button>
              </div>
              {error ? (
                <p className="notice" role="alert">
                  {error}
                </p>
              ) : null}
            </section>

            <aside className="card" aria-labelledby="timeline-title">
              <div className="eyebrow">Version history</div>
              <h2 id="timeline-title">File timeline</h2>
              {!selectedPath ? (
                <p className="muted">
                  Select a file to inspect its historical versions.
                </p>
              ) : null}
              <ul className="timeline">
                {timeline.map(({ snapshot, file, integrity }) => (
                  <li className="timeline-item" key={snapshot.id}>
                    <div className="card-header">
                      <span>{displayDate(snapshot.createdAt)}</span>
                      <span
                        className={`pill ${integrity.verdict === "verified" ? "green" : "red"}`}
                      >
                        {integrity.verdict}
                      </span>
                    </div>
                    <div className="statline">
                      <span>{humanBytes(file.size)}</span>
                      <span className="mono">{snapshot.id}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {plan ? (
            <section
              className="card"
              ref={resultRef}
              style={{ marginTop: 14 }}
              aria-labelledby="result-title"
            >
              <div className="eyebrow">Deterministic result</div>
              <h2 id="result-title">Recovery result</h2>
              <div className="result-banner">
                <h3>
                  {plan.verdict === "fully_recoverable"
                    ? "Fully recoverable"
                    : plan.verdict.replaceAll("_", " ")}
                </h3>
                <p>{plan.resolvedPath}</p>
                <div className="statline">
                  <span>
                    Snapshot{" "}
                    <strong>
                      {plan.snapshot
                        ? displayDate(plan.snapshot.createdAt)
                        : "None"}
                    </strong>
                  </span>
                  <span>
                    Integrity{" "}
                    <strong>{plan.items[0]?.verdict ?? "unknown"}</strong>
                  </span>
                  <span>
                    Recoverable{" "}
                    <strong>{humanBytes(plan.totals.recoverableBytes)}</strong>
                  </span>
                </div>
              </div>
              {interpretation ? (
                <p className="muted">
                  {interpretation}. Snapshot selection and the verdict were
                  computed by the trusted engine.
                </p>
              ) : null}
              <div className="actions">
                <button
                  className="button amber"
                  onClick={() => setSimulated(true)}
                >
                  Run restore simulation
                </button>
              </div>

              {simulated ? (
                <div aria-live="polite">
                  <div className="section-title">
                    Restore simulation · no files changed
                  </div>
                  <div className="three-col">
                    <div className="card">
                      <h3>Will restore</h3>
                      <strong>
                        {
                          plan.items.filter((item) => item.action === "create")
                            .length
                        }
                      </strong>
                    </div>
                    <div className="card">
                      <h3>Will overwrite</h3>
                      <strong>
                        {
                          plan.items.filter(
                            (item) => item.action === "overwrite",
                          ).length
                        }
                      </strong>
                    </div>
                    <div className="card">
                      <h3>Will skip</h3>
                      <strong>
                        {
                          plan.items.filter(
                            (item) => item.action === "skip_identical",
                          ).length
                        }
                      </strong>
                    </div>
                    <div className="card">
                      <h3>Cannot recover</h3>
                      <strong>
                        {
                          plan.items.filter(
                            (item) => item.action === "unavailable",
                          ).length
                        }
                      </strong>
                    </div>
                    <div className="card">
                      <h3>Warnings</h3>
                      <strong>
                        {plan.items.filter((item) => item.action === "conflict")
                          .length +
                          plan.items.reduce(
                            (total, item) => total + item.warnings.length,
                            0,
                          )}
                      </strong>
                    </div>
                  </div>
                  <ul className="plan-list">
                    {plan.items.map((item) => (
                      <li className="plan-item" key={item.path}>
                        <div className="card-header">
                          <span className="mono path">{item.path}</span>
                          <span
                            className={`pill ${item.action === "conflict" ? "amber" : item.action === "unavailable" ? "red" : "green"}`}
                          >
                            {item.action.replaceAll("_", " ")}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <details className="card">
                    <summary>
                      <strong>
                        Open exact evidence ({plan.evidence.length})
                      </strong>
                    </summary>
                    <ul className="evidence-list">
                      {plan.evidence.map((evidence) => (
                        <li className="evidence-item" key={evidence.id}>
                          <span className="evidence-code mono">
                            {evidence.code}
                          </span>
                          <span>{evidence.message}</span>
                          <span
                            className={`pill ${evidence.severity === "error" ? "red" : evidence.severity === "warning" ? "amber" : "green"}`}
                          >
                            {evidence.severity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="actions">
                    <button className="button primary" onClick={createReport}>
                      Generate proof report
                    </button>
                  </div>
                </div>
              ) : null}

              {report ? (
                <section aria-labelledby="report-title">
                  <div className="section-title">Download prepared</div>
                  <h3 id="report-title">Proof of Recoverability</h3>
                  <p className="muted">
                    The deterministic Markdown report includes the verdict,
                    metrics, restore plan, retention warnings, evidence
                    appendix, and simulation methodology.
                  </p>
                  <pre
                    className="card mono"
                    style={{
                      whiteSpace: "pre-wrap",
                      maxHeight: 300,
                      overflow: "auto",
                    }}
                  >
                    {report.slice(0, 2_000)}
                  </pre>
                </section>
              ) : null}
            </section>
          ) : null}

          <p className="footer-line">
            <strong>Backups should not require faith.</strong>
          </p>
        </section>
      </div>
    </main>
  );
}
