import { expect, test } from "@playwright/test";

import { demoVault } from "@/app/demo";

test("proves the Tuesday-evening thesis recovery flow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Know your backup will restore before you need it.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore demo vault" }).click();

  await expect(
    page.getByRole("heading", { name: "Flavio's MacBook Backup" }),
  ).toBeFocused();
  await expect(
    page.getByText("Completed", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("At risk", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".status-green").first()).toBeVisible();
  await expect(page.locator(".status-amber").first()).toBeVisible();
  await page.getByRole("button", { name: "Check a file" }).click();

  const thesis = page.getByRole("button", {
    name: /^Thesis-Final\.docx/,
  });
  await thesis.click();
  await expect(thesis).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Selected", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Recovery request")).toHaveValue(
    "Can I recover my thesis from Tuesday evening?",
  );
  await expect(page.getByLabel("Separate safe copy")).toBeChecked();
  await page.getByLabel("Original location").check();
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    }),
  ).toBeFocused();
  await expect(
    page.getByText("Tue 14 Jul, 17:30 UTC", { exact: true }).last(),
  ).toBeVisible();

  await page.getByText("How this was decided").click();
  await expect(
    page.getByText(/Request interpreted by the deterministic fallback/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await expect(
    page.getByText("Simulation complete · no files changed"),
  ).toBeVisible();
  await expect(page.getByText("conflict", { exact: true })).toBeVisible();
  await page.getByText(/Open exact evidence/).click();
  await expect(page.getByText("hash_match", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Continue to proof report" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Generate and download Markdown report" })
    .click();
  await download;
  await expect(
    page.getByRole("heading", {
      name: "Proof of Recoverability",
      level: 2,
    }),
  ).toBeVisible();
  await expect(page.getByText("Conflict review required")).toBeVisible();
  await expect(
    page.getByText("Backups should not require faith."),
  ).toBeVisible();
});

test("accepts a valid manifest and rejects a malformed import", async ({
  page,
}) => {
  await page.goto("/");
  const importedVault = structuredClone(demoVault);
  importedVault.vaultName = "Imported failure scenario";
  const latestSnapshot = importedVault.snapshots.at(-1);
  if (!latestSnapshot) throw new Error("Demo fixture must contain a snapshot");
  latestSnapshot.status = "failed";
  latestSnapshot.jobReportedSuccess = false;
  await page.locator("#welcome-import").setInputFiles({
    name: "demo-vault.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importedVault)),
  });
  await expect(
    page.getByRole("heading", { name: "Imported failure scenario" }),
  ).toBeVisible();
  await expect(page.getByText("Failed", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Exit vault" }).click();
  await page.locator("#welcome-import").setInputFiles({
    name: "malformed.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"1.0"}'),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Import rejected" }),
  ).toBeVisible();
});

test("serves the no-key fallback and remains usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const documentResponse = await page.goto("/");
  expect(documentResponse?.headers()).toMatchObject({
    "cross-origin-opener-policy": "same-origin",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  expect(documentResponse?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    )
    .toBe("auto");
  await expect(
    page.getByRole("button", { name: "Explore demo vault" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import backup manifest" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await expect(page.getByText("At risk", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: "Check a file" }).click();
  await expect(
    page.getByRole("textbox", { name: "Search files and folders" }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const response = await page.request.post("/api/interpret", {
    data: {
      query: "Can I recover my thesis from Tuesday evening?",
      pathCandidates: ["Documents/University/Thesis-Final.docx"],
      referenceDateTime: "2026-07-18T10:00:00.000Z",
    },
  });
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    interpreter: "deterministic_fallback",
    result: {
      resolvedPath: "Documents/University/Thesis-Final.docx",
      requestedDateTime: "2026-07-14T19:00:00.000Z",
    },
  });
});

test("changing a request invalidates stale recovery evidence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await page.getByRole("button", { name: "Check a file" }).click();
  await page.getByRole("button", { name: /^Thesis-Final\.docx/ }).click();
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recovery request" }).click();
  await page.getByLabel("Recovery request").fill("Recover Research-Notes.md");
  await expect(
    page.getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore simulation" }),
  ).toBeDisabled();
});

test("keeps the request workflow unclipped across responsive layouts", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Explore demo vault" }).click();
    await page.getByRole("button", { name: "Check a file" }).click();

    const title = page.getByRole("heading", {
      name: "What do you need to recover?",
    });
    const titleBox = await title.boundingBox();
    const header = page.locator(".workspace-header");
    const headerBox = await header.boundingBox();
    const headerPosition = await header.evaluate(
      (element) => getComputedStyle(element).position,
    );
    if (headerPosition === "sticky" && titleBox && headerBox) {
      expect(titleBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    }

    const searchInput = page.getByRole("textbox", {
      name: "Search files and folders",
    });
    expect((await searchInput.boundingBox())?.height).toBeGreaterThanOrEqual(
      44,
    );
    await page.getByRole("button", { name: /^Thesis-Final\.docx/ }).click();

    const clipping = await page.evaluate(() => {
      const workspace =
        document.querySelector<HTMLElement>(".request-workspace");
      const version = document.querySelector<HTMLElement>(".version-panel");
      return {
        documentOverflow:
          document.documentElement.scrollWidth - window.innerWidth,
        workspace:
          (workspace?.scrollHeight ?? 0) - (workspace?.clientHeight ?? 0),
        version: (version?.scrollHeight ?? 0) - (version?.clientHeight ?? 0),
      };
    });
    expect(clipping.documentOverflow).toBeLessThanOrEqual(1);
    expect(clipping.workspace).toBeLessThanOrEqual(1);
    expect(clipping.version).toBeLessThanOrEqual(1);

    await page.getByText("Choose an exact snapshot", { exact: true }).click();
    await expect(page.locator(".version-option")).toHaveCount(4);
    for (const option of await page.locator(".version-option").all()) {
      expect((await option.boundingBox())?.height).toBeGreaterThanOrEqual(64);
    }
    await expect(
      page.getByRole("button", { name: "Verify recoverability" }),
    ).toBeVisible();
  }
});

test("lets a user corrupt an uploaded virtual backup with full evidence", async ({
  page,
}) => {
  let interpreterRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/interpret")) interpreterRequests += 1;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Open recovery lab" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Break a virtual backup. Watch ProofRestore prove it.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Your originals stay untouched.")).toBeVisible();

  await page.locator("#lab-file-input").setInputFiles({
    name: "tester-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("A healthy source file selected by the tester."),
  });
  await expect(
    page.getByRole("button", { name: /lab-snapshot-001/ }),
  ).toBeVisible();
  await page.getByText("View SHA-256", { exact: true }).click();
  await expect(page.getByText(/^sha256:/).first()).toBeVisible();

  await page.getByLabel("Corrupt stored copy").check();
  await page.getByRole("button", { name: "Apply to virtual vault" }).click();
  await expect(
    page.getByText(/Flipped a byte in lab-object-001-001/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run recovery check" }).click();
  await expect(
    page.getByRole("heading", { name: "Unrecoverable" }),
  ).toBeFocused();
  await expect(
    page.locator(".lab-result").getByText("hash_mismatch", { exact: true }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export generated manifest" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("proofrestore-recovery-lab.json");

  await page
    .getByRole("button", { name: /Open full recovery workflow/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "What do you need to recover?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Recovery Lab", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await expect(
    page.getByRole("heading", {
      name: "This recovery point is not recoverable.",
    }),
  ).toBeFocused();
  expect(interpreterRequests).toBe(0);
});

test("keeps the Recovery Lab usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open recovery lab" }).click();
  await page.getByRole("button", { name: "Use sample files" }).click();
  await expect(
    page.getByRole("button", { name: /lab-snapshot-001/ }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  for (const button of await page.locator(".lab-step button").all()) {
    const box = await button.boundingBox();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test("shows partial restore failures without green success styling on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await page.getByRole("button", { name: "Check a file" }).click();
  await page
    .getByRole("textbox", { name: "Search files and folders" })
    .fill("Projects");
  await page.getByRole("button", { name: /^Projects Vault root/ }).click();
  await page.getByText("Choose an exact snapshot", { exact: true }).click();
  await page
    .locator(".version-option")
    .filter({ hasText: "snapshot-2026-07-16-2030" })
    .click();
  await expect(
    page.getByLabel("Include everything inside this folder"),
  ).toBeChecked();
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Some of this recovery is unavailable.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await expect(page.locator(".simulation-summary.danger")).toBeVisible();
  await expect(page.getByText("Cannot recover", { exact: true })).toBeVisible();
  await expect(page.getByText("unavailable", { exact: true })).toBeVisible();
});
