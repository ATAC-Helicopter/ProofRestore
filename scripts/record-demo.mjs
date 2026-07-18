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

async function clickWithPointer(page, locator, after = 1_000) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Demo click target is not visible");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 16,
  });
  await pause(650);
  await locator.click();
  await pause(after);
}

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

  await page.addInitScript(() => {
    window.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = `
        * { cursor: none !important; }
        #demo-pointer {
          position: fixed;
          left: 50%;
          top: 50%;
          width: 22px;
          height: 22px;
          border: 3px solid #ffffff;
          border-radius: 999px;
          background: #3b82f6;
          box-shadow: 0 0 0 2px #08111f, 0 5px 18px rgba(0, 0, 0, 0.45);
          pointer-events: none;
          transform: translate(-50%, -50%);
          transition: width 120ms ease, height 120ms ease, background 120ms ease;
          z-index: 2147483647;
        }
        #demo-pointer.is-clicking {
          width: 16px;
          height: 16px;
          background: #f8fafc;
        }
        .demo-click-ring {
          position: fixed;
          width: 26px;
          height: 26px;
          border: 4px solid #60a5fa;
          border-radius: 999px;
          pointer-events: none;
          transform: translate(-50%, -50%);
          animation: demo-click-pulse 650ms ease-out forwards;
          z-index: 2147483646;
        }
        @keyframes demo-click-pulse {
          from { opacity: 1; width: 26px; height: 26px; }
          to { opacity: 0; width: 72px; height: 72px; }
        }
      `;
      document.head.append(style);

      const pointer = document.createElement("div");
      pointer.id = "demo-pointer";
      pointer.setAttribute("aria-hidden", "true");
      document.body.append(pointer);

      document.addEventListener("mousemove", (event) => {
        pointer.style.left = `${event.clientX}px`;
        pointer.style.top = `${event.clientY}px`;
      });
      document.addEventListener("mousedown", (event) => {
        pointer.classList.add("is-clicking");
        const ring = document.createElement("div");
        ring.className = "demo-click-ring";
        ring.style.left = `${event.clientX}px`;
        ring.style.top = `${event.clientY}px`;
        document.body.append(ring);
        window.setTimeout(() => ring.remove(), 700);
      });
      document.addEventListener("mouseup", () => {
        pointer.classList.remove("is-clicking");
      });
    });
  });

  await page.goto(baseUrl);
  await page.mouse.move(1_420, 90, { steps: 10 });
  await pause(5_800);

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Explore demo vault" }),
    8_500,
  );

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Check a file" }),
    1_200,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: /^Thesis-Final\.docx/ }),
    2_000,
  );
  await clickWithPointer(
    page,
    page.getByText("Choose an exact snapshot", { exact: true }),
    2_000,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: /Show 4 older versions/ }),
    2_000,
  );
  await clickWithPointer(
    page,
    page.getByLabel("Use time from my request"),
    700,
  );
  await clickWithPointer(page, page.getByLabel("Original location"), 1_500);

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Verify recoverability" }),
    500,
  );
  await page
    .getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    })
    .waitFor();
  await pause(10_000);

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Run restore simulation" }),
    6_000,
  );
  await clickWithPointer(page, page.getByText(/Open exact evidence/), 500);
  await page.locator(".evidence-disclosure").scrollIntoViewIfNeeded();
  await pause(6_000);

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Continue to proof report" }),
    4_000,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Generate and download Markdown report" }),
    1_000,
  );

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Exit vault" }),
    1_000,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Open recovery lab" }),
    6_000,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Use sample files" }),
    5_000,
  );
  await clickWithPointer(page, page.getByLabel("Corrupt stored copy"), 700);
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Apply to virtual vault" }),
    4_000,
  );
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Run recovery check" }),
    1_000,
  );
  await page.getByRole("heading", { name: "Unrecoverable" }).waitFor();
  await page.locator(".lab-result").scrollIntoViewIfNeeded();
  await pause(18_000);

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
