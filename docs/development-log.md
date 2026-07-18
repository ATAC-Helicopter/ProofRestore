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
- The Vitest suite passes all **59** unit and integration tests.
- Formatting, lint, strict type checking, and the Next.js 15.5.20 production build pass in the final validation chain.
- The Playwright Chromium suite passes **4/4**, covering the critical demo through report download, valid and malformed imports, the no-key API fallback, mobile overflow, and stale-result invalidation.
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
- Rehearsed the documented setup from a fresh local clone: `npm ci`, formatting, lint, typecheck, 59 tests, and the production build all pass.
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
