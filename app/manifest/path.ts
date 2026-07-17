const WINDOWS_DRIVE_PATH = /^[a-zA-Z]:/;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export class UnsafeManifestPathError extends Error {
  constructor(path: string, reason: string) {
    super(`Unsafe manifest path ${JSON.stringify(path)}: ${reason}`);
    this.name = "UnsafeManifestPathError";
  }
}

/**
 * Converts manifest paths to a stable, relative POSIX representation.
 *
 * Matching is intentionally case-sensitive. The function never resolves a path
 * against the host filesystem and rejects traversal rather than collapsing it.
 */
export function normalizeManifestPath(input: string): string {
  const path = input.trim();

  if (path.length === 0) {
    throw new UnsafeManifestPathError(input, "path is empty");
  }
  if (CONTROL_CHARACTER.test(path)) {
    throw new UnsafeManifestPathError(
      input,
      "control characters are not allowed",
    );
  }
  if (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    WINDOWS_DRIVE_PATH.test(path)
  ) {
    throw new UnsafeManifestPathError(input, "absolute paths are not allowed");
  }

  const segments = path.replaceAll("\\", "/").split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new UnsafeManifestPathError(
      input,
      "dot and traversal segments are not allowed",
    );
  }

  const normalized = segments.filter(Boolean).join("/");
  if (normalized.length === 0) {
    throw new UnsafeManifestPathError(input, "path has no usable segments");
  }

  return normalized;
}

export function isSafeManifestPath(input: string): boolean {
  try {
    normalizeManifestPath(input);
    return true;
  } catch {
    return false;
  }
}
