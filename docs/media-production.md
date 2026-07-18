# Submission media production

The publication artifact is `docs/assets/submission/proofrestore-demo-final.mp4`. It contains the visible pointer/click pulses, natural neural narration, normalized stereo audio, and a default selectable English caption track. Upload `proofrestore-demo-captions.srt` separately to the video host because some services discard embedded MP4 subtitles while transcoding.

## Rebuild the visual recording

```bash
npm run build
npm run record:demo
```

The recorder starts the production application, captures the complete demo and Recovery Lab path at 1600×900, and writes `proofrestore-demo-silent.webm`. It renders its own high-contrast pointer and click pulse because headless recordings do not contain the operating-system cursor.

## Rebuild the natural narration

The checked-in narration was generated with Microsoft Edge neural text-to-speech using:

- voice: `en-US-AndrewMultilingualNeural`;
- rate: `+10%`;
- source: `docs/demo-narration.txt`.

Install the `edge-tts` Python package in an isolated environment, then run:

```bash
python3 -m edge_tts \
  --file docs/demo-narration.txt \
  --voice en-US-AndrewMultilingualNeural \
  --rate=+10% \
  --write-media docs/assets/submission/proofrestore-narration-neural.mp3
```

The curated SRT remains checked in separately so caption wording, line length, timing, and the AI-narration disclosure can be reviewed before publication.

## Assemble the publication MP4

Install ffmpeg or point `FFMPEG_PATH` at an ffmpeg executable, then run:

```bash
npm run assemble:demo
```

The script encodes H.264 video, normalizes narration to a target of −16 LUFS with a −1.5 dB true-peak ceiling, exports 48 kHz stereo AAC, embeds the SRT as a default English `mov_text` track, and enables MP4 fast start.

## Publishing check

1. Upload only `proofrestore-demo-final.mp4` as the video.
2. Attach `proofrestore-demo-captions.srt` as English captions on the host.
3. Confirm audio plays and CC can be toggled on the host's transcoded copy.
4. Confirm the runtime remains below two minutes.
5. Add the public URL to Devpost and the submission checklist.
