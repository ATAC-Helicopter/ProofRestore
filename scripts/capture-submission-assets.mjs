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
  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await page.screenshot({
    path: `${outputDir}/01-dashboard-1600x900.png`,
  });

  const thesis = page.getByRole("button", {
    name: /Documents\/University\/Thesis-Final\.docx/,
  });
  await thesis.click();
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${outputDir}/cover-1500x1000.png`,
  });

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "app/opengraph-image.png" });

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole("button", { name: "Verify recoverability" }).click();
  const recoveryResult = page.getByRole("heading", { name: "Recovery result" });
  await recoveryResult.waitFor();
  await page.waitForTimeout(1_000);
  const resultOffset = await recoveryResult.evaluate(
    (element) => element.getBoundingClientRect().top + window.scrollY,
  );
  await page.evaluate(
    (offset) => window.scrollTo({ top: offset - 80, behavior: "instant" }),
    resultOffset,
  );
  await page.waitForTimeout(500);
  await page.screenshot({
    path: `${outputDir}/02-recovery-result-1600x900.png`,
  });

  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await page.getByText(/Open exact evidence/).click();
  const evidence = page.locator("details");
  await evidence.evaluate((element) =>
    element.scrollIntoView({ block: "start" }),
  );
  await page.screenshot({
    path: `${outputDir}/03-simulation-evidence-1600x900.png`,
  });

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Generate proof report" }).click();
  await download;
  const report = page.getByRole("heading", { name: "Proof of Recoverability" });
  await report.evaluate((element) =>
    element.scrollIntoView({ block: "start" }),
  );
  await page.screenshot({
    path: `${outputDir}/04-proof-report-1600x900.png`,
  });
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
