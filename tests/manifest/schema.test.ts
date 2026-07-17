import { describe, expect, it } from "vitest";

import {
  ManifestTooLargeError,
  assertManifestSize,
  normalizeManifestPath,
  parseVaultManifest,
  parseVaultManifestJson,
  safeParseVaultManifest,
} from "@/app/manifest";
import type { VaultManifest } from "@/app/types/manifest";

function validManifest(): VaultManifest {
  return {
    schemaVersion: "1.0",
    vaultId: "vault-test",
    vaultName: "Test vault",
    generatedAt: "2026-07-18T00:00:00.000Z",
    source: "Synthetic test fixture",
    snapshots: [
      {
        id: "snapshot-1",
        createdAt: "2026-07-15T18:00:00.000Z",
        completedAt: "2026-07-15T18:01:00.000Z",
        status: "complete",
        jobReportedSuccess: true,
        files: [
          {
            path: "Documents/Thesis.docx",
            type: "file",
            size: 42,
            modifiedAt: "2026-07-15T17:59:00.000Z",
            expectedHash: "sha256:expected",
            objectId: "object-1",
          },
          {
            path: "Documents",
            type: "directory",
            size: 0,
            modifiedAt: "2026-07-15T17:58:00.000Z",
          },
        ],
        warnings: [],
        metadata: { sequence: 1, verified: true },
      },
    ],
    objects: [
      {
        id: "object-1",
        observedHash: "sha256:expected",
        size: 42,
        availability: "available",
        storageLocation: "demo://objects/object-1",
        verificationTimestamp: "2026-07-18T00:00:00.000Z",
      },
    ],
    retentionPolicy: {
      mode: "explicit",
      keepLast: 1,
      keepDaily: 7,
      keepWeekly: 4,
      snapshotExpiries: { "snapshot-1": "2026-07-22T00:00:00.000Z" },
    },
    destinationState: [
      {
        path: "Documents/Thesis.docx",
        currentHash: "sha256:current",
        currentSize: 43,
        modifiedAt: "2026-07-17T09:00:00.000Z",
      },
    ],
  };
}

describe("vaultManifestSchema", () => {
  it("accepts and normalizes a valid version 1.0 manifest", () => {
    const input = validManifest();
    input.snapshots[0].files[0].path = "Documents\\University//Thesis.docx/";
    input.generatedAt = "2026-07-18T02:00:00+02:00";

    const result = parseVaultManifest(input);

    expect(result.generatedAt).toBe("2026-07-18T00:00:00.000Z");
    expect(result.snapshots[0].files[0].path).toBe(
      "Documents/University/Thesis.docx",
    );
  });

  it("rejects unsupported schema versions and unknown fields", () => {
    const wrongVersion = { ...validManifest(), schemaVersion: "2.0" };
    expect(safeParseVaultManifest(wrongVersion).success).toBe(false);
    expect(
      safeParseVaultManifest({ ...validManifest(), secret: "unexpected" })
        .success,
    ).toBe(false);
  });

  it.each([
    "../secrets.txt",
    "Documents/../secrets.txt",
    "Documents/./Thesis.docx",
    "/etc/passwd",
    "C:\\Users\\name\\file.txt",
    "\\\\server\\share\\file.txt",
    "Documents/evil\u0000.txt",
  ])("rejects unsafe path %j", (path) => {
    const input = validManifest();
    input.snapshots[0].files[0].path = path;
    expect(safeParseVaultManifest(input).success).toBe(false);
  });

  it("rejects duplicate normalized paths within one snapshot", () => {
    const input = validManifest();
    input.snapshots[0].files.push({
      path: "Documents\\Thesis.docx",
      type: "file",
      size: 42,
      modifiedAt: "2026-07-15T17:59:00.000Z",
      expectedHash: "sha256:expected",
      objectId: "object-1",
    });

    expect(safeParseVaultManifest(input).success).toBe(false);
  });

  it("rejects invalid chronology and expiry references", () => {
    const input = validManifest();
    input.snapshots[0].completedAt = "2026-07-15T17:00:00.000Z";
    input.retentionPolicy.snapshotExpiries = {
      "unknown-snapshot": "2026-07-22T00:00:00.000Z",
    };

    const result = safeParseVaultManifest(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          "Snapshot completion cannot precede creation",
          'Expiry references unknown snapshot "unknown-snapshot"',
        ]),
      );
    }
  });

  it("allows a file to reference an absent object for deterministic missing-object analysis", () => {
    const input = validManifest();
    input.objects = [];
    expect(parseVaultManifest(input).snapshots[0].files[0]).toMatchObject({
      objectId: "object-1",
    });
  });

  it("rejects malformed JSON", () => {
    expect(() => parseVaultManifestJson("{not-json}")).toThrow(SyntaxError);
  });
});

describe("manifest path and upload safety", () => {
  it("normalizes relative separators without changing path case", () => {
    expect(
      normalizeManifestPath(" Documents\\University//Thesis-Final.docx/ "),
    ).toBe("Documents/University/Thesis-Final.docx");
  });

  it("measures UTF-8 bytes and rejects oversized input", () => {
    expect(() => assertManifestSize("é", 2)).not.toThrow();
    expect(() => assertManifestSize("é", 1)).toThrow(ManifestTooLargeError);
  });
});
