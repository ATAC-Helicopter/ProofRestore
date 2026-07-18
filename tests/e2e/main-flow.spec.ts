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

  await expect(page.getByText("Backup status")).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByText("Recoverability status")).toBeVisible();
  await expect(page.getByText("At risk", { exact: true })).toBeVisible();
  await expect(page.getByText("Not run", { exact: true })).toBeVisible();

  await page
    .getByRole("button", { name: /Documents\/University\/Thesis-Final\.docx/ })
    .click();
  await expect(
    page.getByRole("button", {
      name: /Documents\/University\/Thesis-Final\.docx/,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Selected", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Natural-language recovery request"),
  ).toHaveValue("Can I recover my thesis from Tuesday evening?");
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await expect(
    page.getByRole("heading", { name: "Fully recoverable" }),
  ).toBeVisible();
  await expect(
    page.getByText("Tue 14 Jul, 17:30 UTC", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    page.getByText(/Request interpreted by the deterministic fallback/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await expect(
    page.getByText("Restore simulation · no files changed"),
  ).toBeVisible();
  await expect(page.getByText("conflict", { exact: true })).toBeVisible();
  await expect(page.getByText("Just now", { exact: true })).toBeVisible();
  await page.getByText(/Open exact evidence/).click();
  await expect(page.getByText("hash_match", { exact: true })).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate proof report" }).click();
  await download;
  await expect(
    page.getByRole("heading", { name: "Proof of Recoverability" }),
  ).toBeVisible();
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
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back to welcome" }).click();
  await page.locator("#welcome-import").setInputFiles({
    name: "malformed.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":"1.0"}'),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "Import rejected" }),
  ).toBeVisible();
});

test("serves the no-key interpreter fallback and keeps the welcome usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Explore demo vault" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Import backup manifest" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await expect(page.getByText("At risk", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search protected paths")).toBeVisible();

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
