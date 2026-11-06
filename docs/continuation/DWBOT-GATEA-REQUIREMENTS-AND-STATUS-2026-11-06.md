# Gate A requirements and current evidence status

**Date:** 2026-11-06  
**Status:** NOT PASSED — evidence and source-image prerequisite remain open.  
**Scope:** The approved 16-image development corpus; no OCR.Space requests were initiated by this status review.

## 1. What Gate A must demonstrate

Gate A is the PDF-first development acceptance gate, not the independent holdout gate. It must use the approved 16-image development corpus with the nine mandatory fields:

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

Required evidence:

1. Exact 16-image source archive, manifest and per-image SHA-256 values. The source archive fingerprint must be locked and recorded before processing.
2. Windows runtime on the exact project standard Node.js 26.13.0 (LTS). All CI and local acceptance runs must use this exact version. The Gate A acceptance runner must be Windows x64; a Linux Node distribution does not satisfy this Windows-specific requirement.
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

The exact `imgs2add.zip` archive bytes are not currently present in the accessible Library or repository. However, the repository contains the 16 individual source fixtures under `fixtures/additional-screenshots/`; the Gate A preflight verified every filename, byte length and SHA-256 against the approved nine-field manifest. The separate `imgsHalf1.zip` archive is not a substitute and must not be used.

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

The original `imgs2add.zip` container is still unavailable, but its 16 expected image files are individually present and have passed source-hash preflight. This is sufficient to bind each Gate A request to its approved fixture without inventing or substituting an archive. Continue only from the verified fixture manifest and preserve the missing original ZIP as a provenance limitation. Do not reuse `imgsHalf1.zip` as a substitute and do not treat the historical native-16 report as a Gate A pass.

## 5. Relationship to the current 19-image Gate B work

The completed 63-image exploratory run produced 63 searchable PDFs and 63 PDF-derived raster files. Its downloaded artifact passed independent file-level checks for all 63 pairs: sizes, SHA-256 values, signatures, one-page PDFs, non-empty searchable text layers and raster dimensions. The 19 selected Gate B subset has separate artifact verification for PDF integrity, searchable text, raster integrity and PDF-derived raster provenance.

However, the extraction run's original network diagnostic log is missing, and the 19-image post-hoc evaluation has many unresolved mandatory fields. The historical exploratory run used Node 22.16.0 and is not current-runtime acceptance evidence under the new exact Node.js 26.13.0 project standard. Gate B therefore remains NOT PASSED regardless of the exploratory field-level percentages.

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
- Manifest SHA-256: `9e8ab701428a93e0ceb2306447e29bedd697b1c2ed50520d057414d8224e79bd`.

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

The partial run used Node 22.16.0, which meets the currently authorized
Node >=22.16.0 runtime floor. The source commit's older
`scripts/block-network.js` only appends the diagnostic file when a blocked
request occurs and silently catches log-write failures. The artifact contains
no original network log; its historical denied-attempt count is unknown. Do
not create an empty file after the fact and claim zero attempts. The partial
Gate A report correctly records FAIL.

The first artifact-bound continuation, run #42246737451, verified the exact
prior run/artifact identity and completed preflight, but stopped before any
new provider request. Its local resume-preparation step failed because the
original `gate-a-acceptance.json` is UTF-8-BOM-prefixed and the helper did not
strip the BOM before JSON parsing. The log confirms the 16-image OCR.Space
step was skipped; the first image was not resubmitted and no remaining images
were submitted. The parser has now been made BOM-safe and a regression test
added. The next exact-trigger continuation is queued as #42247731956. It must
again verify/reuse the original first PDF/raster and may process only the
remaining 15 source hashes if the local nine-field recovery is exact. The
original network-log absence remains a blocker; Gate A must not be reported
as passed from reconstructed evidence.


## 7. Gate A workflow hardening after the interrupted run

The current Gate A workflow definition (for any future explicitly triggered
run) now:
- uses Node 22.16.0 and checks the runtime before OCR execution;
- loads the candidate network guard first and the current fail-closed
  diagnostic wrapper second, so the fail-closed logger wraps candidate network
  hooks and records denied attempts;
- uploads the sequence `report.json.progress.json` checkpoint alongside
  reports and PDF/raster artifacts;
- remains one-time-message gated and does not run on ordinary pushes.

These are future-workflow protections only. They do not repair or rewrite
run #42202563673 and do not reconstruct its missing original network log.
The original first-image request was made without proven restricted-egress
enforcement, so its PDF is historical evidence only and cannot count toward
Gate A. The safe local-only recovery path must never resubmit that image. A
new fully guarded Gate A run, if authorized, must bind all 16 images to a new
source-bound report and fresh restricted-egress diagnostic log; this will
repeat the first provider request because the earlier request is ineligible.


## 8. Runtime floor reconciliation — 2026-11-06

The later user-authorized runtime decision recorded in `plan1.txt`, the
current living plan and `package.json` supersedes older Node 24.17.0 / 24.22.1
minimum statements in this document. The current accepted minimum is
**Node.js >=22.16.0**. Node.js 24+ remains permissible but is not mandatory.
The current Gate A workflow uses Node 22.16.0 and its explicit runtime check
uses the same floor.

Accordingly, any older statements in this document describing Node 22.16.0
as below the accepted runtime are historical and superseded.
This correction does not change Gate A's status: the interrupted run still
contains only 1/16 PDF/raster pairs and lacks its original restricted-egress
diagnostic log. Gate A remains NOT PASSED.


## 7. Current artifact-bound continuation — run #42246737451

- The continuation was started using the exact trigger commit message
  `DWBOT-GATE-A-16-PDF-FIRST-RESUME-15`.
- Preflight passed all 16 repository fixtures against the approved manifest;
  the source run #42160979140 and locked candidate fingerprint matched.
- Node 22.16.0 was provisioned for the candidate runtime. OCR/PDF tools and
  pinned PaddleOCR runtime setup were underway at the latest poll.
- The continuation is explicitly bound to cancelled run #42202563673,
  artifact ID 13495008195, artifact ZIP SHA-256
  `398f8152847cd3ea58fb9e16ac01886fced0c880869ce6a430d3343e5cb4ecd8`.
  Its source log contains exactly one provider-start marker:
  `1/16 START Screenshot_16.jpg`. Its artifact contains exactly one PDF and
  one PDF-derived raster for that source hash. The first provider submission
  is to be reused and must not be repeated.
- The local-only preparation step will re-read the existing PDF-derived raster
  and compare all nine fields. If it cannot recover the first record exactly,
  the workflow must stop before any remaining provider request. If exact, it
  may submit only the other 15 images.
- The original restricted-egress log from run #42202563673 is absent.
  The continuation records this as
  `MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT`, with historical attempt count
  `null`/UNKNOWN. A new empty log covers only the new continuation and cannot
  reconstruct the prior run. Do not claim Gate A network proof from that
  synthetic/current log.
- At this update the run was still in progress and no Gate A pass was claimed.


## 8. Second artifact-bound local recovery — run #42247731956

- The exact prior partial artifact and all 16 source hashes passed preflight.
  The run installed the pinned PaddleOCR runtime and downloaded the existing
  partial artifact. It did not submit any OCR.Space requests.
- The local OCR child wrote its output to
  `resume-first-local-reader.json`; the parent then attempted to write the
  enriched wrapper report to the same path with exclusive-create semantics.
  This caused `EEXIST` before the first record comparison was saved. The
  provider step was skipped, and the original first image was not resubmitted.
- The child-output and wrapper-report paths are now separated. The helper also
  refuses any future paid continuation unless the original network log is
  present and proves exactly zero blocked attempts. The current original
  artifact still lacks that log, so the next run must stop after local
  diagnostic recovery and record `BLOCKED_MISSING_ORIGINAL_NETWORK_LOG`;
  it must not submit the remaining 15 requests.
- Run #42249978731 is the new exact-trigger local-only recovery attempt. Its
  purpose is to verify the first image from the existing PDF/raster and
  produce a source-bound block report. No new provider submission is
  authorized by this run.
- Gate A remains NOT PASSED. The historical original blocked-attempt count is
  UNKNOWN and cannot be converted to zero by creating a new empty log.


## 7. Superseding provider authorization and runtime decision — 2026-11-06 17:24 local

The user has explicitly superseded the earlier blanket restriction on additional OCR.Space provider requests and authorized additional provider requests and project-wide changes. This permits new, deliberately initiated, guarded acceptance submissions for Gate A and other specifically planned test batches. The previous instruction “no new OCR.Space submissions” is no longer current.

This authorization does not remove the safety requirements for a provider transaction:
- record a new submission intent and source fingerprint before sending;
- use the protected OCRSPACE_API_KEY secret only;
- require OCR.Space allowlist access and restricted-egress diagnostics before provider calls;
- validate each response, searchable PDF, download, signature, size, provenance, and derived raster;
- do not automatically retry an ambiguous request that may have been accepted or charged; reconcile its transaction state first;
- keep exploratory batches and acceptance batches explicitly labelled and separately reported;
- do not treat a new batch as passing Gate A or B until all gate criteria are met.

The first new guarded provider acceptance run is to be a fresh 16-image Gate A batch, bound to the current Node.js 26.13.0 source candidate and a verified source-run fingerprint. It is not a continuation of the quarantined partial historical request. The prior first-image duplicate restriction is superseded for a newly initiated, explicitly identified fresh acceptance run; it is not permission to repeat an ambiguous in-flight transaction.

The project runtime standard is now exactly Node.js 26.13.0 (not “22.16.0 or newer” and not a Node 24 compatibility target). Historical run records retain their original runtime labels and cannot be upgraded retroactively.
