# Submission media production

The publication artifact is `docs/assets/submission/proofrestore-demo-final.mp4`. It contains deterministic human-like pointer movement, visible click pulses, smooth recorder-only scrolling, natural neural narration, normalized stereo audio, and a default selectable English caption track. Upload `proofrestore-demo-captions.srt` separately to the video host because some services discard embedded MP4 subtitles while transcoding.

## Rebuild the visual recording

```bash
npm run build
npm run record:demo
```

The recorder starts the production application, captures the complete demo and Recovery Lab path at 1600×900, and writes a temporary `proofrestore-demo-silent.webm`. It renders its own high-contrast pointer and click pulse because headless recordings do not contain the operating-system cursor. The silent render and generated narration audio are production intermediates and are intentionally not retained in the public repository.

The checked-in narration source uses Microsoft Edge's `en-US-AndrewMultilingualNeural` voice in the final cut. The curated SRT remains alongside the publication MP4 so caption wording, timing, and the AI-narration disclosure can be reviewed and uploaded independently.

## Publishing check

1. Upload only `proofrestore-demo-final.mp4` as the video.
2. Attach `proofrestore-demo-captions.srt` as English captions on the host.
3. Confirm audio plays and CC can be toggled on the host's transcoded copy.
4. Confirm the runtime remains below two minutes.
5. Add the public URL to Devpost and the submission checklist.
