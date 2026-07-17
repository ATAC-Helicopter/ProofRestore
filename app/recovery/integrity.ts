import type { EvidenceInput } from "./evidence";
import { evidenceMessage } from "./evidence";
import type { ItemVerdict, SnapshotEntry, StoredObject } from "./types";

export interface IntegrityEvaluation {
  verdict: ItemVerdict;
  warnings: string[];
  evidence: EvidenceInput[];
}

export function evaluateIntegrity(
  file: SnapshotEntry,
  storedObject: StoredObject | undefined,
): IntegrityEvaluation {
  if (file.type === "directory") {
    return { verdict: "verified", warnings: [], evidence: [] };
  }

  const entities = { path: file.path, objectId: file.objectId ?? "" };
  if (!file.objectId || !storedObject) {
    return {
      verdict: "unavailable",
      warnings: ["The referenced backup object does not exist."],
      evidence: [
        {
          code: "object_missing",
          severity: "error",
          message: evidenceMessage("object_missing", file.path),
          entities,
        },
      ],
    };
  }

  const evidence: EvidenceInput[] = [
    {
      code: "object_found",
      severity: "success",
      message: evidenceMessage("object_found", file.path),
      entities,
    },
  ];

  if (storedObject.availability === "missing") {
    evidence.push({
      code: "object_unavailable",
      severity: "error",
      message: evidenceMessage("object_unavailable", file.path),
      entities,
      values: { availability: storedObject.availability },
    });
    return {
      verdict: "unavailable",
      warnings: [`The backup object is marked ${storedObject.availability}.`],
      evidence,
    };
  }

  const availabilityCorrupted = storedObject.availability === "corrupted";
  if (availabilityCorrupted) {
    evidence.push({
      code: "object_unavailable",
      severity: "error",
      message: evidenceMessage("object_unavailable", file.path),
      entities,
      values: { availability: storedObject.availability },
    });
  }

  if (!file.expectedHash || !storedObject.observedHash) {
    return {
      verdict: "unknown",
      warnings: [
        "Integrity cannot be proven because a required hash is absent.",
      ],
      evidence,
    };
  }

  const hashMatches = file.expectedHash === storedObject.observedHash;
  evidence.push({
    code: hashMatches ? "hash_match" : "hash_mismatch",
    severity: hashMatches ? "success" : "error",
    message: evidenceMessage(
      hashMatches ? "hash_match" : "hash_mismatch",
      file.path,
    ),
    entities,
    values: {
      expectedHash: file.expectedHash,
      observedHash: storedObject.observedHash,
    },
  });
  if (!hashMatches) {
    return {
      verdict: "corrupted",
      warnings: ["Observed content hash differs from the manifest."],
      evidence,
    };
  }

  const sizeMatches = file.size === storedObject.size;
  evidence.push({
    code: sizeMatches ? "size_match" : "size_mismatch",
    severity: sizeMatches ? "success" : "error",
    message: evidenceMessage(
      sizeMatches ? "size_match" : "size_mismatch",
      file.path,
    ),
    entities,
    values: { expectedSize: file.size, observedSize: storedObject.size },
  });

  return sizeMatches && !availabilityCorrupted
    ? { verdict: "verified", warnings: [], evidence }
    : {
        verdict: "corrupted",
        warnings: [
          availabilityCorrupted
            ? "The backup object is marked corrupted."
            : "Observed object size differs from the manifest.",
        ],
        evidence,
      };
}
