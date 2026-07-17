import type { SafeParseReturnType } from "zod";

import type { VaultManifest } from "@/app/types/manifest";
import { vaultManifestSchema } from "./schema";

export const DEFAULT_MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

export class ManifestTooLargeError extends Error {
  readonly actualBytes: number;
  readonly maximumBytes: number;

  constructor(actualBytes: number, maximumBytes: number) {
    super(
      `Manifest is ${actualBytes} bytes; maximum allowed size is ${maximumBytes} bytes`,
    );
    this.name = "ManifestTooLargeError";
    this.actualBytes = actualBytes;
    this.maximumBytes = maximumBytes;
  }
}

export function assertManifestSize(
  content: string | Uint8Array,
  maximumBytes = DEFAULT_MAX_MANIFEST_BYTES,
): void {
  const actualBytes =
    typeof content === "string"
      ? new TextEncoder().encode(content).byteLength
      : content.byteLength;
  if (actualBytes > maximumBytes) {
    throw new ManifestTooLargeError(actualBytes, maximumBytes);
  }
}

export function parseVaultManifest(input: unknown): VaultManifest {
  return vaultManifestSchema.parse(input);
}

export function safeParseVaultManifest(
  input: unknown,
): SafeParseReturnType<unknown, VaultManifest> {
  return vaultManifestSchema.safeParse(input) as SafeParseReturnType<
    unknown,
    VaultManifest
  >;
}

export function parseVaultManifestJson(
  json: string,
  maximumBytes = DEFAULT_MAX_MANIFEST_BYTES,
): VaultManifest {
  assertManifestSize(json, maximumBytes);
  return parseVaultManifest(JSON.parse(json) as unknown);
}
