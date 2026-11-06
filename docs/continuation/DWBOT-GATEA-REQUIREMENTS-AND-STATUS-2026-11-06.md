# Gate A requirements and current evidence status

**Date:** 2026-11-06  
**Status:** NOT PASSED — evidence and source-image prerequisite remain open.  
**Scope:** The approved 16-image development corpus; no OCR.Space requests were initiated by this status review.

## 1. What Gate A must demonstrate

Gate A is the PDF-first development acceptance gate, not the independent holdout gate. It must use the approved 16-image development corpus with the nine mandatory fields:

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

Required evidence:

1. Exact 16-image source archive, manifest and per-image SHA-256 values. The source archive fingerprint must be locked and recorded before processing.
2. Windows runtime on the accepted Node baseline (Node >= 24.17.0; the established environment is Windows x64, Node 26.13.0 / npm 11.20.0).
3. OCR.Space Engine 2 as the authorized primary extraction stage: original screenshot -> searchable PDF -> validated HTTPS PDF -> bounded local PDF-derived raster -> local OCR readers. No silent OCR fallback to the original screenshot.
4. Verified PDF and PDF-derived raster for each of the 16 images, including source/PDF/raster hashes, PDF signature, page count, searchable text layer, raster dimensions and rerendered pixel provenance.
5. Local readers and all field-specific reconciliation must operate only on the PDF-derived raster. Preserve engine/model versions, per-field candidates, disagreements, timeouts and unresolved fields.
6. All 16 records must have exact, resolved values for all nine mandatory fields. A wrong accepted mandatory value or an unresolved mandatory field blocks Gate A.
7. Restricted-egress enforcement must be active and auditable. The diagnostic log path must be configured and writable before the OCR process starts. Any blocked non-OCR request must be recorded; no unauthorized network attempts are permitted.
8. A Gate A report must bind the exact source archive, ground-truth version, source build, package lock, runtime, provider engine, local engine/model versions, PDF/raster artifacts, network log and exact-match results.
9. Gate A must record a locked candidate fingerprint so the 19-image Gate B report can prove it used the same accepted candidate build. Gate B cannot pass without Gate A PASS and the matching fingerprint.

There is no numeric exact-match threshold that replaces the hard requirements above. The full-record criterion is 16/16 exact nine-field records with zero wrong accepted values and zero unresolved mandatory fields.

## 2. Available 16-image reference and missing source archive

The repository contains `testdata/additional-screenshot-ground-truth.json`, with 16 complete nine-field reference records and explicit field eligibility. The record identifies its source archive as `imgs2add.zip`.

The exact `imgs2add.zip` source bytes are not currently present in the accessible Library or repository. The Library contains `imgsHalf1.zip`, a different 56-image archive (54,346,878 bytes; SHA-256 `6c1ef64586a0e028f26de228766da63525314aeee923ed1b193caa02dfaba87f`). Its 56 member hashes were checked against the 16-image report's source-image hashes: zero exact matches. It is not a valid substitute for `imgs2add.zip`.

The Library also contains `native-16-image-report.json` (1,360,612 bytes; SHA-256 `f6f4dd7a3b6c8cc6c300c480c20dcd44f0638797e20f32036726478b51cd0f5a`). Its report records:
- 16 images completed;
- 5 exact nine-field records;
- 5 mandatory exact matches;
- 6 records with all required fields complete;
- Windows x64, Node 26.13.0;
- native Tesseract configuration, no OpenCV assist and no PaddleOCR field fallback;
- network blocking enabled;
- no OCR.Space PDF-first stage.

This is historical local-reader evidence only. It is not Gate A, does not test searchable PDFs or PDF-derived rasters, and does not replace the missing source archive.

## 3. What has been implemented to prevent a repeat of the missing network log

- The current 63-image extraction workflow sets `OCR_NON_OCR_NETWORK_LOG` to its artifact path.
- The restricted-egress guard now refuses to start if unrelated-egress restriction is enabled without a diagnostic log path.
- It also refuses to proceed if the log path cannot be initialized or if a blocked-attempt log write fails.
- Regression tests cover allowed OCR.Space HTTPS hosts, denied unrelated/HTTP destinations, actual newline-delimited diagnostic entries and fail-closed startup without a log.
- The 2026-11-06 63-image source run predates this guard/log-path requirement. Its original restricted-egress log was never configured and is absent. The artifact-verification workflow has reconstructed limited evidence from the available job logs and per-image failure rows, but explicitly does not claim the historical attempt count was zero.

## 4. Immediate next action required

The exact `imgs2add.zip` source archive (or an explicitly approved replacement archive whose 16 images and hashes can be reconciled to the existing 16-image ground-truth file) must be made accessible. Until then, no provider request should be made against the 16-image corpus, because the original source images cannot be verified.

Once the exact archive is available, run the PDF-first Gate A workflow once, with the new mandatory diagnostic-log guard. Do not reuse `imgsHalf1.zip` as a substitute and do not treat the existing native-16 report as a Gate A pass.

## 5. Relationship to the current 19-image Gate B work

The completed 63-image exploratory run produced 63 searchable PDFs and 63 PDF-derived raster files. Its downloaded artifact passed independent file-level checks for all 63 pairs: sizes, SHA-256 values, signatures, one-page PDFs, non-empty searchable text layers and raster dimensions. The 19 selected Gate B subset has separate artifact verification for PDF integrity, searchable text, raster integrity and PDF-derived raster provenance.

However, the extraction run used Node 22.16.0, below the accepted Node >=24.17.0 runtime, and its original network diagnostic log is missing. The 19-image post-hoc evaluation also has many unresolved mandatory fields. Gate B therefore remains NOT PASSED regardless of the exploratory field-level percentages.

The 19-image evaluation and separate 21-image diagnostic are recorded in the artifact-verification reports. They do not waive Gate A or upgrade the exploratory source run into a release acceptance run.
