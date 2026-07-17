import { z } from "zod";

import { MANIFEST_SCHEMA_VERSION, type JsonValue } from "@/app/types/manifest";
import { normalizeManifestPath } from "./path";

const identifierSchema = z.string().trim().min(1).max(200);
const displayTextSchema = z.string().trim().min(1).max(500);
const hashSchema = z.string().trim().min(1).max(256);
const byteCountSchema = z.number().int().nonnegative().safe();

export const utcDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());

export const safeManifestPathSchema = z.string().transform((value, context) => {
  try {
    return normalizeManifestPath(value);
  } catch (error) {
    context.addIssue({
      code: "custom",
      message: error instanceof Error ? error.message : "Unsafe manifest path",
    });
    return z.NEVER;
  }
});

const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const snapshotFileSchema = z
  .object({
    path: safeManifestPathSchema,
    type: z.literal("file"),
    size: byteCountSchema,
    modifiedAt: utcDateTimeSchema,
    expectedHash: hashSchema,
    objectId: identifierSchema,
    tags: z.array(displayTextSchema).max(100).optional(),
  })
  .strict();

export const snapshotDirectorySchema = z
  .object({
    path: safeManifestPathSchema,
    type: z.literal("directory"),
    size: z.literal(0),
    modifiedAt: utcDateTimeSchema,
    tags: z.array(displayTextSchema).max(100).optional(),
  })
  .strict();

export const snapshotEntrySchema = z.discriminatedUnion("type", [
  snapshotFileSchema,
  snapshotDirectorySchema,
]);

export const snapshotSchema = z
  .object({
    id: identifierSchema,
    createdAt: utcDateTimeSchema,
    completedAt: utcDateTimeSchema,
    status: z.enum(["complete", "partial", "failed"]),
    jobReportedSuccess: z.boolean(),
    files: z.array(snapshotEntrySchema).max(100_000),
    warnings: z.array(z.string().max(2_000)).max(1_000),
    metadata: z.record(z.string().max(200), jsonValueSchema),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (Date.parse(snapshot.completedAt) < Date.parse(snapshot.createdAt)) {
      context.addIssue({
        code: "custom",
        path: ["completedAt"],
        message: "Snapshot completion cannot precede creation",
      });
    }

    addDuplicateIssues(
      snapshot.files.map((file) => file.path),
      context,
      "files",
      "path",
    );
  });

export const storedObjectSchema = z
  .object({
    id: identifierSchema,
    observedHash: hashSchema,
    size: byteCountSchema,
    availability: z.enum(["available", "missing", "corrupted"]),
    storageLocation: displayTextSchema,
    verificationTimestamp: utcDateTimeSchema,
  })
  .strict();

export const retentionPolicySchema = z
  .object({
    mode: z.enum(["keep_all", "tiered", "explicit"]),
    keepLast: z.number().int().nonnegative(),
    keepDaily: z.number().int().nonnegative(),
    keepWeekly: z.number().int().nonnegative(),
    snapshotExpiries: z.record(identifierSchema, utcDateTimeSchema).optional(),
  })
  .strict();

export const destinationStateEntrySchema = z
  .object({
    path: safeManifestPathSchema,
    currentHash: hashSchema,
    currentSize: byteCountSchema,
    modifiedAt: utcDateTimeSchema,
  })
  .strict();

export const vaultManifestSchema = z
  .object({
    schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
    vaultId: identifierSchema,
    vaultName: displayTextSchema,
    generatedAt: utcDateTimeSchema,
    source: displayTextSchema,
    snapshots: z.array(snapshotSchema).max(10_000),
    objects: z.array(storedObjectSchema).max(1_000_000),
    retentionPolicy: retentionPolicySchema,
    destinationState: z
      .array(destinationStateEntrySchema)
      .max(100_000)
      .optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    addDuplicateIssues(
      manifest.snapshots.map((snapshot) => snapshot.id),
      context,
      "snapshots",
      "id",
    );
    addDuplicateIssues(
      manifest.objects.map((object) => object.id),
      context,
      "objects",
      "id",
    );
    addDuplicateIssues(
      manifest.destinationState?.map((entry) => entry.path) ?? [],
      context,
      "destinationState",
      "path",
    );

    if (manifest.retentionPolicy.snapshotExpiries) {
      const snapshotIds = new Set(
        manifest.snapshots.map((snapshot) => snapshot.id),
      );
      for (const snapshotId of Object.keys(
        manifest.retentionPolicy.snapshotExpiries,
      )) {
        if (!snapshotIds.has(snapshotId)) {
          context.addIssue({
            code: "custom",
            path: ["retentionPolicy", "snapshotExpiries", snapshotId],
            message: `Expiry references unknown snapshot ${JSON.stringify(snapshotId)}`,
          });
        }
      }
    }
  });

function addDuplicateIssues(
  values: string[],
  context: z.RefinementCtx,
  collection: string,
  key: string,
): void {
  const firstIndex = new Map<string, number>();
  values.forEach((value, index) => {
    const existingIndex = firstIndex.get(value);
    if (existingIndex === undefined) {
      firstIndex.set(value, index);
      return;
    }
    context.addIssue({
      code: "custom",
      path: [collection, index, key],
      message: `Duplicate ${key} ${JSON.stringify(value)}; first used at index ${existingIndex}`,
    });
  });
}
