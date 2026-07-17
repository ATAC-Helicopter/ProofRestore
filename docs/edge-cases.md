# Recovery edge-case catalog

This catalog records expected behavior at the input and deterministic trust boundaries. Tests should use fixed UTC instants.

## Manifest and path input

| Case                                          | Expected behavior                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| Unsupported or absent schema version          | Reject the manifest; never guess a migration                            |
| Unknown fields                                | Reject rather than silently accepting misspelled security-relevant data |
| Malformed or oversized JSON                   | Reject before recovery analysis with a concise import error             |
| Offset timestamp                              | Normalize to UTC ISO 8601 before comparisons                            |
| Timestamp without timezone                    | Reject as ambiguous                                                     |
| Snapshot completion before creation           | Reject the manifest                                                     |
| Duplicate snapshot or object ID               | Reject; identity must be unambiguous                                    |
| Duplicate paths after separator normalization | Reject the affected manifest                                            |
| `/absolute`, `C:\\absolute`, or UNC path      | Reject as unsafe                                                        |
| `.` or `..` segment                           | Reject rather than resolving it                                         |
| Repeated/trailing separators                  | Normalize to one relative POSIX path                                    |
| Paths differing only by case                  | Keep distinct; matching is case-sensitive                               |
| File references absent object ID              | Accept the manifest, then return missing-object evidence                |
| Retention expiry references absent snapshot   | Reject as internally inconsistent                                       |

## Snapshot and request selection

| Case                                      | Expected behavior                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| Exact snapshot ID exists                  | Select it and emit selection evidence                                         |
| Exact snapshot ID absent                  | Fail explicitly; do not substitute another snapshot                           |
| Requested time falls between snapshots    | Select the latest eligible snapshot at or before the instant                  |
| Requested time precedes earliest snapshot | Return no eligible snapshot and failure evidence                              |
| Equal timestamps                          | Resolve using a documented stable tie-breaker, such as snapshot ID            |
| Failed snapshot is nearest                | Apply the engine's eligibility rule; never imply it is healthy from proximity |
| Natural-language date remains ambiguous   | Require clarification or use the visible manual timestamp control             |

## Path resolution and recursion

| Case                                         | Expected behavior                                                |
| -------------------------------------------- | ---------------------------------------------------------------- |
| Exact file exists                            | Analyze only that version unless a folder was requested          |
| Path absent in selected snapshot             | Return path-not-found evidence, not a model-suggested substitute |
| Folder requested recursively                 | Include the folder plus descendants at a segment boundary        |
| Similar prefix (`Docs` vs `Docs-old`)        | Do not treat it as a descendant                                  |
| Empty directory                              | Produce a `create_directory` dry-run action with zero bytes      |
| Folder has mixed healthy and failed children | Return partially recoverable and retain item-level failures      |

## Integrity and restore planning

| Case                                  | Expected behavior                                                 |
| ------------------------------------- | ----------------------------------------------------------------- |
| Referenced object absent              | Item is unavailable with `object_missing` evidence                |
| Object marked missing                 | Item is unavailable with `object_unavailable` evidence            |
| Object marked corrupted               | Item is corrupted even if a hash string happens to match          |
| Expected or observed hash mismatch    | Item is corrupted; never downgrade to a warning                   |
| Size mismatch                         | Item is not verified and carries size-mismatch evidence           |
| Destination hash and size identical   | `skip_identical`; do not count bytes as written                   |
| Destination differs                   | Surface conflict/overwrite according to selected destination mode |
| No destination entry                  | Plan `create` only; never touch the filesystem                    |
| Integer byte total exceeds safe range | Manifest validation rejects the unsafe number                     |

## Retention and overall verdict

| Case                                                | Expected behavior                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Last healthy version expires soon                   | Emit last-healthy-copy-at-risk evidence with urgency                   |
| Another healthy version survives                    | Emit healthy-copy-survives evidence and lower urgency                  |
| Expired version requested                           | Report its actual availability; do not infer deletion solely from time |
| Job reports success with missing/corrupt object     | Recoverability remains at risk; job status never overrides evidence    |
| Every selected item verified or safely warning-only | Fully recoverable                                                      |
| Healthy and unavailable selected items coexist      | Partially recoverable                                                  |
| No selected file is recoverable                     | Unrecoverable                                                          |

## Interpreter and presentation

| Case                                                 | Expected behavior                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| No API key, timeout, or malformed model output       | Fall back without blocking the manual demo flow                    |
| Model names a path outside supplied candidates       | Reject it and preserve ambiguity                                   |
| Model suggests a verdict or restore action           | Ignore it; recompute with deterministic code                       |
| Imported text contains HTML or Markdown control text | Render as escaped text; never inject raw HTML                      |
| Report generation occurs twice                       | Content is reproducible except for an explicit generated timestamp |
