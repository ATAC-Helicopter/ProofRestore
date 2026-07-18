# ProofRestore demo script

Target runtime: **under two minutes**. The checked-in narrated cut is **1:45** and includes both the mandatory recovery proof and the hands-on Recovery Lab. Use the built-in vault and no API key for the most reliable recording.

## 0:00–0:08 — Set up the problem

**On screen:** ProofRestore welcome screen.

**Narration:**

> “Backup software tells us a job completed. But that green status does not prove our files can be recovered. ProofRestore verifies the recovery before the emergency.”

The checked-in narration uses the shorter equivalent in [demo-narration.txt](demo-narration.txt), which is the canonical spoken script.

Point to the hero: **Know your backup will restore before you need it.**

## 0:08–0:16 — Reveal hidden risk

**Click:** **Explore demo vault**.

**Expected result:** `Flavio's MacBook Backup` opens with eight snapshots. The central contrast reads:

- **Latest backup job — Completed**
- **Verified recoverability — At risk**

**Narration:**

> “This job reported success, but recoverability is at risk. Deterministic verification found integrity and retention problems that the job status missed.”

**Click:** **Check a file**.

## 0:16–0:29 — Find the thesis

The search is prefilled with `Thesis-Final.docx`.

**Click:** `Thesis-Final.docx` in the matching-file list, then select **Original location** so the dry run checks destination conflicts.

**Expected result:** The file timeline appears. Healthy historical versions are green; later corrupted versions are red. The request field reads:

> Can I recover my thesis from Tuesday evening?

**Narration:**

> “The latest thesis copy is corrupt, so I’ll ask for the Tuesday-evening version.”

## 0:29–0:40 — Prove the recovery point

**Click:** **Verify recoverability**.

**Expected result:**

- request resolved to `Documents/University/Thesis-Final.docx`;
- Tuesday evening interpreted as `2026-07-14 19:00 UTC`;
- latest eligible snapshot selected: `snapshot-2026-07-14-1730`;
- verdict: **Yes — this version is fully recoverable**;
- integrity: **verified**.

**Narration:**

> “The deterministic fallback interpreted the path and time for this no-key recording. Then trusted code selected the snapshot, found the stored object, checked its hash and size, and produced the verdict.”

## 0:40–0:47 — Run the safe restore simulation

**Click:** **Run restore simulation**.

**Expected result:** A simulation-only banner appears. The thesis is recoverable, but the original-location plan marks it as a **conflict** because the destination contains a newer, different file. No real file changes occur.

**Narration:**

> “Recoverability and overwrite safety are separate. The backup bytes are verified, while the dry run protects the newer destination copy by surfacing a conflict.”

**Click:** **Open exact evidence**.

Point to `snapshot_selected`, `path_found`, `object_found`, `hash_match`, `size_match`, and `destination_conflict` evidence.

## 0:47–1:00 — Inspect evidence and generate proof

**Click:** **Continue to proof report**, then **Generate and download Markdown report**.

**Expected result:** `proof-of-recoverability.md` downloads and a preview appears. It contains the request, recovery point, verdict, metrics, conflicts, restore plan, retention warnings, evidence appendix, methodology, and an explicit simulation statement.

**Narration:**

> “ProofRestore turns the dry run into a portable evidence report. Every claim traces to deterministic checks.”

## 1:00–1:22 — Let judges break a virtual backup

**Click:** **Exit vault**, then **Open recovery lab**.

**Expected result:** The lab states that selected files remain local and unchanged, and that its same-origin baseline is a controlled test rather than independent provider proof.

**Click:** **Use sample files**, keep **Corrupt stored copy**, then click **Apply to virtual vault** and **Run recovery check**.

**Expected result:** The ordered log records file hashing, snapshot creation, byte corruption, and deterministic verification. The result is **Unrecoverable** with `hash_mismatch` evidence.

## 1:22–1:45 — Close on the trust boundary

**Narration:**

> “Judges can choose their own files or folder, remove an object, create a conflict, export the manifest, or continue through the full workflow. Natural language interprets requests, but deterministic code decides recovery. Backups should not require faith.”

End on the footer: **Backups should not require faith.**

## Extended hands-on judge path

The timed video demonstrates sample loading and corruption. For deeper judging, return to **Open recovery lab**, choose files or a folder, and review the local-only safety statement. Add snapshots or simulate a modification/deletion, choose a target, then inject corruption, a missing object, or a destination conflict. Click **Run recovery check** and inspect the deterministic verdict beside the ordered activity/evidence log. **Export manifest** downloads the generated test vault; **Open in full workflow** continues through the standard investigation, simulation, evidence, and report screens.

## Exact click path

```text
Explore demo vault
→ Check a file
→ select Documents/University/Thesis-Final.docx
→ open exact snapshot history and show older versions
→ keep Use time from my request
→ choose Original location
→ Verify recoverability
→ Fully recoverable at snapshot-2026-07-14-1730
→ Run restore simulation
→ Open exact evidence
→ Continue to proof report
→ Generate and download Markdown report
→ Exit vault
→ Open recovery lab
→ Use sample files
→ Corrupt stored copy
→ Apply to virtual vault
→ Run recovery check
→ Unrecoverable with hash_mismatch and ordered evidence
```

## Recording preparation

- Run `npm run build` and `npm run start`.
- Use a clean Chromium window at 1440×900 or similar.
- Leave `OPENAI_API_KEY` unset for a deterministic recording.
- Keep `ENABLE_OPENAI_INTERPRETER=false` for the primary recording.
- Clear prior downloads so `proof-of-recoverability.md` is easy to identify.
- Keep browser zoom at 100%; the automated recorder renders a high-contrast pointer and click pulse into the page.
- Rehearse once with the network disconnected; the primary flow should be unchanged.
- To reproduce the checked-in media after a production build, run `npm run capture:submission`, `npm run record:demo`, regenerate narration as documented, and run `npm run assemble:demo`.
- The publication MP4, silent WebM, neural narration MP3, SRT captions, and source text live in `docs/assets/submission/` and `docs/demo-narration.txt`.
- Use only `proofrestore-demo-final.mp4` for submission. Attach `proofrestore-demo-captions.srt` separately on the host and verify that CC remains toggleable after transcoding. See [media-production.md](media-production.md).

## Fallback plan

If natural-language interpretation does not resolve the request, leave the search as `Thesis-Final.docx`, select the exact path manually, keep the supplied Tuesday-evening prompt, and click **Verify recoverability** again. The no-key fallback maps Tuesday evening to 19:00 UTC using the manifest’s fixed reference time.

If report download is blocked by recording-browser permissions, show the in-page report preview. If the optional OpenAI route is unavailable, continue without it; no verdict or restore-plan behavior depends on that route.

If a visual or browser issue appears during recording, reload and repeat the exact click path. The built-in manifest, timestamps, hashes, destination state, and outputs are fixed.
