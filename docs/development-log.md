# Development log

## 2026-07-18

- Inspected the seed repository, execution brief, product spec, demo draft, story draft, and submission checklist.
- Found no existing app or Git repository; initialized a strict, deployment-ready Next.js foundation.
- Established non-overlapping agent ownership for schema/architecture, deterministic engine/tests, and demo fixtures.
- Implemented a version `1.0` manifest contract with strict Zod parsing, UTC timestamp normalization, safe relative paths, duplicate detection, bounded collections, expiry-reference validation, and a 5 MiB parsing limit.
- Implemented the trusted TypeScript core: exact and point-in-time snapshot selection, case-sensitive normalized path resolution, recursive folder selection, availability/hash/size integrity checks, destination actions, byte totals, request verdicts, stable evidence, and retention risk.
- Added the readable eight-snapshot demo vault. It contains the verified Tuesday thesis, later silent corruption, a missing presentation object after a reported-success job, an expiring final healthy tax-return copy, a partially recoverable project folder, a newer destination conflict, and an identical destination file.
- Added the complete client flow: welcome, manifest import, vault dashboard, file search, version timeline, constrained recovery request, deterministic verdict, dry-run plan, evidence viewer, and downloadable Markdown proof report.
- Added the optional server-side OpenAI Responses API interpreter with strict structured output, candidate-path enforcement, an eight-second timeout, minimal request context, and deterministic fallback. The UI uses this endpoint, while model access requires an explicit opt-in and the core flow remains functional without a key.
- Added security handling for malformed manifests, unsafe traversal, oversized input, HTML/Markdown controls in reports, and imported content rendered only as text.

### Codex collaboration

- The lead agent inspected the seed, established boundaries, initialized the application, integrated all work, and owned the final build and product verification.
- The schema and architecture agent owned manifest contracts, validation, architecture, and the edge-case catalog.
- The recovery agent owned pure deterministic selection, integrity, planning, evidence, retention behavior, and adversarial engine tests.
- The demo-data agent owned the built-in vault, scenario constants, and fixture validation tests, then completed the submission documentation pass.
- Work used non-overlapping file ownership in a shared repository; the lead reviewed and validated integrated results.

### Verification milestones

- The exact demo integration now proves: demo vault → thesis path → Tuesday 19:00 UTC → `snapshot-2026-07-14-1730` → verified object/hash/size → fully recoverable → deterministic conflict-aware plan.
- The Vitest suite passes all **66** unit and integration tests.
- Formatting, lint, strict type checking, and the Next.js 15.5.20 production build pass in the final validation chain.
- The Playwright Chromium suite passes **8/8**, covering the critical demo through report download, valid and malformed imports, the no-key API fallback, responsive viewport checks, partial-folder failure presentation, stale-result invalidation, and desktop/mobile Recovery Lab use.
- `npm audit` reports only transitive moderate PostCSS advisories with no currently available non-breaking remediation.

### Final fixes and decisions

- Aligned the fixed Tuesday-evening request with the no-key interpreter’s 19:00 UTC interpretation.
- Kept later corrupt versions in the timeline while selecting the last eligible healthy historical version for the requested time.
- Modeled the missing presentation as a catalog reference with no stored object, allowing the validator to accept the manifest while the recovery engine correctly fails integrity.
- Separated data recoverability from destination safety: the thesis bytes are fully recoverable, while original-location simulation reports a conflict with a newer destination copy.
- Kept the report deterministic and safely escaped; model-generated prose is not required.
- Excluded `tests/e2e/` from Vitest discovery so Playwright owns the browser spec and the two test runners remain isolated.

### Submission preparation

- Three read-only subagent audits reviewed submission copy, release engineering/security, and UX/media readiness; the lead agent verified and integrated the actionable findings.
- Rehearsed the documented setup from a fresh local clone: `npm ci`, formatting, lint, typecheck, 66 tests, and the production build all pass.
- Added GitHub Actions validation, Node/npm project metadata, a favicon, Open Graph/Twitter metadata, and a reproducible Playwright screenshot-capture script.
- Captured a 1500×1000 cover plus dashboard, result, simulation/evidence, and report screenshots at 1600×900.
- Corrected hard-coded dashboard claims for imported manifests, changed the initial restore-test status to **Not run**, added keyboard-operable import buttons, exposed selected-file state, and moved focus to new recovery results.
- Added a 64 KiB interpreter request limit and made credentialed model use require `ENABLE_OPENAI_INTERPRETER=true`; public no-key demos remain safe and deterministic.

### Guided experience redesign

- Replaced the expanding dashboard with a four-stage guided workspace: vault health, recovery request, restore simulation, and proof report.
- Added explicit safe-copy/original-location, exact recovery-point, and recursive-folder controls; safe copy is the default and input changes invalidate stale plans and reports.
- Separated the content verdict from restore-plan safety, added request/path/snapshot/destination provenance, and made verdict styling deterministic for verified, partial, and failed outcomes.
- Added focus management, a skip link, one concise live region, 44 px targets, reduced-motion handling, mobile overflow coverage, and scoped imported-manifest status language.
- Regenerated the cover, Open Graph art, and six submission screenshots from the production build.
- Recorded a paced 1:17 demo as silent WebM and narrated MP4, with the narration track and source script retained for editing.
- Three independent read-only agents supplied the guided-flow specification, adversarial accessibility/trust review, and release/video audit; the lead inspected and integrated their recommendations.
- Linked the repository to the `proofrestore` Vercel project, deployed the deterministic no-key build, and verified the public homepage and interpreter fallback at `https://proofrestore.vercel.app`.

### Responsive interface correction

- Replaced the fixed-height, clipped recovery-point timeline with a natural-height request workspace, a concise request-time choice, and an expandable exact-snapshot picker.
- Corrected shared component selector drift so status pills, verification facts, action groups, disclosures, and headings receive their intended hierarchy and semantic colors.
- Removed nested scrolling from the recovery workflow and report, added sticky-header scroll clearance, and made the investigation workspace stack before it becomes cramped.
- Reduced dashboard and result clutter, hid empty simulation groups, preserved restore-action labels on mobile, and corrected partial/unavailable simulations so they cannot appear as green success.
- Regenerated every checked-in submission screenshot and added browser assertions for clipping, target sizes, exact-snapshot readability, and unavailable-item visibility.

### Narrated demo correction

- Expanded the walkthrough to 1:48 so every click and deterministic decision is narrated in sequence, including exact snapshot history, destination selection, simulation, evidence, and report download.
- Replaced the system narration with a natural AI-generated neural voice and added an explicit on-screen disclosure.
- Added a rendered high-contrast pointer plus click pulses because headless browser recordings do not include the operating-system cursor.
- Embedded a default selectable English caption track in the H.264 video and retained the SRT sidecar for hosts that replace embedded subtitles.
- Normalized narration and exported 48 kHz stereo AAC audio for broad player compatibility.
- Fully decoded the MP4, measured its audio, inspected representative frames, and verified the embedded caption track against the SRT source.

### Hands-on Recovery Lab

- Added a separate Recovery Lab so anyone can choose their own files or folder, or load a safe built-in sample, without disrupting the concise guided demo.
- Implemented bounded local SHA-256 hashing, parent-directory synthesis, baseline and follow-up snapshots, virtual modification and deletion, stored-byte corruption, missing objects, and destination conflicts.
- Kept uploaded bytes entirely in browser memory, removed raw content from generated manifests, bypassed the interpretation endpoint for lab vaults, and displayed the limitation that same-origin baseline hashes are not independent provider proof.
- Reused the production Zod manifest boundary and deterministic recovery engine for every lab verdict, total, action, and evidence record.
- Added an ordered activity/evidence log, reset and export controls, and a direct handoff into the complete recovery investigation and proof-report workflow.
- Three independent agents reviewed the lab model, user-facing UX, and adversarial test cases; the lead integrated and verified their recommendations.

### Final integration and media pass

- Made repeated corruption injection fail safely instead of flipping the same byte back to its healthy value.
- Added separate Recovery Lab setup/safety and corruption/evidence gallery images.
- Re-cut an interim 1:45 demo with a warm conversational neural voice, selectable English captions, visible pointer/click pulses, and a concise hands-on Recovery Lab sequence; the superseded render was later removed.
- Documented the final voice, caption publishing step, and retained publication artifacts.
- Removed duplicate, obsolete, subtitle-free, permanently captioned, and large production intermediates after verifying the final MP4.

### Public release hardening and final video

- Replaced audience-specific video language with generic user language and rebuilt the recorder with seeded Bézier pointer paths, off-center clicks, human dwell timing, and smooth recorder-only scrolling.
- Reassembled and fully decoded a 2:20, 1600×900 H.264 final video with natural 48 kHz stereo narration and an optional embedded English caption track; added the rules-required Codex/GPT-5.6 development disclosure, inspected representative frames, and verified the embedded captions match the SRT source.
- Added the MIT license, `SECURITY.md`, `CONTRIBUTING.md`, CODEOWNERS, pull-request guidance, Dependabot, CodeQL, SHA-pinned Actions, and strict browser security headers.
- Pinned patched PostCSS 8.5.19 through the package override; `npm audit` now reports zero vulnerabilities.
