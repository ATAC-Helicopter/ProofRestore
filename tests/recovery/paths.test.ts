import { describe, expect, it } from "vitest";
import {
  normalizeRecoveryPath,
  resolveSnapshotPath,
  UnsafeRecoveryPathError,
} from "@/app/recovery";
import { healthyFile, snapshot } from "./fixtures";

const folder = {
  path: "Documents",
  type: "directory" as const,
  size: 0,
  modifiedAt: healthyFile.modifiedAt,
};
const nested = {
  ...healthyFile,
  path: "Documents/Notes/todo.md",
  objectId: "notes",
};
const snap = snapshot("snapshot", "2026-07-14T18:00:00.000Z", [
  folder,
  healthyFile,
  nested,
]);

describe("recovery paths", () => {
  it("normalizes separators while preserving case", () => {
    expect(normalizeRecoveryPath("./Documents\\Thesis-Final.docx/")).toBe(
      "Documents/Thesis-Final.docx",
    );
    expect(resolveSnapshotPath(snap, "documents")).toBeUndefined();
  });

  it("resolves a folder recursively", () => {
    const result = resolveSnapshotPath(snap, "Documents", true);
    expect(result?.files.map((file) => file.path)).toEqual([
      "Documents",
      "Documents/Thesis-Final.docx",
      "Documents/Notes/todo.md",
    ]);
  });

  it.each([
    "../secret",
    "Documents/../secret",
    "/etc/passwd",
    "C:\\secret",
    "././file",
  ])("rejects unsafe traversal or absolute path %s", (path) =>
    expect(() => normalizeRecoveryPath(path)).toThrow(UnsafeRecoveryPathError),
  );
});
