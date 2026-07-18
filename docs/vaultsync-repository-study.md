# VaultSync repository study

This is a read-only architecture study of the clean VaultSync working tree at `/Users/flavio/Developer/VaultSync.nosync`, branch `release/v1.8.4`, commit `d5bd54f`. No VaultSync files were changed.

## Actual structure

VaultSync is a .NET 10 solution with three production projects:

- `src/VaultSync.Core` — models, SQLite persistence, scanning, hashing, backup, retention, encryption, restore exploration, and verification services.
- `src/VaultSync.CLI` — Spectre.Console command registration and thin command handlers over Core.
- `src/VaultSync.UI` — Avalonia UI; `AppViewModel` partial classes orchestrate Core services and `BackupsViewModel` exposes UI actions.

Tests reference both Core and UI. A future ProofRestore producer belongs in Core, with thin CLI and UI entry points using the same service.

## Evidence already available

`Project`, `Snapshot`, `FileEntry`, and `Backup` provide most join keys required by an exporter:

- projects, snapshots, and backups have external IDs;
- backups identify a project, snapshot, destination root, relative backup path, backup mode, encryption state, and creation time;
- snapshot files contain relative path, size, modification time, and an optional SHA-256 value;
- snapshot-history metadata contains user-marked protection and known-good flags;
- repository methods already retrieve backups, explicit snapshots, snapshot files, and history metadata;
- `BackupIndexConsistencyService` detects broken relationships and missing/duplicate external IDs.

Relevant files:

- `src/VaultSync.Core/Models/Project.cs`
- `src/VaultSync.Core/Models/Snapshot.cs`
- `src/VaultSync.Core/Models/FileEntry.cs`
- `src/VaultSync.Core/Models/Backup.cs`
- `src/VaultSync.Core/Repositories/SqliteRepository.cs`
- `src/VaultSync.Core/Services/BackupIndexConsistencyService.cs`

## Critical gaps in current verification

### Verification is not backup-specific

`VerifyService.VerifyAsync` always loads the latest project snapshot. It cannot receive the selected backup's `SnapshotId`, reads ordinary destination files only, and returns transient mismatches without persisting a verification run.

`AppViewModel.StartVerificationAsync` currently ignores the returned `VerifyResult.Failures`; only thrown exceptions enter failure handling. A mismatching or missing file therefore does not become durable backup history. `BackupsViewModel` reconstructs every persisted backup with the UI status `Completed`, while its failure marker is in-memory only.

Consequences:

- the existing verifier must not be wrapped as the ProofRestore exporter;
- VaultSync needs a new scanner that accepts one explicit `Backup` and its exact `SnapshotId`;
- verification outcomes need a persisted run/item model before scheduled ProofRestore verification can be presented as durable history.

Relevant files:

- `src/VaultSync.Core/Services/VerifyService.cs`
- `src/VaultSync.UI/ViewModels/AppViewModel.BackupSupport.cs`
- `src/VaultSync.UI/ViewModels/BackupsViewModel.cs`

### Expected hashes have a timing gap

The normal backup path calls `SnapshotService.CreateSnapshotAsync` with `hashNow: false`. New or modified `FileEntry.HashSha256` values can therefore be empty when the copy begins. Post-backup hashing later reads the live project rather than immutable source bytes captured by the backup operation.

If the source changes between copy and deferred hashing, the resulting expected hash may not describe the stored backup. Historical empty hashes cannot be repaired honestly by hashing the current source.

A trustworthy exporter must either capture expected hashes before/during the backup transaction or initially support only snapshots whose non-empty expected hashes were captured reliably.

Relevant files:

- `src/VaultSync.Core/Services/BackupService.cs`
- `src/VaultSync.Core/Services/SnapshotService.cs`
- `src/VaultSync.UI/ViewModels/AppViewModel.BackupSupport.cs`

### Backup job history is incomplete

The SQLite backup row represents a successful persisted backup. It has no started/completed pair, job status, partial/failure record, or persisted verification result. Failed and cancelled work normally leaves no backup row.

For an initial adapter, a persisted row may map to a successful snapshot only, with `Snapshot.CreatedUtc` as creation and `Backup.CreatedUtc` as the available completion-like timestamp. VaultSync cannot yet export honest failed/partial job history.

### Multiple destinations need per-copy persistence

Multi-destination orchestration creates one shared snapshot, but only the first successful destination writes backup metadata (`writeMetadata: !metadataWritten`). Secondary copies do not receive independent `Backup` rows.

The first exporter can verify only the destination represented by the persisted row. Complete multi-destination coverage requires a future `backup_copies`-style record containing destination, relative path, outcome, timestamps, and verification state per copy.

Relevant file: `src/VaultSync.UI/ViewModels/AppViewModel.BackupHandlers.cs`.

## Backup content readers required

VaultSync supports three physical content forms:

1. ordinary backup folders;
2. plain `data.zip` archives;
3. encrypted `data.vse` archives.

`SnapshotExplorerService` already detects all three and safely enumerates folders/plain ZIPs, but deliberately exposes no encrypted inventory. `BackupArchiveCryptoService` can authenticate and decrypt an encrypted archive to a temporary ZIP, and the UI restore flow demonstrates staging and cleanup. There is no reusable encrypted read-only content-reader abstraction yet.

A future scanner should use explicit readers:

```text
IBackupContentReader
├── FolderBackupContentReader
├── ZipBackupContentReader
└── EncryptedZipBackupContentReader
```

The encrypted reader must hash decompressed plaintext streams locally, clean temporary plaintext in `finally`, and never export credentials, keys, or raw content.

Relevant files:

- `src/VaultSync.Core/Services/SnapshotExplorerService.cs`
- `src/VaultSync.Core/Services/BackupArchiveCryptoService.cs`
- `src/VaultSync.UI/ViewModels/AppViewModel.BackupHistoryHandlers.cs`

## Retention and readiness semantics

Retention is count-based (`MaxSnapshotsPerProject`, default 20) with protection supplied by `Backup.IsProtected` and snapshot-history metadata. VaultSync does not persist exact future expiry timestamps per backup. Contract `1.0` can represent a keep-last policy and protection context, but cannot invent `snapshotExpiries`.

`RestoreReadinessService` is a useful heuristic over recency, destination reachability, verification policy, index warnings, and user-marked protected/known-good points. It does not hash stored objects. Readiness scores and known-good flags may be exported as source metadata only; neither is recoverability proof.

Relevant files:

- `src/VaultSync.Core/Config/AppConfig.cs`
- `src/VaultSync.Core/Services/BackupRetentionSimulationService.cs`
- `src/VaultSync.Core/Services/RestoreReadinessService.cs`

## Path and incremental behavior

VaultSync generally compares snapshot paths case-insensitively, while ProofRestore intentionally matches paths case-sensitively. The exporter must normalize separators to POSIX, reject traversal and absolute paths, synthesize parent directories, reject case-colliding paths, exclude `.vaultsync_*` artifacts, and canonicalize hashes as `sha256:<lowercase hex>`.

Incremental folder backups use `rsync --link-dest`; each selected backup directory is intended to appear as a complete logical tree. The scanner should verify that tree directly. The risk is missing/broken hard-linked content, not a generic reconstruction chain.

## Concrete future seams

Recommended Core types:

```text
ProofRestoreEvidenceExportService
BackupEvidenceScanner
BackupLocationResolver
IBackupContentReader
ProofRestoreContractDtos
```

Recommended UI path:

```text
BackupsViewModel.VerifyWithProofRestoreRequested
→ AppViewModel handler
→ Core exporter with progress/cancellation
→ Save manifest
→ Open ProofRestore or show file
```

Recommended CLI path: register a `proofrestore export` branch in `VaultSync.CLI.Program` and implement it in a thin `Commands/ProofRestoreCommands.cs` wrapper over the same Core service.

## Safe first milestone

The honest first milestone is deliberately narrow:

- one persisted backup row;
- one explicit snapshot;
- one reachable, unencrypted folder destination represented by that row;
- complete and trustworthy non-empty expected hashes;
- full read-only re-read of every stored file;
- case-collision/path validation and directory synthesis;
- schema validation;
- manual manifest import into ProofRestore.

ZIP, encrypted ZIP, multi-destination copies, persisted verification history, scheduled execution, partial observations, and large-manifest transport should be added only after their prerequisites are implemented and tested in VaultSync.
