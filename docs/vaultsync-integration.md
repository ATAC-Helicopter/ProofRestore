# VaultSync integration roadmap

## Decision

VaultSync and ProofRestore should remain separate repositories and separate products. VaultSync owns backup creation and history; ProofRestore owns the recoverability contract and deterministic verification. The integration boundary is a versioned JSON evidence manifest, not a shared database, copied engine, or Git submodule.

```text
VaultSync backup records
+ read-only scan of the actual backup destination
→ versioned ProofRestore manifest
→ ProofRestore validation and deterministic verification
→ verdict, evidence, simulation, and report
```

This lets VaultSync offer an optional native **Verify with ProofRestore** step after backup, from backup history, or on demand while ProofRestore remains independently usable.

## Why not Git submodules

Submodules would couple checkout and release workflows, complicate CI, and encourage the applications to depend on each other's internal models. They do not provide a useful boundary between a TypeScript web application and VaultSync's implementation language.

ProofRestore should instead publish immutable contract releases containing:

- a canonical JSON Schema;
- valid and adversarial fixtures;
- producer conformance rules;
- migration notes and checksums.

VaultSync pins an exact contract release and checksum. Cross-repository CI tests released contracts or tags, never a moving branch. If several products eventually produce ProofRestore evidence, only the language-neutral schema, fixtures, and protocol documentation may move into a small third contract repository.

## Ownership

### ProofRestore owns

- Manifest schema and semantic rules
- Compatibility policy and fixtures
- Validation and deterministic recovery engine
- Evidence codes, verdict semantics, and reports
- Producer conformance tests

### VaultSync owns

- Mapping VaultSync backup records to contract DTOs
- Read-only inspection of the actual backup destination
- Decryption through its existing local read pipeline when required
- CLI and native UI entry points
- Scheduling and user consent

VaultSync must not copy the ProofRestore engine or expose its SQLite database, credentials, absolute storage paths, or decrypted content. ProofRestore should not create or mutate VaultSync backups.

## Required evidence mapping

| VaultSync observation                          | ProofRestore field                       |
| ---------------------------------------------- | ---------------------------------------- |
| Backup job/project                             | Vault and snapshot metadata              |
| Hash captured when snapshot was created        | `expectedHash`                           |
| Fresh hash from re-reading stored backup bytes | `observedHash`                           |
| Actual stored byte count and availability      | Stored object evidence                   |
| Backup job result                              | Snapshot status and `jobReportedSuccess` |
| Protection/expiry policy                       | Retention evidence                       |
| Optional current project scan                  | `destinationState`                       |

A source snapshot hash alone is not independent recovery evidence. The exporter must re-read the stored backup copy. For contract `1.0`, an inaccessible or incomplete destination scan should fail closed instead of inventing an observed hash or describing an unknown state as missing.

Storage locations should be logical and redacted, for example:

```text
vaultsync://destination/<id>/backup/<id>/<relative-path>
```

For encrypted backups, VaultSync may locally authenticate, decrypt through its existing read-only pipeline, and hash recovered plaintext. Secrets and plaintext bytes never enter the manifest.

## First integration: explicit file handoff

The first release should be intentionally simple and auditable:

```bash
vaultsync proofrestore export \
  --project <project-id-or-name> \
  --backup latest \
  --verify full \
  --contract 1 \
  --output proofrestore-manifest.json
```

Rules:

- The command is strictly read-only.
- A full destination scan is mandatory for contract `1.0`.
- Manifest JSON goes to the output file or stdout; diagnostics go to stderr.
- The exporter validates against the pinned schema before returning success.
- Exit codes distinguish invalid input, inaccessible storage, unstable scans, contract failure, and output failure.
- Default output redacts absolute paths, hostnames, user names, and credentials.

Native VaultSync UI can call the same exporter service:

```text
Backup completed
→ optional Verify recoverability
→ read-only evidence scan
→ Open or export to ProofRestore
```

The same action can appear beside a historical backup as **Verify this recovery point** and in project settings as an optional post-backup verification step.

## Later local automation

After the file contract is stable, VaultSync can expose a short-lived loopback service started only by explicit user action:

```bash
vaultsync proofrestore serve --bind 127.0.0.1 --port 0 --token <random>
```

Potential read-only endpoints:

```text
GET  /v1/capabilities
POST /v1/manifests
GET  /v1/jobs/{id}
GET  /v1/jobs/{id}/manifest
```

The service must bind only to loopback, use a short-lived bearer token and strict Origin allowlist, accept no caller-supplied filesystem paths, return no raw file content, enforce bounded responses, and shut down automatically. A persistent daemon or public cloud upload API is not required for the initial integration.

## Contract versioning

The contract is versioned independently from both applications:

- Patch: documentation or fixture corrections without changing accepted data
- Minor: optional backward-compatible fields or capabilities
- Major: required fields or changed semantics

A future contract `2.0` should represent `unverified` and `inaccessible` objects honestly, allow absent observed hashes when no read occurred, declare hash algorithms and producer capabilities, record observation start/end times and unstable scans, and optionally carry a detached producer signature. A signature proves provenance, not recoverability.

## Delivery phases

1. **Harden contract `1.0`:** publish JSON Schema, fixtures, checksums, semantic rules, and compatibility policy.
2. **VaultSync exporter beta:** support one project and a bounded set of backups with mandatory full destination verification.
3. **Native handoff:** add **Verify with ProofRestore** after backup and beside history entries; add explicit VaultSync import guidance in ProofRestore.
4. **Cross-repository CI:** VaultSync produces healthy, corrupted, missing, encrypted, and inaccessible fixtures; ProofRestore verifies the expected evidence and verdicts.
5. **Contract `2.0`:** add honest partial-observation states, scan stability, and producer metadata.
6. **Optional automation:** introduce the short-lived local bridge or a future local ProofRestore client.
7. **Scheduled verification:** allow opt-in post-backup and periodic verification once performance and security behavior are proven.

## Main risks

- Reusing source hashes instead of independently reading stored bytes
- Misclassifying inaccessible or encrypted destinations as missing
- Backup files changing while they are hashed
- Incremental chains being represented as independently complete snapshots
- Case-sensitivity differences across platforms
- Manifests exceeding the current browser import limit
- Leaking local paths, hostnames, identities, or credentials
- Retention metadata diverging from provider behavior
- Coupling releases through copied DTOs without conformance tests

The safe first milestone is therefore: one VaultSync project, a bounded full read-only destination scan, a validated JSON export, and manual ProofRestore import.
