import { copyFile, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:3200";
const outputDir = "docs/assets/submission";
const temporaryVideoDir = `${outputDir}/.video-tmp`;
const outputPath = `${outputDir}/proofrestore-demo-silent.webm`;
const server = spawn("npm", ["run", "start", "--", "-p", "3200"], {
  stdio: "inherit",
});

const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await pause(500);
  }
  throw new Error("ProofRestore did not start on port 3200");
}

await mkdir(temporaryVideoDir, { recursive: true });

let browser;
let context;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: temporaryVideoDir,
      size: { width: 1600, height: 900 },
    },
  });
  const page = await context.newPage();
  const video = page.video();

  await page.goto(baseUrl);
  await pause(5_000);

  await page.getByRole("button", { name: "Explore demo vault" }).click();
  await pause(10_000);

  await page.getByRole("button", { name: "Check a file" }).click();
  await pause(5_000);
  await page.getByRole("button", { name: /^Thesis-Final\.docx/ }).click();
  await pause(6_000);
  await page.getByLabel("Original location").check();
  await pause(4_000);

  await page.getByRole("button", { name: "Verify recoverability" }).click();
  await page
    .getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    })
    .waitFor();
  await pause(10_000);

  await page.getByRole("button", { name: "Run restore simulation" }).click();
  await pause(8_000);
  await page.getByText(/Open exact evidence/).click();
  await page.locator(".evidence-disclosure").scrollIntoViewIfNeeded();
  await pause(11_000);

  await page.getByRole("button", { name: "Continue to proof report" }).click();
  await pause(10_000);
  await page
    .getByRole("button", { name: "Generate and download Markdown report" })
    .click();
  await pause(6_000);

  await page.close();
  await context.close();
  context = undefined;
  const recordedPath = await video?.path();
  if (!recordedPath) throw new Error("Playwright did not produce a video");
  await copyFile(recordedPath, outputPath);
  await rm(temporaryVideoDir, { recursive: true, force: true });
} finally {
  await context?.close();
  await browser?.close();
  server.kill("SIGTERM");
}

console.log(`Demo recording saved to ${outputPath}`);
