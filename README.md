# ProofRestore

**Know your backup will restore before you need it.**

ProofRestore verifies whether a backup can actually be recovered before disaster strikes. It analyzes snapshot history, validates referenced objects, checks hashes and sizes, simulates restore actions without touching real files, surfaces retention risk, and downloads an evidence-backed **Proof of Recoverability** report.

The product is built around one distinction:

> Backup success is not recovery success.

![ProofRestore dashboard showing completed backup status and at-risk recoverability](docs/assets/submission/cover-1500x1000.png)

The built-in synthetic vault demonstrates that distinction directly: the latest backup job reports success, while deterministic verification finds a corrupted thesis version, a missing presentation object, and a healthy financial document whose only copy is nearing expiry.

## Demo flow

The complete demo works without an OpenAI API key.

1. Open ProofRestore and click **Explore demo vault**.
2. Confirm the dashboard contrast: **Backup status — Completed** and **Recoverability status — At risk**.
3. Search for `Thesis-Final.docx` and select `Documents/University/Thesis-Final.docx`.
4. Keep the request **Can I recover my thesis from Tuesday evening?** and click **Verify recoverability**.
5. ProofRestore selects the latest eligible snapshot at or before Tuesday 19:00 UTC: `snapshot-2026-07-14-1730`.
6. Inspect the **Fully recoverable** verdict and verified object, hash, and size evidence.
7. Click **Run restore simulation**. The original-location plan surfaces the newer destination copy as a conflict without changing it.
8. Open **exact evidence**, then click **Generate proof report** to download `proof-of-recoverability.md`.

See [docs/demo-script.md](docs/demo-script.md) for the timed narration and fallback path.

## Architecture

ProofRestore is a stateless Next.js application with four deliberately separate layers:

- `app/manifest/` validates versioned JSON manifests with Zod, normalizes safe paths, rejects traversal, and applies size and collection limits.
- `app/recovery/` is the trusted core. Pure TypeScript logic selects snapshots, resolves paths, verifies integrity, determines restore actions, calculates totals, analyzes retention, and emits stable evidence.
- `app/interpret/` and `app/api/interpret/` interpret recovery language into constrained structured data. They never decide existence, integrity, safety, or the final verdict.
- `app/components/` presents the vault, timeline, recovery result, dry run, evidence, and report download. `app/reports/` renders the deterministic Markdown report.

```mermaid
flowchart LR
    A[Demo or imported manifest] --> B[Zod validation]
    B --> C[Deterministic recovery engine]
    Q[Natural-language request] --> I[Constrained interpreter]
    I --> C
    C --> E[Evidence-backed result]
    E --> S[Restore simulation]
    E --> R[Proof report]
```

More detail is available in [docs/architecture.md](docs/architecture.md), including the request sequence and security boundary.

## Deterministic trust boundary

Natural-language interpretation may identify an intent, candidate path, requested time, recursion preference, and destination mode. It may preserve ambiguity or request clarification.

Only deterministic code may decide:

- which snapshot is eligible;
- whether a path and object exist;
- whether availability, hashes, and sizes pass;
- whether an item is recoverable;
- whether a destination action is create, overwrite, skip, conflict, or unavailable;
- byte totals, retention risk, request verdicts, and evidence references.

The engine is read-only. It has no filesystem restore, overwrite, deletion, execution, provider connection, or destructive endpoint.

## OpenAI usage

The product UI sends recovery language through `POST /api/interpret`. By default the route uses the complete deterministic fallback. When both `OPENAI_API_KEY` is configured and `ENABLE_OPENAI_INTERPRETER=true`, it uses the OpenAI Responses API with a strict JSON schema. The route sends only the user query, a bounded list of valid path candidates, and a reference timestamp. It does not send the full manifest or object metadata, and it rejects a model-selected path outside the supplied candidates.

If model use is disabled, the key is missing, the request times out, or model output is malformed, the route returns the deterministic fallback interpreter. The main demo is intentionally independent of model availability. Public deployments should leave model use disabled unless they also add appropriate rate limits and spend controls.

## Local setup

Requirements:

- Node.js 20.17 or newer
- npm

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Environment variables are optional:

```bash
# Enables the server-side structured interpreter.
OPENAI_API_KEY=

# Explicit opt-in. Leave false for public no-key demos.
ENABLE_OPENAI_INTERPRETER=false

# Optional override; defaults to gpt-5-mini.
OPENAI_MODEL=gpt-5-mini

# Optional canonical deployment URL for social metadata.
NEXT_PUBLIC_SITE_URL=
```

Never expose `OPENAI_API_KEY` through a `NEXT_PUBLIC_` variable. The complete built-in flow runs with the key unset and model interpretation disabled.

## Validation

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The final repository passes formatting, lint, strict type checking, all 59 Vitest unit/integration tests, and the production build on Next.js 15.5.20. The same checks run in [GitHub Actions](.github/workflows/ci.yml).

The critical browser test requires a production build and Playwright Chromium:

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

The Chromium E2E suite passes 3/3. It covers the demo vault through thesis selection, Tuesday recovery, restore simulation, evidence expansion, and report download; valid and malformed manifest imports; the no-key API fallback; and a mobile viewport smoke test.

## Submission media

The checked-in capture script reproduces the cover and four gallery screenshots from the production build:

```bash
npm run build
npm run capture:submission
```

- [3:2 project cover](docs/assets/submission/cover-1500x1000.png)
- [Vault dashboard](docs/assets/submission/01-dashboard-1600x900.png)
- [Recovery result](docs/assets/submission/02-recovery-result-1600x900.png)
- [Restore simulation and evidence](docs/assets/submission/03-simulation-evidence-1600x900.png)
- [Proof report](docs/assets/submission/04-proof-report-1600x900.png)

## Manifest import

The import surface accepts a version `1.0` JSON manifest. Imported data is parsed as data only, rendered as React text, and never executed. Validation rejects malformed timestamps, duplicate IDs or paths, unsafe traversal, invalid entry shapes, unknown expiry references, and inputs beyond configured limits.

The full contract is defined in `app/types/manifest.ts` and `app/manifest/schema.ts`. The built-in readable example is `app/demo/vault.ts`.

## Deployment

ProofRestore is stateless and Vercel-compatible.

1. Push the repository to a Git provider and import it into Vercel.
2. Keep the standard Next.js build command, `npm run build`.
3. For the safest public demo, leave model use disabled. A credentialed deployment requires `OPENAI_API_KEY`, `ENABLE_OPENAI_INTERPRETER=true`, and appropriate rate-limit/spend protection.
4. Deploy, then exercise the no-key demo flow and, if configured, the interpreter endpoint.

For another Node host, run `npm install`, `npm run build`, and `npm run start`. No database, migrations, storage bucket, or background service is required.

## Known limitations

- ProofRestore reads versioned ProofRestore manifests; it does not connect to backup providers or arbitrary backup formats.
- Restore operations are simulations only. No file is ever restored or modified.
- There is no authentication, persistence, scheduling, multi-user workflow, or signed report.
- Retention findings use the expiry data represented in the manifest; they do not change provider policies.
- The OpenAI route is constrained to interpretation. Model use is explicitly opt-in, while the default UI path uses the same endpoint's deterministic fallback so the demo cannot depend on credentials or network access.
- Markdown is the downloadable report format; HTML/PDF export is not included in the MVP.
- The synthetic demo timestamps are fixed in UTC for reproducible results.
- `npm audit` reports transitive moderate PostCSS advisories with no currently available non-breaking remediation; application dependencies should be reviewed again before production use.

## Hackathon development note

ProofRestore was built as a focused OpenAI hackathon sprint in Codex. The lead agent established the architecture, integrated the product, and ran final validation. Independent subagents worked with non-overlapping ownership on the manifest schema and architecture, recovery engine and adversarial tests, deterministic demo dataset, UI and interpreter integration, and submission documentation. All recoverability claims remain backed by executable deterministic logic and tests rather than agent or model judgment.

**Backups should not require faith.**
