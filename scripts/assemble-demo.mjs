import { rename, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const outputDir = "docs/assets/submission";
const videoPath = `${outputDir}/proofrestore-demo-silent.webm`;
const narrationPath = `${outputDir}/proofrestore-narration-neural.mp3`;
const captionsPath = `${outputDir}/proofrestore-demo-captions.srt`;
const outputPath = `${outputDir}/proofrestore-demo-final.mp4`;
const temporaryPath = `${outputDir}/.proofrestore-demo-final.tmp.mp4`;
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";

const args = [
  "-y",
  "-i",
  videoPath,
  "-i",
  narrationPath,
  "-i",
  captionsPath,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-map",
  "2:s:0",
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-af",
  "loudnorm=I=-16:TP=-1.5:LRA=11",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-ar",
  "48000",
  "-ac",
  "2",
  "-c:s",
  "mov_text",
  "-metadata:s:s:0",
  "language=eng",
  "-disposition:s:0",
  "default",
  "-movflags",
  "+faststart",
  temporaryPath,
];

await rm(temporaryPath, { force: true });

await new Promise((resolve, reject) => {
  const child = spawn(ffmpeg, args, { stdio: "inherit" });
  child.once("error", (error) => {
    reject(
      new Error(
        `Could not start ffmpeg at ${JSON.stringify(ffmpeg)}. Install ffmpeg or set FFMPEG_PATH. ${error.message}`,
      ),
    );
  });
  child.once("exit", (code) => {
    if (code === 0) resolve();
    else reject(new Error(`ffmpeg exited with status ${code ?? "unknown"}`));
  });
});

await rename(temporaryPath, outputPath);
console.log(`Final narrated demo saved to ${outputPath}`);
