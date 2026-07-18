import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:3100";
const outputDir = "docs/assets/submission";
const server = spawn("npm", ["run", "start", "--", "-p", "3100"], {
  stdio: "inherit",
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("ProofRestore did not start on port 3100");
}

async function screenshot(page, path, resetScroll = true) {
  if (resetScroll) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }
  await page.waitForTimeout(250);
  await page.screenshot({ path });
}

await mkdir(outputDir, { recursive: true });

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });

  await page.goto(baseUrl);
  await screenshot(page, `${outputDir}/00-welcome-1600x900.png`);

  await page.setViewportSize({ width: 1500, height: 1000 });
  await screenshot(page, `${outputDir}/cover-1500x1000.png`);

  await page.setViewportSize({ width: 1200, height: 630 });
  await screenshot(page, "app/opengraph-image.png");

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await screenshot(page, `${outputDir}/01-vault-health-1600x900.png`);

  await page.getByRole("button", { name: "Check a file" }).click();
  await page.getByRole("button", { name: /^Thesis-Final\.docx/ }).click();
  await page.getByLabel("Original location").check();
  await screenshot(page, `${outputDir}/02-recovery-request-1600x900.png`);

  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await page
    .getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    })
    .waitFor();
  await screenshot(page, `${outputDir}/03-verified-result-1600x900.png`);

  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await page.getByText(/Open exact evidence/).click();
  await page.locator(".evidence-disclosure").scrollIntoViewIfNeeded();
  await screenshot(
    page,
    `${outputDir}/04-simulation-evidence-1600x900.png`,
    false,
  );

  await page.getByRole("button", { name: "Continue to proof report" }).click();
  await screenshot(page, `${outputDir}/05-proof-report-1600x900.png`);

  const labPage = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });
  await labPage.goto(baseUrl);
  await labPage.getByRole("button", { name: "Open recovery lab" }).click();
  await labPage.getByRole("button", { name: "Use sample files" }).click();
  await labPage.getByLabel("Corrupt stored copy").check();
  await labPage.getByRole("button", { name: "Apply to virtual vault" }).click();
  await labPage.getByRole("button", { name: "Run recovery check" }).click();
  await labPage.locator(".lab-result").scrollIntoViewIfNeeded();
  await screenshot(labPage, `${outputDir}/06-recovery-lab-1600x900.png`, false);
  await labPage.close();
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
