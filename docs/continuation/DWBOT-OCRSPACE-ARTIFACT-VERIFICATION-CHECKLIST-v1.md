# DWBOT OCR.Space Artifact Verification Checklist

**Version:** 1.0  
**Status:** Reproducible procedure; verification must be run against one exact completed workflow run.  
**Scope:** Post-run evidence inspection and post-hoc evaluation only. This procedure must not submit, retry, or reprocess an OCR.Space provider request unless a separate authorized workflow explicitly identifies unprocessed source hashes.

## 1. Run identity and immutable source evidence

Record before downloading anything:

- GitHub repository and exact workflow run ID/URL.
- Run status and conclusion; require `completed` before treating the artifact as immutable.
- Triggering commit SHA and workflow file SHA.
- Artifact name, artifact ID, advertised byte size and GitHub SHA-256 digest.
- Candidate/source commit SHA and source archive SHA-256.
- Ground-truth file SHA-256, schema version, required field order and inventory ID.
- Node/npm versions, OS/architecture, OCR.Space engine, Tesseract.js/core versions, native Tesseract version, PDF renderer version and local model identifiers.

Reject an artifact if the run, commit, artifact identity or source fingerprint cannot be reconciled. Do not mix files from different runs or commits.

## 2. Download and archive integrity

1. Download the exact artifact ID from the completed run; do not select by display name alone if more than one artifact exists.
2. Compute SHA-256 over the downloaded ZIP and compare it with the GitHub digest.
3. List the archive without extracting first. Reject absolute paths, parent traversal, duplicate normalized paths, symbolic links or unexpected file types.
4. Preserve the original ZIP unchanged. Extract into a new, empty verification directory.
5. Record archive member count, path list, sizes and extracted-file hashes.
6. Verify every expected report sidecar against its report bytes. A missing sidecar is a finding; do not create one and present it as original evidence.

## 3. Source inventory reconciliation

For every selected image:

- Require one unique filename and one source-image SHA-256.
- Recompute the source image hash and byte count from the exact source archive.
- Compare source dimensions with the manifest and ground-truth record.
- Confirm the selected inventory is exactly the approved set (Gate B: 19 records; 21-image set is diagnostic only).
- Confirm no duplicate, missing, extra or substituted source member.
- Preserve the original 63-image run inventory separately from the selected 19-image evaluation subset.

## 4. Searchable PDF verification

For each selected image:

- Require exactly one expected PDF output and a corresponding source-image hash link.
- Verify the PDF signature, minimum structural validity, bounded file size and successful parser open.
- Verify page count and extract the text layer independently.
- Record text length, extracted text hash and a redacted/limited text sample sufficient to diagnose missing content.
- Confirm the PDF contains a searchable text layer; a PDF container with only a scanned image is not sufficient.
- Record any OCR.Space status/error fields and provider request identifier if available.
- Do not treat a PDF file's existence alone as proof that every downstream stage completed.

## 5. PDF-derived raster provenance

For each PDF:

- Require the expected raster output and verify PNG signature, byte count, SHA-256 and dimensions.
- Re-render the PDF page using the pinned local renderer/version and documented DPI, page-box, alpha and color settings.
- Compare the reproduced render with the submitted raster using exact hash where deterministic; otherwise record pixel-difference metrics and the documented reason exact hash equality is not expected.
- Confirm the raster is derived from that PDF, not from the original screenshot.
- Inspect workflow source and per-image report for any original-screenshot fallback. Any fallback invalidates the PDF-first gate.
- Keep original screenshot, searchable PDF, PDF-derived raster and OCR outputs as separate artifacts with separate hashes.

## 6. Local reader and evaluator verification

- Record each reader's exact version, language/model files, configuration and timeout behavior.
- Verify readers receive only the PDF-derived raster for the PDF-first path.
- Verify network restriction is active during local processing; local-only recovery must make zero OCR.Space requests.
- Confirm a missing/uncertain/partial field remains unresolved; never fill it from neighboring rows, a second image, assumptions or an unlabelled OCR transcript.
- Run the post-hoc evaluator against the exact ground-truth schema and exact inventory.
- Report each mandatory field separately: eligible, exact, wrong accepted, wrong unaccepted, unresolved, and exact-match rate with denominator.
- Report complete nine-field records separately from field-level metrics.
- Report reader rows missing, source-hash mismatches, missing run results and malformed outputs.
- Keep consensus experiments as separate derived analyses. A consensus result is not ground truth and must not overwrite source-specific reader outputs.

## 7. Restricted-egress diagnostic log reconciliation

The original run must contain its own expected diagnostic log, or a verifiable equivalent captured by the runner.

If it is missing:

1. Search the exact run artifact, all artifacts attached to that run, exact job logs, workflow-upload paths and runner output references.
2. Inspect the exact workflow commit to establish whether the log path was configured, whether the guard writes at startup or only on denied attempts, and whether write errors fail closed.
3. Search per-image error records and job logs for blocked-attempt markers. Record counts and search scope.
4. If a later local-only recovery produced a separate log, verify its hash and report it separately; it cannot replace the original run log.
5. Create a **derivative reconciliation report** with the original log status, sources searched, observed markers, known/unknown attempt count and limitations.
6. Never fabricate or backdate the original log. Never turn an absent log into an empty zero-byte log and claim zero attempts.
7. If the original event count cannot be reconstructed, set network status to `NOT_VERIFIED_MISSING_ORIGINAL_LOG`, unauthorized attempt count to `null`/UNKNOWN, and block the gate.

A valid zero-attempt claim requires a present, correctly bound log from a guard known to record every denied attempt and fail closed on log-write failure.

## 8. Secret and fallback checks

- Scan extracted files, logs, reports and generated text for API-key/token patterns without printing the matched secret.
- Record scanner version, scanned file count and result.
- Any secret occurrence is a failure and must be redacted from derivative reports without altering the preserved original artifact.
- Require explicit evidence that original-screenshot fallback was not used.
- Verify no cloud OCR, telemetry or unrelated external endpoint was contacted outside the explicit OCR.Space allowlist.

## 9. Gate decisions

### Artifact integrity

All selected images must pass source hash, PDF integrity, searchable text, raster integrity, PDF-derived provenance, local reader availability and secret scan. Any missing/extra/mismatched image is a failure.

### Gate A

Requires the exact 16-image development corpus, all nine expected fields, candidate fingerprint locked to Gate B source, accepted runtime (Node >=22.16.0), zero wrongly accepted mandatory values, zero unresolved mandatory values, and complete restricted-egress evidence with zero unauthorized attempts.

### Gate B

Requires the exact 19-image independent holdout subset, all 19 selected artifacts verified, Gate A PASS with the same candidate fingerprint, all required local-reader rows, zero source-hash mismatches, zero wrongly accepted mandatory values, zero unresolved mandatory outputs under the current acceptance rule, no original-screenshot fallback, no unauthorized network attempts and no secret leakage.

The 21-image diagnostic subset must never be counted as Gate B. It may be reported separately for diagnostics only.

## 10. Required report structure

Every verification run should emit a machine-readable JSON report and a human-readable Markdown summary with these sections:

1. `schemaVersion`, `createdAt`, `status`, `runId`, `runUrl`.
2. `sourceCommit`, `workflowSha`, `sourceArchiveSha256`, `groundTruthSha256`.
3. `artifact`: name, ID, advertised digest, downloaded ZIP SHA-256, byte size and member inventory.
4. `inventorySelection`: ID, exact selected filenames, selected count, verified count.
5. `runtimeAndEngines`: OS, Node/npm, provider engine, reader versions, model hashes, renderer version.
6. `checks`: source hashes, PDF integrity, searchable text, raster integrity, PDF-derived provenance, local readers, network restriction, secret scan, fallback absence.
7. `networkLogReconciliation`: original log status/hash, guard behavior, searched sources, blocked markers, attempt count or null, limitations, separate local-recovery log.
8. `images[]`: filename, source hash, PDF hash/bytes/page count/text length, raster hash/bytes/dimensions, provider request status, reader statuses, per-image issues.
9. `readerMetrics`: per-engine and per-field denominators, exact, wrong accepted, wrong unaccepted, unresolved and complete-nine-field records.
10. `consensusAnalyses[]`: named method, sources, rule, exact, wrong, unresolved, denominator and warning.
11. `gateA`, `gateB`, `decision`, `limitations`, `notes`.

Use only these status meanings:

- `VERIFIED`: every required artifact-integrity check passed.
- `FAILED`: a required integrity, security, provenance or gate condition failed.
- `RECONSTRUCTED_LIMITED_EVIDENCE`: some historical evidence was corroborated, but the original evidence is incomplete.
- `PENDING`: required artifacts or upstream gate evidence are not yet available.
- `NOT_EVALUABLE`: the requested accuracy/gate claim cannot be computed from the available independent reference.

Do not collapse artifact integrity, OCR accuracy, Gate A, Gate B or production release into one status.

## 11. Preservation and change control

- Preserve the original workflow artifact and original run report unchanged.
- Put recovered reader outputs, post-hoc evaluation, consensus analysis and network reconciliation in separate derivative files.
- Hash every derivative report and keep its source artifact/report hashes.
- Never edit source OCR output to make it match ground truth.
- Do not resubmit an image with a verified completed provider submission. If a row may have reached OCR.Space but lacks a verified completion record, classify it as ambiguous and do not automatically retry.
- A new provider run requires a fresh, exact inventory decision and explicit scoped authorization.
