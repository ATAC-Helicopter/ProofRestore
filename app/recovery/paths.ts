import type { Snapshot, SnapshotEntry } from "./types";

export class UnsafeRecoveryPathError extends Error {
  constructor(path: string) {
    super(`Unsafe recovery path: ${path}`);
    this.name = "UnsafeRecoveryPathError";
  }
}

/** Paths are normalized to forward slashes and matched case-sensitively. */
export function normalizeRecoveryPath(input: string): string {
  const normalized = input
    .trim()
    .replaceAll("\\", "/")
    .replace(/\/{2,}/g, "/");
  const withoutEdges = normalized
    .replace(/^\.\//, "")
    .replace(/^\/+|\/+$/g, "");
  const segments = withoutEdges.split("/");

  if (
    withoutEdges.length === 0 ||
    input.includes("\0") ||
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    segments.some(
      (segment) => segment === ".." || segment === "." || segment === "",
    )
  ) {
    throw new UnsafeRecoveryPathError(input);
  }

  return withoutEdges;
}

export function resolveSnapshotPath(
  snapshot: Snapshot,
  requestedPath: string,
  includeChildren = false,
): { resolvedPath: string; files: SnapshotEntry[] } | undefined {
  const normalized = normalizeRecoveryPath(requestedPath);
  const indexed = snapshot.files.map((file) => ({
    file,
    normalizedPath: normalizeRecoveryPath(file.path),
  }));
  const exact = indexed.find(
    ({ normalizedPath }) => normalizedPath === normalized,
  );
  if (!exact) return undefined;

  const shouldRecurse = includeChildren && exact.file.type === "directory";
  const files = shouldRecurse
    ? indexed
        .filter(
          ({ normalizedPath }) =>
            normalizedPath === normalized ||
            normalizedPath.startsWith(`${normalized}/`),
        )
        .map(({ file }) => file)
    : [exact.file];

  return { resolvedPath: exact.normalizedPath, files };
}
