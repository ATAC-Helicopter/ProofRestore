# ProofRestore execution plan

## Current phase

Phase 6 in progress — redesigned submission package deployed; final Devpost publication pending.

## Completed

- Read the execution brief and all seed documentation.
- Confirmed the repository contains no application code or Git metadata.
- Selected a strict Next.js, TypeScript, Tailwind, Zod, Vitest, and Playwright foundation.
- Added the versioned manifest types, Zod validation, safe path normalization, byte limits, and malformed-import handling.
- Built the framework-independent recovery engine for snapshot selection, recursive path resolution, object/hash/size verification, restore planning, evidence, totals, and retention analysis.
- Created the fixed eight-snapshot `Flavio's MacBook Backup` fixture covering every required healthy and adversarial scenario.
- Proved the exact no-key Tuesday-evening thesis path with an integration test.
- Built the responsive welcome, vault health, search, timeline, recovery result, simulation, evidence, manifest import, and Markdown report flow.
- Added the constrained Responses API interpreter and deterministic timeout/no-key/malformed-output fallback.
- Added unit and integration coverage across manifests, interpretation, recovery, fixtures, retention, evidence, and reports.
- Confirmed all 59 Vitest tests and the production build pass.
- Confirmed formatting, lint, strict type checking, and the Next.js 15.5.20 production build pass in the final chain.
- Confirmed the Playwright Chromium suite passes 6/6, covering the mandatory flow, imports, no-key fallback, responsive clipping at four viewports, partial-folder failure presentation, and stale-result invalidation.
- Added architecture, edge-case, setup, deployment, demo, and submission documentation.
- Rehearsed setup from a fresh local clone with `npm ci`, full static checks, tests, and a production build.
- Added CI, Node/npm metadata, favicon/social metadata, and reproducible submission-media capture.
- Rebuilt the interface as a focused four-stage workflow: health, recovery request, restore simulation, and proof report.
- Made safe copy the default destination, exposed exact snapshot and recursion controls, separated content recoverability from restore safety, and added deterministic provenance to results.
- Captured the 3:2 cover and six gallery states from the production flow.
- Recorded a 1:17 narrated 1600×900 MP4 plus editable silent WebM, AIFF narration, and narration script.
- Deployed the safe deterministic build to https://proofrestore.vercel.app and smoke-tested its homepage and no-key interpreter endpoint.
- Prepared the public repository at https://github.com/ATAC-Helicopter/ProofRestore.
- Replaced imported-vault status claims with deterministic dashboard analysis and made restore-test timing truthful.
- Routed the UI through the constrained interpreter endpoint while keeping model use explicit opt-in with a safe fallback.
- Reworked the full interface hierarchy, replaced the clipped fixed-height recovery selector, removed nested scrolling, corrected semantic status styling, and regenerated the submission gallery.

## In progress

- External submission work: publish the video, upload media, and finish the Devpost fields.

## Next

- Verify imports and report download again after deployment.
- Add the final public repository, deployment, video, and image links.

## Decisions

- Recovery decisions remain in pure framework-independent TypeScript.
- The app has no database and performs no real restore writes.
- Demo timestamps are fixed UTC values; Tuesday evening means the latest eligible snapshot at or before the fixed request time.
- Natural-language parsing has a deterministic no-key fallback.
- The primary UI uses the constrained server endpoint; it defaults to deterministic interpretation and only enables Responses API structured interpretation through an explicit server-side opt-in.
- Reports use an escaped deterministic Markdown template and state explicitly that no restore occurred.
- The MVP remains stateless and Vercel-compatible, with no provider integration, database, authentication, or destructive operation.

## Risks

- API-key behavior needs one final credentialed smoke test; it is not required for the no-key demo.
- Deployment, public video/gallery upload, and final Devpost entry remain external release tasks.
- `npm audit` reports only transitive moderate PostCSS advisories and currently offers no non-breaking remediation; recheck before production use.

## Blocked items

- Credentialed Responses API smoke testing requires a user-supplied key and explicit model-use opt-in.
- Gallery/video hosting, category, license choice, and final Devpost fields require external account actions or final user choices.
