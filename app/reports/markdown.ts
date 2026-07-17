import type {
  RecoveryPlan,
  RetentionFinding,
  VaultManifest,
} from "@/app/recovery/types";

export type ProofReportInput = {
  manifest: VaultManifest;
  plan: RecoveryPlan;
  originalRequest: string;
  generatedAt: string;
  retentionFindings?: RetentionFinding[];
};

function escapeMarkdown(value: string): string {
  return value
    .replace(/[\\`*_{}\[\]()<>#+.!|]/g, "\\$&")
    .replace(/\r?\n/g, " ");
}

function humanBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1_024;
  let unit = 0;
  while (value >= 1_024 && unit < units.length - 1) {
    value /= 1_024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

function listOrNone(values: string[]): string {
  return values.length
    ? values.map((value) => `- ${value}`).join("\n")
    : "- None";
}

export function generateProofReport(input: ProofReportInput): string {
  const { plan } = input;
  const recoverable = plan.items.filter((item) =>
    ["verified", "recoverable_with_warning"].includes(item.verdict),
  );
  const unavailable = plan.items.filter(
    (item) => !["verified", "recoverable_with_warning"].includes(item.verdict),
  );
  const conflicts = plan.items.filter((item) =>
    ["overwrite", "conflict"].includes(item.action),
  );
  const integrityFindings = plan.items.flatMap((item) =>
    item.evidence
      .filter((evidence) =>
        [
          "object_missing",
          "object_unavailable",
          "hash_mismatch",
          "size_mismatch",
        ].includes(evidence.code),
      )
      .map(
        (evidence) =>
          `- ${escapeMarkdown(item.path)} — ${escapeMarkdown(evidence.message)}`,
      ),
  );
  const evidence = plan.evidence.map(
    (item) =>
      `- \`${item.id}\` · \`${item.code}\` · ${escapeMarkdown(item.message)}`,
  );

  return [
    "# Proof of Recoverability",
    "",
    `**Vault:** ${escapeMarkdown(input.manifest.vaultName)}`,
    `**Generated:** ${escapeMarkdown(input.generatedAt)}`,
    `**Original request:** ${escapeMarkdown(input.originalRequest)}`,
    `**Selected recovery point:** ${escapeMarkdown(plan.snapshot?.createdAt ?? "No eligible snapshot")}`,
    `**Overall verdict:** ${plan.verdict}`,
    "",
    "> Simulation only — this report describes a deterministic dry run. No files were written, overwritten, or deleted.",
    "",
    "## Summary metrics",
    "",
    `- Selected items: ${plan.totals.selectedItems}`,
    `- Recoverable items: ${plan.totals.recoverableItems}`,
    `- Unavailable items: ${plan.totals.unavailableItems}`,
    `- Conflicts: ${plan.totals.conflicts}`,
    `- Selected size: ${humanBytes(plan.totals.selectedBytes)}`,
    `- Recoverable size: ${humanBytes(plan.totals.recoverableBytes)}`,
    `- Planned operations: ${plan.totals.operationCount}`,
    "",
    "## Recoverable files",
    "",
    listOrNone(
      recoverable.map(
        (item) => `${escapeMarkdown(item.path)} — ${item.action}`,
      ),
    ),
    "",
    "## Unavailable files",
    "",
    listOrNone(
      unavailable.map(
        (item) => `${escapeMarkdown(item.path)} — ${item.verdict}`,
      ),
    ),
    "",
    "## Conflicts",
    "",
    listOrNone(
      conflicts.map((item) => `${escapeMarkdown(item.path)} — ${item.action}`),
    ),
    "",
    "## Integrity findings",
    "",
    integrityFindings.length
      ? integrityFindings.join("\n")
      : "- No integrity failures in the selected recovery set.",
    "",
    "## Retention warnings",
    "",
    listOrNone(
      (input.retentionFindings ?? []).map(
        (finding) =>
          `${escapeMarkdown(finding.path)} — ${finding.urgency}; expires ${escapeMarkdown(finding.expiresAt)}`,
      ),
    ),
    "",
    "## Restore plan",
    "",
    listOrNone(
      plan.items.map((item) => `${escapeMarkdown(item.path)} — ${item.action}`),
    ),
    "",
    "## Evidence appendix",
    "",
    evidence.length ? evidence.join("\n") : "- No evidence was produced.",
    "",
    "## Methodology",
    "",
    "ProofRestore selected the eligible snapshot and resolved the requested path using deterministic rules. It then checked each referenced object's availability, expected and observed hashes, size consistency, and destination state. The request verdict and byte totals were computed exclusively from those checks. Natural-language interpretation, when enabled, cannot set or change any recovery verdict.",
    "",
  ].join("\n");
}
