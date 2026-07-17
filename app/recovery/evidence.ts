import type { Evidence, EvidenceCode } from "./types";

export type EvidenceInput = Omit<Evidence, "id">;

export function createEvidenceCollector(prefix = "evidence") {
  const items: Evidence[] = [];

  return {
    add(input: EvidenceInput): Evidence {
      const item = {
        id: `${prefix}-${String(items.length + 1).padStart(4, "0")}`,
        ...input,
      };
      items.push(item);
      return item;
    },
    all(): Evidence[] {
      return [...items];
    },
  };
}

export function evidenceMessage(code: EvidenceCode, path?: string): string {
  const subject = path ? ` for ${path}` : "";
  const messages: Record<EvidenceCode, string> = {
    snapshot_selected: "Eligible recovery snapshot selected",
    snapshot_not_found: "No eligible recovery snapshot found",
    path_found: `Requested path found${subject}`,
    path_not_found: `Requested path not found${subject}`,
    object_found: `Referenced backup object found${subject}`,
    object_missing: `Referenced backup object is missing${subject}`,
    object_unavailable: `Referenced backup object is unavailable${subject}`,
    hash_match: `Observed hash matches expected hash${subject}`,
    hash_mismatch: `Observed hash does not match expected hash${subject}`,
    size_match: `Observed size matches expected size${subject}`,
    size_mismatch: `Observed size does not match expected size${subject}`,
    destination_identical: `Destination already contains identical content${subject}`,
    destination_conflict: `Destination contains different content${subject}`,
    retention_expiry: `Healthy copy has a scheduled expiry${subject}`,
    healthy_copy_survives: `Another healthy copy survives the expiry${subject}`,
    last_healthy_copy_at_risk: `Last healthy copy is at retention risk${subject}`,
  };
  return messages[code];
}
