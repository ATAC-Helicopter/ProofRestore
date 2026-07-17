# ProofRestore — Codex Execution Brief

## Mission

Build **ProofRestore**, a polished OpenAI hackathon project that proves whether a backup can actually be recovered before disaster strikes.

The product must analyze backup history, verify integrity, simulate a restore without modifying real files, detect hidden failures and retention risks, and generate an evidence-backed **Proof of Recoverability** report.

Time is extremely limited. Treat this as a focused product sprint:

- Core product complete within roughly 48 hours
- Remaining time reserved for testing, fixing, polishing, deployment, demo recording, and submission
- Reject scope creep
- Do not stop at planning: inspect, implement, run, test, fix, and verify

---

## Product identity

**Name:** ProofRestore

**Tagline:** Know your backup will restore before you need it.

**Elevator pitch:**

> ProofRestore verifies whether backups can truly be recovered, simulates restores safely, detects hidden failures, and produces evidence-backed proof before disaster strikes.

**Core message:**

> Backup success is not recovery success.

---

## Lead-agent behavior

Act as the principal engineer and execution lead.

Use GPT-5.6 Sol for:

- architecture
- critical implementation
- deterministic recovery logic
- integration
- difficult debugging
- final review

Use subagents aggressively for independent work, preferably in isolated worktrees or clearly separated file ownership.

Suitable subagent assignments:

1. Manifest schema and architecture
2. Deterministic recovery engine
3. Demo dataset and fixtures
4. Product UI
5. OpenAI integration
6. Tests and adversarial review
7. Accessibility and UX review
8. Documentation and submission readiness

The lead agent must:

- inspect every subagent result
- prevent overlapping edits
- integrate changes
- resolve conflicts
- run all validation commands
- reject weak or incomplete work
- keep the project within scope

Do not ask unnecessary questions. Make sensible documented decisions unless blocked by credentials, secrets, or destructive actions.

---

## Required user experience

The primary demo flow must work reliably:

1. User opens ProofRestore
2. User clicks **Explore demo vault**
3. Dashboard shows:
   - **Backup status: Completed**
   - **Recoverability status: At risk**
4. User searches for `Thesis-Final.docx`
5. User asks:
   - “Can I recover my thesis from Tuesday evening?”
6. ProofRestore resolves:
   - the file path
   - the requested point in time
   - the correct snapshot
7. Deterministic code verifies:
   - object availability
   - hash integrity
   - version eligibility
   - conflicts
8. User runs a restore simulation
9. Product shows:
   - files to restore
   - files to overwrite
   - files to skip
   - unavailable files
   - warnings
   - total recoverable size
10. User opens exact evidence for the verdict
11. User generates a **Proof of Recoverability** report
12. Demo ends with:

- **Backups should not require faith.**

The full demo path should fit comfortably within two minutes.

---

## Trust boundary

This is non-negotiable.

### AI may

- interpret natural-language recovery requests
- extract likely paths and dates
- preserve ambiguity
- ask for clarification when genuinely required
- summarize deterministic results
- explain technical findings
- generate report prose from verified result data

### AI must never decide

- whether a file exists
- whether an object is available
- whether a hash matches
- whether a snapshot is valid
- whether a file is recoverable
- which restore action is safe
- whether the overall request succeeds

### Deterministic code must decide

- snapshot selection
- path resolution
- object availability
- hash validation
- size consistency
- restore actions
- conflicts
- retention risks
- byte totals
- item-level verdicts
- request-level verdict
- evidence references

Every claim shown in the UI must trace back to deterministic evidence.

---

## MVP scope

### Build

- polished welcome screen
- built-in realistic demo vault
- JSON manifest import
- manifest validation
- vault health dashboard
- snapshot history
- file search
- historical version timeline
- point-in-time recovery
- deterministic recoverability engine
- restore dry run
- integrity findings
- retention-risk findings
- evidence viewer
- optional natural-language request parsing
- manual fallback controls
- Proof of Recoverability report
- responsive UI
- tests
- deployment-ready configuration
- README
- architecture documentation
- sample environment file

### Do not build

- authentication
- billing
- database unless absolutely necessary
- actual destructive restoration
- cloud-provider integrations
- background daemons
- encryption
- multi-user collaboration
- mobile-native clients
- browser extensions
- VaultSync integration
- arbitrary backup-provider compatibility
- production-scale upload infrastructure
- internal multi-agent framework inside the product
- features that do not improve the hackathon demo

---

## Recommended stack

Unless the repository already has a strong compatible foundation, use:

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- Zod
- OpenAI Responses API
- Vitest
- React Testing Library where useful
- Playwright for one critical end-to-end flow if time permits
- no database
- Vercel-compatible deployment

Keep dependencies minimal.

---

## Suggested repository structure

```text
app/
  api/
    interpret/
  components/
  demo/
  recovery/
  reports/
  types/
  utils/

tests/
  fixtures/
  recovery/
  integration/

docs/
  plan.md
  development-log.md
  demo-script.md
  architecture.md

public/
```

Adjust to the actual framework, but preserve clear separation between:

- deterministic engine
- UI
- AI layer
- demo fixtures
- reports
- tests

---

## Manifest model

Create a versioned schema.

### VaultManifest

- `schemaVersion`
- `vaultId`
- `vaultName`
- `generatedAt`
- `source`
- `snapshots`
- `objects`
- `retentionPolicy`
- optional `destinationState`

### Snapshot

- `id`
- `createdAt`
- `completedAt`
- `status`: `complete | partial | failed`
- `jobReportedSuccess`
- `files`
- `warnings`
- `metadata`

### SnapshotFile

- `path`
- `type`: `file | directory`
- `size`
- `modifiedAt`
- `expectedHash`
- `objectId`
- optional `tags`

### StoredObject

- `id`
- `observedHash`
- `size`
- `availability`: `available | missing | corrupted`
- `storageLocation`
- `verificationTimestamp`

### RetentionPolicy

- `mode`
- `keepLast`
- `keepDaily`
- `keepWeekly`
- explicit or derived expiry data

### DestinationState

Used for dry-run conflict analysis:

- path
- current hash
- current size
- modified timestamp

Use UTC internally and ISO 8601 timestamps.

---

## Demo vault

Create a built-in vault named:

**Flavio's MacBook Backup**

Use synthetic, non-sensitive content.

Include at least six snapshots across several days.

Include paths such as:

```text
Documents/
Documents/University/
Documents/University/Thesis-Final.docx
Documents/University/Research-Notes.md
Pictures/
Projects/
Projects/Client-Presentation.pptx
Desktop/
Finance/
```

Required scenarios:

### A. Successful recovery

`Thesis-Final.docx` has multiple historical versions.

A valid Tuesday-evening version must be fully recoverable.

### B. Silent corruption

A later file version references an object whose observed hash differs from the expected hash.

### C. Missing object

A snapshot reports success but references an object that does not exist.

### D. Retention risk

The last healthy copy of one important file is scheduled to expire soon.

### E. Partial folder recovery

A folder is mostly recoverable, but at least one child is unavailable.

### F. Overwrite conflict

The restore destination contains a newer or different version of at least one selected file.

### G. Misleading success

At least one backup job reports success while recoverability analysis finds a real problem.

The dataset must be deterministic, readable, and covered by tests.

---

## Deterministic recovery engine

Implement the trusted core as framework-independent TypeScript modules using pure functions where practical.

### Snapshot selection

Support:

- exact snapshot ID
- latest snapshot at or before requested time
- closest eligible snapshot
- explicit failure when no eligible snapshot exists

### Path resolution

Support:

- exact file path
- normalized separators
- documented case sensitivity
- folder-recursive recovery
- safe path validation
- rejection of dangerous traversal paths

### Integrity evaluation

For each file, verify:

- referenced object exists
- object is available
- expected hash is present
- observed hash matches expected hash
- size matches where available

### Item verdicts

Use a clear enum such as:

- `verified`
- `recoverable_with_warning`
- `unavailable`
- `corrupted`
- `unknown`

### Request verdicts

Use:

- `fully_recoverable`
- `partially_recoverable`
- `unrecoverable`

### Restore actions

Use:

- `create`
- `overwrite`
- `skip_identical`
- `conflict`
- `unavailable`
- `create_directory`

### Evidence model

Every decision must produce evidence entries.

Suggested codes:

- `snapshot_selected`
- `snapshot_not_found`
- `path_found`
- `path_not_found`
- `object_found`
- `object_missing`
- `object_unavailable`
- `hash_match`
- `hash_mismatch`
- `size_match`
- `size_mismatch`
- `destination_identical`
- `destination_conflict`
- `retention_expiry`
- `healthy_copy_survives`
- `last_healthy_copy_at_risk`

Each evidence item should include:

- stable ID
- code
- severity
- concise message
- referenced entities
- supporting values

### Totals

Calculate:

- selected items
- recoverable items
- unavailable items
- conflicts
- selected bytes
- recoverable bytes
- operation count

### Retention analysis

Determine:

- last known healthy version
- scheduled expiry
- whether another healthy copy survives
- urgency level

### Safety

The engine must never write, overwrite, delete, restore, or execute anything.

It only returns plans and reports.

---

## OpenAI integration

Implement an optional server-side natural-language interpreter.

It must convert requests such as:

- “Can I recover my thesis from Tuesday evening?”
- “Restore Documents as it looked before yesterday's failed sync.”
- “Which important files are no longer recoverable?”
- “Show what would be overwritten.”
- “Can I get the presentation back from July 15?”

into structured output.

Suggested shape:

```ts
type InterpretedRecoveryRequest = {
  intent:
    | "recover_path"
    | "find_unrecoverable"
    | "show_conflicts"
    | "inspect_history";
  pathQuery?: string;
  resolvedPath?: string;
  requestedDateTime?: string;
  dateInterpretation?: string;
  includeChildren: boolean;
  destinationMode: "safe_copy" | "original_location";
  needsClarification: boolean;
  clarificationQuestion?: string;
};
```

Rules:

- use structured outputs
- never let the model return a recoverability verdict
- provide only valid path candidates when possible
- preserve ambiguity
- do not fabricate paths
- do not expose API keys
- send minimal data
- implement timeout handling
- implement malformed-response handling
- provide a complete no-key fallback
- the core demo must work without an API key

---

## Product screens

### 1. Welcome

Primary CTA:

**Explore demo vault**

Secondary CTA:

**Import backup manifest**

Hero:

**Know your backup will restore before you need it.**

Supporting copy:

**ProofRestore verifies backup history, simulates recovery, and shows the evidence behind every result.**

### 2. Vault health

Show the central contrast:

- **Backup completed**
- **Recoverability at risk**

Metrics:

- snapshots
- protected files
- verified files
- integrity issues
- retention risks
- last restore test

### 3. Recovery investigation

Large prompt:

**What do you need to recover?**

Provide examples and manual controls.

### 4. File timeline

Show historical versions with:

- timestamp
- snapshot status
- integrity
- size
- retention state
- recoverability

### 5. Recovery result

Show:

- overall verdict
- selected snapshot
- selected path
- integrity status
- copy count
- warnings
- evidence

### 6. Restore simulation

Group results into:

- Will restore
- Will overwrite
- Will skip
- Cannot recover
- Warnings

Primary CTA:

**Run restore simulation**

### 7. Proof report

Primary CTA:

**Generate proof report**

Support downloadable Markdown or HTML. Both are preferable if simple.

---

## Visual direction

The product should feel like a serious reliability and forensic tool.

Use:

- dark navy or near-black shell
- neutral surfaces
- clear status hierarchy
- restrained accent usage
- green only for verified evidence
- amber for risk
- red for confirmed failure
- compact technical details
- accessible contrast
- responsive layouts
- polished empty/loading/error states

Avoid:

- generic glowing AI gradients
- excessive glassmorphism
- decorative complexity
- slow animations
- marketing-heavy copy
- cluttered dashboards

Do not overuse the words:

- AI
- intelligent
- revolutionary
- agent

---

## Report requirements

Generate a **Proof of Recoverability** report with:

- title
- vault name
- generated timestamp
- original request
- selected recovery point
- overall verdict
- summary metrics
- recoverable files
- unavailable files
- conflicts
- integrity findings
- retention warnings
- restore plan
- evidence appendix
- methodology
- explicit statement that this is a simulation

The deterministic template is mandatory.

AI-generated prose is optional and may only summarize deterministic result data.

Escape all imported text safely.

---

## Tests

At minimum, test:

- exact snapshot selection
- latest snapshot before time
- request before earliest snapshot
- missing path
- successful historical file recovery
- missing object
- corrupted object
- matching hash
- mismatching hash
- recursive folder recovery
- partial folder recovery
- identical destination skip
- overwrite conflict
- total byte calculations
- final healthy copy retention risk
- healthy alternative copy surviving
- successful job with hidden recovery failure
- evidence IDs and evidence codes
- report generation
- malformed manifest rejection
- path traversal rejection

Use fixed timestamps and avoid locale-dependent behavior.

Add an integration test for:

```text
demo vault
→ Thesis-Final.docx
→ Tuesday evening
→ valid snapshot
→ fully recoverable
→ restore plan generated
```

Add one Playwright end-to-end test for the main demo path if setup remains lightweight.

---

## Security and privacy

- validate all imports
- limit upload size
- reject dangerous paths
- never execute imported content
- never read arbitrary local filesystem paths
- never expose environment variables
- do not send full manifests to OpenAI
- safely render imported strings
- prevent HTML injection
- sanitize or avoid raw HTML rendering
- document demo limitations

---

## Execution phases

### Phase 0 — Inspect and initialize

- inspect repository
- inspect git status
- identify existing stack
- preserve useful work
- initialize app if empty
- establish scripts
- enable strict TypeScript
- add `.env.example`
- create `docs/plan.md`
- create `docs/development-log.md`
- create `docs/demo-script.md`

### Phase 1 — Trusted core

- schema
- types
- demo dataset
- snapshot selection
- path resolution
- integrity evaluation
- restore planning
- evidence model
- retention checks
- unit tests

Exit condition:

Every demo scenario is proven by tests.

### Phase 2 — Complete deterministic product

- demo vault loading
- dashboard
- search
- timeline
- manual recovery controls
- verdict
- simulation
- evidence
- report

Exit condition:

The entire demo works with no OpenAI API key.

### Phase 3 — AI assistance

- Responses API route
- structured output
- natural-language parser
- fallback
- errors
- deterministic handoff

Exit condition:

AI interprets intent only.

### Phase 4 — Polish

- responsive design
- keyboard accessibility
- focus states
- loading states
- empty states
- error states
- concise copy
- visual cleanup

### Phase 5 — Verification

Run and fix:

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Also run the end-to-end test if configured.

Test:

- clean browser
- API-key path
- no-key path
- valid imported manifest
- malformed manifest
- full demo sequence

### Phase 6 — Submission readiness

Finish:

- README
- architecture documentation
- Mermaid diagram
- AI/deterministic boundary explanation
- setup instructions
- testing instructions
- known limitations
- screenshots checklist
- demo script
- development log
- deployment instructions

---

## Required documentation

### `docs/plan.md`

Maintain:

- current phase
- completed tasks
- next tasks
- risks
- decisions
- blocked items

### `docs/development-log.md`

Maintain:

- meaningful implementation milestones
- agent contributions
- major technical decisions
- testing milestones
- fixes
- Codex collaboration notes

### `docs/demo-script.md`

Maintain:

- exact click path
- narration
- expected result at each step
- timing target
- fallback plan

### README

Include:

- product overview
- problem
- solution
- architecture
- deterministic trust boundary
- OpenAI usage
- local setup
- environment variables
- test commands
- build command
- deployment
- demo flow
- limitations
- hackathon development note

---

## Agent ownership plan

Use non-overlapping ownership.

### Agent A — Schema and architecture

Own:

- manifest schema
- core types
- architecture document
- edge-case catalog

### Agent B — Recovery engine

Own:

- snapshot selection
- path resolution
- integrity checks
- restore planning
- verdict logic
- evidence
- retention
- engine tests

Use a high-capability model.

### Agent C — Demo dataset

Own:

- demo manifest
- fixtures
- scenario expectations
- fixture validation

### Agent D — UI

Own:

- welcome
- dashboard
- investigation flow
- timeline
- results
- simulation
- evidence viewer
- report screen

Do not modify engine internals without coordination.

### Agent E — OpenAI layer

Own:

- API route
- structured request parsing
- environment handling
- fallback
- mocked tests

### Agent F — Adversarial testing

Review:

- false-positive recovery
- timestamp edges
- path normalization
- folder recursion
- conflict logic
- retention logic
- misleading-success scenario

### Agent G — Accessibility and UX

Review:

- keyboard flow
- labels
- focus
- contrast
- responsive behavior
- error clarity
- copy

### Agent H — Documentation

Own:

- README
- architecture
- demo script
- submission notes
- development log cleanup

The lead agent integrates all work and runs final verification.

---

## Working discipline

At each major milestone:

1. inspect git diff
2. run formatter
3. run lint
4. run typecheck
5. run tests
6. run production build
7. repair failures
8. update documentation
9. commit a coherent checkpoint

Do not:

- leave placeholder content
- hide failing tests
- report completion before the build passes
- rewrite unrelated files
- add speculative features
- create dead code
- postpone all testing until the end

Suggested commits:

```text
chore: initialize ProofRestore hackathon project
feat: add manifest schema and demo vault
feat: implement deterministic recoverability engine
feat: add restore simulation and evidence model
feat: build recovery investigation interface
feat: add natural language request parsing
test: cover recovery and retention edge cases
docs: prepare ProofRestore submission materials
```

---

## First mandatory milestone

Before UI polish, complete this exact path:

```text
Explore demo vault
→ find Thesis-Final.docx
→ select Tuesday evening
→ select valid historical snapshot
→ verify integrity
→ return fully recoverable
→ generate deterministic restore plan
```

This must work without OpenAI.

Required commands must pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

## Start now

1. Read this entire file.
2. Inspect the repository and environment.
3. Create or update `docs/plan.md`.
4. Summarize the repository state briefly.
5. Assign independent subagents.
6. Implement the trusted core first.
7. Continue autonomously.
8. Stop only for a real credential, secret, destructive action, or architectural blocker.
9. Do not wait for approval between normal implementation phases.
10. Do not claim completion until the production build and main demo flow both succeed.
