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

## 6. Latest Gate A preflight and interrupted one-image attempt — 2026-11-06

The earlier statement that no Gate A source images were available is superseded
in part. The original `imgs2add.zip` archive bytes are still unavailable, but
the repository contains all 16 individual files in
`fixtures/additional-screenshots/`. The Gate A preflight compared every file
against the existing manifest SHA-256 and verified:
- exactly 16 unique source images;
- all nine required expected fields present for every image;
- valid image dimensions;
- exact candidate source SHA match to the completed 63-image run;
- zero provider requests during preflight.

Preflight result:
- Status: `PREFLIGHT_PASS_NO_PROVIDER_REQUESTS`
- Candidate/source commit: `adaf4f8c3a9573f56d0348a4bba36686fc31c22e`
- Deterministic corpus fingerprint: `6c03d85173bb07103cee9a3075ffa708751b36da2ba3bb49d27fedcdb8468efe`
- Manifest SHA-256: `57fe533e7dd4b0d8df77629a5e48c6fdb58f466c` (Git blob SHA; the
  preflight report separately records the SHA-256 of manifest bytes).

A one-time Gate A provider run was started at
[#42202563673](https://github.com/pbrau014/braultDwBotVis/actions/runs/42202563673).
It was cancelled during image 1 of 16. Its uploaded artifact
`dwbot-gateA-16-pdf-first-42202563673` (artifact ID `13495008195`,
ZIP SHA-256
`398f8152847cd3ea58fb9e16ac01886fced0c880869ce6a430d3343e5cb4ecd8`)
contains one PDF and one PDF-derived raster for `Screenshot_16.jpg`:
- source SHA-256:
  `4a58aad7cb1d21f9bb457e1ad728fee59ebff3873a1e47938cf401d41f784bbc`;
- PDF: 535,706 bytes, SHA-256
  `98532da5058778aeee8a46515a8a6a12a3c20cb865565f974271706777b7ec93`,
  one page, 550 characters of searchable text;
- PDF-derived raster: 1,033,392 bytes, 1818×2573 pixels, SHA-256
  `620fd7395a4736d6c95a3ab89a1cb2924cfb019e7547d534b1ffcde6458bda72`.

The job log records only `[OCR-SEQUENCE] 1/16 START Screenshot_16.jpg`
before cancellation. The PDF/raster pair demonstrates that the first image
reached artifact creation; no local-reader result or completed sequence report
was uploaded. The remaining 15 images were not processed. The first image
must not be resubmitted.

The partial run used Node 22.16.0, below the required Node >=24.17.0. The
source commit's older `scripts/block-network.js` only appends the diagnostic
file when a blocked request occurs and silently catches log-write errors. The
artifact contains no original network log; its historical denied-attempt
count is unknown. Do not create an empty file after the fact and claim zero
attempts. The partial Gate A report correctly records FAIL.

The Gate A workflow definition has since been corrected to Node 24.17.0 and
includes an explicit runtime check. Those changes do not retroactively alter
the cancelled run. A second queued duplicate was cancelled before execution;
no repeat submission of `Screenshot_16.jpg` was made. The latest Gate A
status remains NOT PASSED. Any continuation must first implement and verify
artifact-bound resume for the existing first PDF/raster, then process only
the 15 unprocessed source hashes, preserving the first run's missing-log and
runtime limitations in the final evidence. No Gate A PASS may be claimed from
this mixed/interrupted evidence.
