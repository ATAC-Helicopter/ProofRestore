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

let randomState = 0x5eedc0de;
let pointerPosition = { x: 1_420, y: 90 };

function seededRandom() {
  randomState = (randomState * 1_664_525 + 1_013_904_223) >>> 0;
  return randomState / 0x1_0000_0000;
}

function mix(start, end, amount) {
  return start + (end - start) * amount;
}

async function movePointer(page, destination) {
  const start = pointerPosition;
  const distance = Math.hypot(destination.x - start.x, destination.y - start.y);
  const duration = Math.min(720, Math.max(320, distance * 0.48));
  const samples = Math.round(Math.min(48, Math.max(24, distance / 24)));
  const perpendicular = {
    x: -(destination.y - start.y) / Math.max(distance, 1),
    y: (destination.x - start.x) / Math.max(distance, 1),
  };
  const bend = (seededRandom() - 0.5) * Math.min(110, distance * 0.24);
  const controlA = {
    x: mix(start.x, destination.x, 0.32) + perpendicular.x * bend,
    y: mix(start.y, destination.y, 0.32) + perpendicular.y * bend,
  };
  const controlB = {
    x: mix(start.x, destination.x, 0.72) + perpendicular.x * bend * 0.55,
    y: mix(start.y, destination.y, 0.72) + perpendicular.y * bend * 0.55,
  };

  for (let index = 1; index <= samples; index += 1) {
    const linearProgress = index / samples;
    const progress = 0.5 - Math.cos(Math.PI * linearProgress) / 2;
    const inverse = 1 - progress;
    const x =
      inverse ** 3 * start.x +
      3 * inverse ** 2 * progress * controlA.x +
      3 * inverse * progress ** 2 * controlB.x +
      progress ** 3 * destination.x;
    const y =
      inverse ** 3 * start.y +
      3 * inverse ** 2 * progress * controlA.y +
      3 * inverse * progress ** 2 * controlB.y +
      progress ** 3 * destination.y;
    await page.mouse.move(x, y);
    await pause(duration / samples);
  }
  pointerPosition = destination;
}

async function smoothReveal(page, locator, block = "center") {
  const visibility = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      visible: rect.top >= 92 && rect.bottom <= window.innerHeight - 40,
      distance: Math.abs(rect.top - 96),
    };
  });
  if (visibility.visible) return;

  if (visibility.distance > 150) {
    await movePointer(page, { x: 1_465, y: 92 });
  }
  await locator.evaluate(async (element, requestedBlock) => {
    const rect = element.getBoundingClientRect();
    const start = window.scrollY;
    const rawTarget =
      requestedBlock === "start"
        ? start + rect.top - 96
        : start + rect.top - (window.innerHeight - rect.height) / 2;
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(rawTarget, maximum));
    const duration = Math.min(
      900,
      Math.max(420, Math.abs(target - start) * 0.55),
    );
    await new Promise((resolve) => {
      const startedAt = performance.now();
      function animate(now) {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased =
          progress < 0.5
            ? 4 * progress ** 3
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        window.scrollTo(0, start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(animate);
        else resolve();
      }
      requestAnimationFrame(animate);
    });
  }, block);
  await pause(120);
}

async function pointAt(page, locator, block = "center") {
  await smoothReveal(page, locator, block);
  const box = await locator.boundingBox();
  if (!box) throw new Error("Demo pointer target is not visible");
  await movePointer(page, {
    x: box.x + Math.min(box.width - 10, Math.max(10, box.width * 0.53)),
    y: box.y + Math.min(box.height - 10, Math.max(10, box.height * 0.48)),
  });
  await pause(280);
}

async function clickWithPointer(page, locator, after = 1_000) {
  await smoothReveal(page, locator);
  const box = await locator.boundingBox();
  if (!box) throw new Error("Demo click target is not visible");
  const insetX = Math.min(12, box.width * 0.2);
  const insetY = Math.min(10, box.height * 0.2);
  const target = {
    x:
      box.x + insetX + (box.width - insetX * 2) * (0.48 + seededRandom() * 0.1),
    y:
      box.y +
      insetY +
      (box.height - insetY * 2) * (0.45 + seededRandom() * 0.1),
  };
  await movePointer(page, target);
  await pause(220 + seededRandom() * 160);
  await page.mouse.down();
  await pause(85 + seededRandom() * 40);
  await page.mouse.up();
  await pause(after);
}

async function revealAndHold(page, locator, milliseconds, block = "start") {
  await smoothReveal(page, locator, block);
  await pointAt(page, locator, block);
  await pause(milliseconds);
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
    reducedMotion: "no-preference",
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
  await page.mouse.move(pointerPosition.x, pointerPosition.y);
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
  await revealAndHold(
    page,
    page.getByRole("heading", {
      name: "Yes — this version is fully recoverable.",
    }),
    9_000,
  );

  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Run restore simulation" }),
    6_000,
  );
  await clickWithPointer(page, page.getByText(/Open exact evidence/), 500);
  await revealAndHold(page, page.locator(".evidence-disclosure"), 5_000);

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
    1_500,
  );
  await revealAndHold(page, page.locator(".lab-trust"), 3_500);
  await clickWithPointer(
    page,
    page.getByRole("button", { name: "Use sample files" }),
    2_500,
  );
  await revealAndHold(page, page.locator(".lab-snapshot-list"), 1_500);
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
  await revealAndHold(page, page.locator(".lab-result"), 17_000);

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
