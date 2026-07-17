import type { VaultManifest } from "@/app/types/manifest";

import { DEMO_SCENARIOS } from "./scenarios";

const HASHES = {
  thesisDraft:
    "1111111111111111111111111111111111111111111111111111111111111111",
  thesisReviewed:
    "2222222222222222222222222222222222222222222222222222222222222222",
  thesisHealthy:
    "3333333333333333333333333333333333333333333333333333333333333333",
  thesisCorruptExpected:
    "4444444444444444444444444444444444444444444444444444444444444444",
  thesisCorruptObserved:
    "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  research: "5555555555555555555555555555555555555555555555555555555555555555",
  presentation:
    "6666666666666666666666666666666666666666666666666666666666666666",
  presentationV2:
    "7777777777777777777777777777777777777777777777777777777777777777",
  readme: "8888888888888888888888888888888888888888888888888888888888888888",
  taxReturn: "9999999999999999999999999999999999999999999999999999999999999999",
  photo: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  desktop: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
} as const;

const directories = (modifiedAt: string) => [
  { path: "Documents", type: "directory" as const, size: 0, modifiedAt },
  {
    path: "Documents/University",
    type: "directory" as const,
    size: 0,
    modifiedAt,
  },
  { path: "Pictures", type: "directory" as const, size: 0, modifiedAt },
  { path: "Projects", type: "directory" as const, size: 0, modifiedAt },
  { path: "Desktop", type: "directory" as const, size: 0, modifiedAt },
  { path: "Finance", type: "directory" as const, size: 0, modifiedAt },
];

const thesisDraft = {
  path: DEMO_SCENARIOS.thesisPath,
  type: "file" as const,
  size: 48_128,
  modifiedAt: "2026-07-11T07:42:00.000Z",
  expectedHash: HASHES.thesisDraft,
  objectId: "object-thesis-v1-draft",
  tags: ["important", "university"],
};

const thesisReviewed = {
  ...thesisDraft,
  size: 51_840,
  modifiedAt: "2026-07-13T18:12:00.000Z",
  expectedHash: HASHES.thesisReviewed,
  objectId: "object-thesis-v2-reviewed",
};

const thesisHealthy = {
  ...thesisDraft,
  size: 53_248,
  modifiedAt: "2026-07-14T16:55:00.000Z",
  expectedHash: HASHES.thesisHealthy,
  objectId: DEMO_SCENARIOS.healthyTuesdayThesisObjectId,
};

const thesisCorrupted = {
  ...thesisDraft,
  size: 56_320,
  modifiedAt: "2026-07-15T19:58:00.000Z",
  expectedHash: HASHES.thesisCorruptExpected,
  objectId: DEMO_SCENARIOS.corruptedThesisObjectId,
};

const researchNotes = {
  path: "Documents/University/Research-Notes.md",
  type: "file" as const,
  size: 16_384,
  modifiedAt: "2026-07-14T15:20:00.000Z",
  expectedHash: HASHES.research,
  objectId: "object-research-notes",
};

const presentationV1 = {
  path: "Projects/Client-Presentation.pptx",
  type: "file" as const,
  size: 2_408_448,
  modifiedAt: "2026-07-12T17:05:00.000Z",
  expectedHash: HASHES.presentation,
  objectId: "object-presentation-v1",
  tags: ["important", "client"],
};

const presentationV2 = {
  ...presentationV1,
  size: 2_621_440,
  modifiedAt: "2026-07-15T18:02:00.000Z",
  expectedHash: HASHES.presentationV2,
  objectId: "object-presentation-v2",
};

const presentationMissing = {
  ...presentationV2,
  size: 2_654_208,
  modifiedAt: "2026-07-16T18:45:00.000Z",
  objectId: DEMO_SCENARIOS.missingPresentationObjectId,
};

const projectReadme = {
  path: "Projects/README.md",
  type: "file" as const,
  size: 4_096,
  modifiedAt: "2026-07-13T09:00:00.000Z",
  expectedHash: HASHES.readme,
  objectId: "object-project-readme",
};

const taxReturn = {
  path: DEMO_SCENARIOS.retentionRiskPath,
  type: "file" as const,
  size: 1_114_112,
  modifiedAt: "2026-04-10T10:15:00.000Z",
  expectedHash: HASHES.taxReturn,
  objectId: "object-tax-return-2025",
  tags: ["important", "finance"],
};

const familyPhoto = {
  path: "Pictures/Family-Reunion.jpg",
  type: "file" as const,
  size: 3_145_728,
  modifiedAt: "2026-07-10T15:30:00.000Z",
  expectedHash: HASHES.photo,
  objectId: "object-family-photo",
};

const desktopNotes = {
  path: "Desktop/Recovery-Checklist.txt",
  type: "file" as const,
  size: 2_048,
  modifiedAt: "2026-07-11T06:30:00.000Z",
  expectedHash: HASHES.desktop,
  objectId: "object-desktop-checklist",
};

export const demoVault: VaultManifest = {
  schemaVersion: "1.0",
  vaultId: DEMO_SCENARIOS.vaultId,
  vaultName: "Flavio's MacBook Backup",
  generatedAt: "2026-07-18T10:00:00.000Z",
  source: "ProofRestore synthetic demo fixture",
  retentionPolicy: {
    mode: "tiered",
    keepLast: 3,
    keepDaily: 7,
    keepWeekly: 4,
    snapshotExpiries: {
      "snapshot-2026-07-11-0830": "2026-07-18T12:00:00.000Z",
      [DEMO_SCENARIOS.retentionRiskSnapshotId]:
        DEMO_SCENARIOS.retentionRiskExpiresAt,
      "snapshot-2026-07-13-2030": "2026-07-20T00:00:00.000Z",
      [DEMO_SCENARIOS.healthyTuesdaySnapshotId]: "2026-07-21T00:00:00.000Z",
      "snapshot-2026-07-14-2130": "2026-08-14T00:00:00.000Z",
    },
  },
  snapshots: [
    {
      id: "snapshot-2026-07-11-0830",
      createdAt: "2026-07-11T08:30:00.000Z",
      completedAt: "2026-07-11T08:34:12.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: { device: "Flavio's MacBook", backupJob: "daily-home" },
      files: [
        ...directories("2026-07-11T08:30:00.000Z"),
        thesisDraft,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: DEMO_SCENARIOS.retentionRiskSnapshotId,
      createdAt: "2026-07-12T20:30:00.000Z",
      completedAt: "2026-07-12T20:35:01.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: { device: "Flavio's MacBook", backupJob: "daily-home" },
      files: [
        ...directories("2026-07-12T20:30:00.000Z"),
        thesisDraft,
        researchNotes,
        presentationV1,
        taxReturn,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: "snapshot-2026-07-13-2030",
      createdAt: "2026-07-13T20:30:00.000Z",
      completedAt: "2026-07-13T20:35:48.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: { device: "Flavio's MacBook", backupJob: "daily-home" },
      files: [
        ...directories("2026-07-13T20:30:00.000Z"),
        thesisReviewed,
        researchNotes,
        presentationV1,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: DEMO_SCENARIOS.healthyTuesdaySnapshotId,
      createdAt: "2026-07-14T17:30:00.000Z",
      completedAt: "2026-07-14T17:34:19.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: {
        device: "Flavio's MacBook",
        backupJob: "pre-submission",
        label: "Tuesday evening — verified thesis",
      },
      files: [
        ...directories("2026-07-14T17:30:00.000Z"),
        thesisHealthy,
        researchNotes,
        presentationV1,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: "snapshot-2026-07-14-2130",
      createdAt: "2026-07-14T21:30:00.000Z",
      completedAt: "2026-07-14T21:34:07.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: { device: "Flavio's MacBook", backupJob: "daily-home" },
      files: [
        ...directories("2026-07-14T21:30:00.000Z"),
        thesisHealthy,
        researchNotes,
        presentationV1,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: DEMO_SCENARIOS.laterCorruptedSnapshotId,
      createdAt: "2026-07-15T20:30:00.000Z",
      completedAt: "2026-07-15T20:34:55.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: {
        device: "Flavio's MacBook",
        backupJob: "daily-home",
        note: "Job completed, but post-write corruption was not reported by the backup tool.",
      },
      files: [
        ...directories("2026-07-15T20:30:00.000Z"),
        thesisCorrupted,
        researchNotes,
        presentationV2,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: DEMO_SCENARIOS.missingObjectSnapshotId,
      createdAt: "2026-07-16T20:30:00.000Z",
      completedAt: "2026-07-16T20:35:22.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: [],
      metadata: {
        device: "Flavio's MacBook",
        backupJob: "daily-home",
        note: "Catalog commit succeeded after an object upload was lost.",
      },
      files: [
        ...directories("2026-07-16T20:30:00.000Z"),
        thesisCorrupted,
        researchNotes,
        presentationMissing,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
    {
      id: "snapshot-2026-07-17-2030",
      createdAt: "2026-07-17T20:30:00.000Z",
      completedAt: "2026-07-17T20:36:03.000Z",
      status: "complete",
      jobReportedSuccess: true,
      warnings: ["Remote object verification was deferred."],
      metadata: { device: "Flavio's MacBook", backupJob: "daily-home" },
      files: [
        ...directories("2026-07-17T20:30:00.000Z"),
        thesisCorrupted,
        researchNotes,
        presentationMissing,
        projectReadme,
        familyPhoto,
        desktopNotes,
      ],
    },
  ],
  objects: [
    {
      id: "object-thesis-v1-draft",
      observedHash: HASHES.thesisDraft,
      size: thesisDraft.size,
      availability: "available",
      storageLocation: "demo://objects/thesis/v1",
      verificationTimestamp: "2026-07-18T08:00:00.000Z",
    },
    {
      id: "object-thesis-v2-reviewed",
      observedHash: HASHES.thesisReviewed,
      size: thesisReviewed.size,
      availability: "available",
      storageLocation: "demo://objects/thesis/v2",
      verificationTimestamp: "2026-07-18T08:00:05.000Z",
    },
    {
      id: DEMO_SCENARIOS.healthyTuesdayThesisObjectId,
      observedHash: HASHES.thesisHealthy,
      size: thesisHealthy.size,
      availability: "available",
      storageLocation: "demo://objects/thesis/v3",
      verificationTimestamp: "2026-07-18T08:00:10.000Z",
    },
    {
      id: DEMO_SCENARIOS.corruptedThesisObjectId,
      observedHash: HASHES.thesisCorruptObserved,
      size: thesisCorrupted.size,
      availability: "corrupted",
      storageLocation: "demo://objects/thesis/v4",
      verificationTimestamp: "2026-07-18T08:00:15.000Z",
    },
    {
      id: "object-research-notes",
      observedHash: HASHES.research,
      size: researchNotes.size,
      availability: "available",
      storageLocation: "demo://objects/research-notes",
      verificationTimestamp: "2026-07-18T08:00:20.000Z",
    },
    {
      id: "object-presentation-v1",
      observedHash: HASHES.presentation,
      size: presentationV1.size,
      availability: "available",
      storageLocation: "demo://objects/presentation/v1",
      verificationTimestamp: "2026-07-18T08:00:25.000Z",
    },
    {
      id: "object-presentation-v2",
      observedHash: HASHES.presentationV2,
      size: presentationV2.size,
      availability: "available",
      storageLocation: "demo://objects/presentation/v2",
      verificationTimestamp: "2026-07-18T08:00:30.000Z",
    },
    {
      id: "object-project-readme",
      observedHash: HASHES.readme,
      size: projectReadme.size,
      availability: "available",
      storageLocation: "demo://objects/projects/readme",
      verificationTimestamp: "2026-07-18T08:00:35.000Z",
    },
    {
      id: "object-tax-return-2025",
      observedHash: HASHES.taxReturn,
      size: taxReturn.size,
      availability: "available",
      storageLocation: "demo://objects/finance/tax-return-2025",
      verificationTimestamp: "2026-07-18T08:00:40.000Z",
    },
    {
      id: "object-family-photo",
      observedHash: HASHES.photo,
      size: familyPhoto.size,
      availability: "available",
      storageLocation: "demo://objects/pictures/family-reunion",
      verificationTimestamp: "2026-07-18T08:00:45.000Z",
    },
    {
      id: "object-desktop-checklist",
      observedHash: HASHES.desktop,
      size: desktopNotes.size,
      availability: "available",
      storageLocation: "demo://objects/desktop/recovery-checklist",
      verificationTimestamp: "2026-07-18T08:00:50.000Z",
    },
  ],
  destinationState: [
    {
      path: DEMO_SCENARIOS.conflictPath,
      currentHash:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      currentSize: 58_368,
      modifiedAt: "2026-07-17T09:12:00.000Z",
    },
    {
      path: DEMO_SCENARIOS.identicalDestinationPath,
      currentHash: HASHES.readme,
      currentSize: projectReadme.size,
      modifiedAt: projectReadme.modifiedAt,
    },
  ],
};

/** Alias for consumers that prefer the manifest-oriented name. */
export const demoManifest = demoVault;

export default demoVault;
