# ProofRestore Product Spec

## One-line promise

ProofRestore proves whether a backup can actually be recovered before disaster strikes.

## Core contrast

- Backup status: Completed
- Recoverability status: At risk

## Main demo

1. Open the app.
2. Choose **Explore demo vault**.
3. Search for `Thesis-Final.docx`.
4. Ask: “Can I recover my thesis from Tuesday evening?”
5. Resolve the correct snapshot deterministically.
6. Verify object availability and hash integrity.
7. Run a safe restore simulation.
8. Show recoverable, unavailable, skipped, and conflicting files.
9. Generate a Proof of Recoverability report.

## Trust boundary

AI interprets intent and explains verified results.
Deterministic code decides snapshot selection, integrity, conflicts, restore actions, retention risk, and final verdict.

## Required MVP

- Built-in demo vault
- JSON manifest import and validation
- Vault health dashboard
- File search and version timeline
- Point-in-time recovery
- Deterministic recovery engine
- Restore dry run
- Evidence viewer
- Retention warnings
- Optional OpenAI natural-language parser
- Manual no-key fallback
- Downloadable report
- Tests, production build, README, deployment readiness

## Excluded

Authentication, billing, destructive restoration, cloud integrations, encryption, multi-user collaboration, mobile apps, and unrelated features.
