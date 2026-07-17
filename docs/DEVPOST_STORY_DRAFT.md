# Devpost project story — submission draft

> Implementation claims below reflect the verified repository. Add public links, media, and any challenge-specific fields in Devpost before submission.

## Inspiration

A green “backup completed” badge creates confidence, but it does not answer the question that matters during an emergency: **can the files actually be restored?**

ProofRestore was inspired by hands-on experience building backup software and seeing how difficult it is for users to verify recovery before something goes wrong. Backups should not require faith. They should provide evidence.

## What it does

ProofRestore analyzes backup snapshots and verifies whether a selected file or folder can actually be recovered at a chosen point in time.

A user can ask a question such as:

> Can I recover my thesis from Tuesday evening?

ProofRestore identifies the relevant path and recovery point, then a deterministic engine checks the referenced objects, hashes, sizes, snapshot state, destination conflicts, and retention risks. The user can run a safe restore simulation without modifying any real files and inspect the evidence behind every result.

The application distinguishes between:

- a backup job reporting success;
- the underlying data being verifiably recoverable.

It can detect missing objects, silent corruption, incomplete folder recovery, overwrite conflicts, and healthy copies that may soon be removed by retention rules. It then produces a shareable **Proof of Recoverability** report.

## How we built it

ProofRestore is designed around a strict trust boundary.

The optional OpenAI-powered layer interprets natural-language recovery requests into constrained structured data. It is not allowed to decide whether a file exists or is recoverable. If the API key is absent, the request times out, or output is malformed, a deterministic interpreter preserves the complete demo flow.

A deterministic TypeScript recovery engine performs:

- snapshot selection;
- path and version resolution;
- object availability checks;
- hash and size verification;
- recursive folder analysis;
- destination conflict detection;
- restore-plan generation;
- retention-risk analysis;
- final recoverability verdicts;
- evidence generation.

The application is built with Next.js, strict TypeScript, Tailwind CSS, Zod, the OpenAI Responses API, Vitest, and Playwright. It is stateless, requires no database, and is ready for a conventional Vercel deployment.

Codex was the primary development environment. A lead agent coordinated architecture, integration, validation, and scope while independent subagents owned the manifest schema, deterministic engine and tests, demo fixture, and documentation through non-overlapping files.

## Challenges we faced

The hardest challenge was preserving a real trust boundary while still making natural-language recovery useful. A model can interpret “my thesis from Tuesday evening,” but letting it infer whether an object exists or a hash matches would undermine the product. We designed a narrow structured handoff: interpretation proposes a candidate path and time, then pure TypeScript recomputes every consequential decision.

Recovery is also more nuanced than a single green or red badge. We had to distinguish object integrity from restore safety. A version can be fully recoverable while still conflicting with a newer destination file. A folder can be partially recoverable because one child is healthy and another references a missing object. Retention risk requires asking whether a different healthy copy survives an expiry, not merely whether a snapshot has an expiry date.

The final challenge was making these technical distinctions legible within a two-minute demo. Stable evidence codes, compact status hierarchy, a fixed adversarial fixture, and a deterministic downloadable report let the UI stay concise without asking the audience to trust an unexplained verdict.

## Accomplishments that we're proud of

- A complete recovery-verification flow that works without an API key or network access.
- Evidence-backed verdicts where every snapshot, path, integrity, destination, and retention claim comes from deterministic code.
- A safe restore simulation that never writes, overwrites, deletes, or executes real data.
- A realistic eight-snapshot demo where successful jobs hide corruption, a missing object, destination conflict, partial folder recovery, and expiry risk.
- An escaped Proof of Recoverability report with metrics, plan, warnings, methodology, and evidence appendix.
- A green final validation chain: formatting, lint, strict type checking, 57 unit/integration tests, a Next.js production build, and 3/3 Chromium E2E tests covering the demo, imports, fallback behavior, and mobile layout.

## What we learned

The most useful AI boundary is not “AI versus no AI”; it is interpretation versus authority. Natural language improves access to the system, while deterministic verification preserves trust. Structured outputs and valid path candidates reduce ambiguity, but all model output still has to be treated as an input rather than a verdict.

We also learned that evidence changes the UX. A status becomes much more credible when the user can open the exact object, hash, size, destination, and snapshot facts behind it. At the same time, evidence needs a hierarchy: the dashboard communicates risk, the plan communicates impact, and the appendix preserves technical traceability.

Finally, backup completion is a statement about a job, not the future ability to recover. Verification must test the referenced data and the intended recovery point independently.

## What's next for ProofRestore

- adapters for real backup formats and providers;
- scheduled restore simulations;
- integration with VaultSync and other backup tools;
- isolated test restores into disposable environments;
- signed recovery reports;
- team and compliance workflows;
- continuous recoverability monitoring.
