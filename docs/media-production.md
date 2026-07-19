# Submission media production

The publication artifact is `docs/assets/submission/proofrestore-demo-final.mp4`. It is a 2:21 demo containing deterministic human-like pointer movement, visible click pulses, smooth recorder-only scrolling, natural neural narration, normalized stereo audio, a default selectable English caption track, and an explicit explanation that Codex ran GPT-5.6 Sol from start to finish. The official rules require a public YouTube upload; attach `proofrestore-demo-captions.srt` separately because YouTube may not preserve embedded MP4 subtitles during transcoding.

## Rebuild the visual recording

```bash
npm run build
npm run record:demo
```

The recorder starts the production application, captures the complete demo and Recovery Lab path at 1600×900, and writes a temporary `proofrestore-demo-silent.webm`. It renders its own high-contrast pointer and click pulse because headless recordings do not contain the operating-system cursor. The silent render and generated narration audio are production intermediates and are intentionally not retained in the public repository.

The checked-in narration source uses Microsoft Edge's `en-US-AndrewMultilingualNeural` voice in the final cut. The curated SRT remains alongside the publication MP4 so caption wording, timing, and the AI-narration disclosure can be reviewed and uploaded independently.

## Publishing check

Use this YouTube title:

> ProofRestore — Evidence-backed backup recovery verification | OpenAI Build Week

Use this description:

> ProofRestore verifies whether backup data can actually be recovered, safely simulates restore actions, exposes deterministic evidence, and generates a Proof of Recoverability report. Built during OpenAI Build Week with Codex running GPT-5.6 Sol from start to finish. Live demo: https://proofrestore.vercel.app — Source: https://github.com/ATAC-Helicopter/ProofRestore — Narration is AI-generated; no copyrighted music is used.

1. Upload only `proofrestore-demo-final.mp4` to YouTube and set visibility to **Public**.
2. Attach `proofrestore-demo-captions.srt` as English captions.
3. Confirm narration plays, the final Codex/GPT-5.6 Sol disclosure is visible, and CC can be toggled on YouTube's transcoded copy.
4. Confirm YouTube reports a runtime of approximately 2:21, below the official 3:00 maximum.
5. Add the public URL to Devpost and the submission checklist.
