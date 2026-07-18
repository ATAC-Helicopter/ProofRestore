# ProofRestore demo script

Target runtime: **1:15–1:30**. The checked-in narrated cut is **1:17**. Use the built-in vault and no API key for the most reliable recording.

## 0:00–0:08 — Set up the problem

**On screen:** ProofRestore welcome screen.

**Narration:**

> “Backup software tells us a job completed. But that green status does not prove our files can be recovered. ProofRestore verifies the recovery before the emergency.”

Point to the hero: **Know your backup will restore before you need it.**

## 0:08–0:20 — Reveal hidden risk

**Click:** **Explore demo vault**.

**Expected result:** `Flavio's MacBook Backup` opens with eight snapshots. The central contrast reads:

- **Latest backup job — Completed**
- **Verified recoverability — At risk**

**Narration:**

> “This job reported success, but recoverability is at risk. Deterministic verification found integrity and retention problems that the job status missed.”

**Click:** **Check a file**.

## 0:20–0:35 — Find the thesis

The search is prefilled with `Thesis-Final.docx`.

**Click:** `Thesis-Final.docx` in the matching-file list, then select **Original location** so the dry run checks destination conflicts.

**Expected result:** The file timeline appears. Healthy historical versions are green; later corrupted versions are red. The request field reads:

> Can I recover my thesis from Tuesday evening?

**Narration:**

> “The latest thesis copy is corrupt, so I’ll ask for the Tuesday-evening version.”

## 0:35–0:48 — Prove the recovery point

**Click:** **Verify recoverability**.

**Expected result:**

- request resolved to `Documents/University/Thesis-Final.docx`;
- Tuesday evening interpreted as `2026-07-14 19:00 UTC`;
- latest eligible snapshot selected: `snapshot-2026-07-14-1730`;
- verdict: **Yes — this version is fully recoverable**;
- integrity: **verified**.

**Narration:**

> “The deterministic fallback interpreted the path and time for this no-key recording. Then trusted code selected the snapshot, found the stored object, checked its hash and size, and produced the verdict.”

## 0:48–1:03 — Run the safe restore simulation

**Click:** **Run restore simulation**.

**Expected result:** A simulation-only banner appears. The thesis is recoverable, but the original-location plan marks it as a **conflict** because the destination contains a newer, different file. No real file changes occur.

**Narration:**

> “Recoverability and overwrite safety are separate. The backup bytes are verified, while the dry run protects the newer destination copy by surfacing a conflict.”

**Click:** **Open exact evidence**.

Point to `snapshot_selected`, `path_found`, `object_found`, `hash_match`, `size_match`, and `destination_conflict` evidence.

## 1:03–1:13 — Generate proof

**Click:** **Continue to proof report**, then **Generate and download Markdown report**.

**Expected result:** `proof-of-recoverability.md` downloads and a preview appears. It contains the request, recovery point, verdict, metrics, conflicts, restore plan, retention warnings, evidence appendix, methodology, and an explicit simulation statement.

**Narration:**

> “ProofRestore turns the dry run into a portable evidence report. Every claim traces to deterministic checks.”

## 1:13–1:17 — Close on the trust boundary

**Narration:**

> “ProofRestore also includes an optional OpenAI Responses API endpoint for constrained request interpretation. Whether that endpoint or the no-key fallback interprets the request, it never decides whether data exists or is recoverable. That authority stays in tested deterministic TypeScript. Backups should not require faith.”

End on the footer: **Backups should not require faith.**

## Exact click path

```text
Explore demo vault
→ Check a file
→ select Documents/University/Thesis-Final.docx
→ choose Original location
→ Verify recoverability
→ Fully recoverable at snapshot-2026-07-14-1730
→ Run restore simulation
→ Open exact evidence
→ Continue to proof report
→ Generate and download Markdown report
```

## Recording preparation

- Run `npm run build` and `npm run start`.
- Use a clean Chromium window at 1440×900 or similar.
- Leave `OPENAI_API_KEY` unset for a deterministic recording.
- Keep `ENABLE_OPENAI_INTERPRETER=false` for the primary recording.
- Clear prior downloads so `proof-of-recoverability.md` is easy to identify.
- Keep browser zoom at 100% and the pointer visible.
- Rehearse once with the network disconnected; the primary flow should be unchanged.
- To reproduce the checked-in media after a production build, run `npm run capture:submission` and `npm run record:demo`.
- The narrated MP4, silent WebM, AIFF narration, and source text live in `docs/assets/submission/` and `docs/demo-narration.txt`.

## Fallback plan

If natural-language interpretation does not resolve the request, leave the search as `Thesis-Final.docx`, select the exact path manually, keep the supplied Tuesday-evening prompt, and click **Verify recoverability** again. The no-key fallback maps Tuesday evening to 19:00 UTC using the manifest’s fixed reference time.

If report download is blocked by recording-browser permissions, show the in-page report preview. If the optional OpenAI route is unavailable, continue without it; no verdict or restore-plan behavior depends on that route.

If a visual or browser issue appears during recording, reload and repeat the exact click path. The built-in manifest, timestamps, hashes, destination state, and outputs are fixed.
