import { describe, expect, it } from "vitest";

import { parseVaultManifest } from "@/app/manifest";
import { DEMO_SCENARIOS, demoVault } from "@/app/demo";

describe("built-in demo vault fixture", () => {
  it("is a valid, readable v1 manifest with a multi-day history", () => {
    const parsed = parseVaultManifest(demoVault);

    expect(parsed.vaultName).toBe("Flavio's MacBook Backup");
    expect(parsed.snapshots).toHaveLength(8);
    expect(
      new Set(
        parsed.snapshots.map((snapshot) => snapshot.createdAt.slice(0, 10)),
      ).size,
    ).toBeGreaterThanOrEqual(6);
  });

  it("contains the healthy thesis version selected for Tuesday evening", () => {
    const eligible = demoVault.snapshots
      .filter(
        (snapshot) => snapshot.createdAt <= DEMO_SCENARIOS.thesisTuesdayRequest,
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const selected = eligible[0];
    const thesis = selected?.files.find(
      (file) => file.path === DEMO_SCENARIOS.thesisPath,
    );
    const storedObject = demoVault.objects.find(
      (object) =>
        object.id === (thesis?.type === "file" ? thesis.objectId : undefined),
    );

    expect(selected?.id).toBe(DEMO_SCENARIOS.healthyTuesdaySnapshotId);
    expect(thesis).toMatchObject({
      type: "file",
      objectId: DEMO_SCENARIOS.healthyTuesdayThesisObjectId,
    });
    expect(storedObject).toMatchObject({ availability: "available" });
    expect(storedObject?.observedHash).toBe(
      thesis?.type === "file" ? thesis.expectedHash : undefined,
    );
    expect(storedObject?.size).toBe(thesis?.size);
  });

  it("models silent corruption after the healthy recovery point", () => {
    const snapshot = demoVault.snapshots.find(
      ({ id }) => id === DEMO_SCENARIOS.laterCorruptedSnapshotId,
    );
    const thesis = snapshot?.files.find(
      (file) => file.path === DEMO_SCENARIOS.thesisPath,
    );
    const storedObject = demoVault.objects.find(
      (object) =>
        object.id === (thesis?.type === "file" ? thesis.objectId : undefined),
    );

    expect(snapshot).toMatchObject({
      status: "complete",
      jobReportedSuccess: true,
    });
    expect(storedObject).toMatchObject({ availability: "corrupted" });
    expect(storedObject?.observedHash).not.toBe(
      thesis?.type === "file" ? thesis.expectedHash : undefined,
    );
  });

  it("models a successful job whose presentation object does not exist", () => {
    const snapshot = demoVault.snapshots.find(
      ({ id }) => id === DEMO_SCENARIOS.missingObjectSnapshotId,
    );
    const presentation = snapshot?.files.find(
      (file) => file.path === "Projects/Client-Presentation.pptx",
    );

    expect(snapshot).toMatchObject({
      status: "complete",
      jobReportedSuccess: true,
    });
    expect(presentation).toMatchObject({
      type: "file",
      objectId: DEMO_SCENARIOS.missingPresentationObjectId,
    });
    expect(
      demoVault.objects.some(
        ({ id }) => id === DEMO_SCENARIOS.missingPresentationObjectId,
      ),
    ).toBe(false);
  });

  it("makes Projects a partial-folder recovery with a healthy child and an unavailable child", () => {
    const snapshot = demoVault.snapshots.find(
      ({ id }) => id === DEMO_SCENARIOS.missingObjectSnapshotId,
    );
    const children =
      snapshot?.files.filter((file) =>
        file.path.startsWith(`${DEMO_SCENARIOS.partialFolderPath}/`),
      ) ?? [];
    const objectIds = new Set(demoVault.objects.map(({ id }) => id));

    expect(children.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "Projects/README.md",
        "Projects/Client-Presentation.pptx",
      ]),
    );
    expect(
      children.some(
        (file) => file.type === "file" && objectIds.has(file.objectId),
      ),
    ).toBe(true);
    expect(
      children.some(
        (file) => file.type === "file" && !objectIds.has(file.objectId),
      ),
    ).toBe(true);
  });

  it("marks the only healthy tax-return copy for imminent expiry", () => {
    const copies = demoVault.snapshots.flatMap((snapshot) =>
      snapshot.files
        .filter((file) => file.path === DEMO_SCENARIOS.retentionRiskPath)
        .map((file) => ({ snapshot, file })),
    );

    expect(copies).toHaveLength(1);
    expect(copies[0]?.snapshot.id).toBe(DEMO_SCENARIOS.retentionRiskSnapshotId);
    expect(
      demoVault.retentionPolicy.snapshotExpiries?.[
        DEMO_SCENARIOS.retentionRiskSnapshotId
      ],
    ).toBe(DEMO_SCENARIOS.retentionRiskExpiresAt);
  });

  it("contains both overwrite-conflict and identical-destination inputs", () => {
    const conflict = demoVault.destinationState?.find(
      ({ path }) => path === DEMO_SCENARIOS.conflictPath,
    );
    const identical = demoVault.destinationState?.find(
      ({ path }) => path === DEMO_SCENARIOS.identicalDestinationPath,
    );
    const readmeObject = demoVault.objects.find(
      ({ id }) => id === "object-project-readme",
    );

    expect(conflict?.currentHash).not.toBe(
      demoVault.objects.find(
        ({ id }) => id === DEMO_SCENARIOS.healthyTuesdayThesisObjectId,
      )?.observedHash,
    );
    expect(identical).toMatchObject({
      currentHash: readmeObject?.observedHash,
      currentSize: readmeObject?.size,
    });
  });
});
