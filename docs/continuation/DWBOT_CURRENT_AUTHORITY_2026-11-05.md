## Current governing update — 2026-11-06 (19-image Gate B)

- Gate B is now exactly the first 19 corpus-order records in the v6 ground
  truth with complete, non-empty, eligible values for all nine required
  fields. This supersedes both the former 50/100 target and the interim
  21-image Gate B requirement.
- The 21 complete records remain a separate pipeline-analysis inventory; the
  last two complete records are not Gate B labels. The 4-image and 16-image
  pipeline/Gate A requirements remain separate and unchanged.
- Original OCR.Space run #42160979140 completed successfully. Its 81,886,966
  byte artifact was downloaded and independently SHA-256 verified. It contains
  63 searchable PDFs and 63 PDF-page rasters; all 126 matched the report's
  byte counts and hashes, and all 63 PDFs contain searchable text.
- Existing 21-image post-hoc analysis: Tesseract.js 123/189 eligible field
  matches (65.08%), 2/21 exact nine-field records; native Tesseract 116/189
  (61.38%), 0/21 exact nine-field records. Both engines have unresolved
  mandatory outputs; each has two wrong candidates and zero wrongly accepted
  values in that report. These are exploratory metrics, not Gate B pass data.
- The original source artifact omitted imagesF-63-blocked-network-attempts.log.
  The triggering workflow enabled the non-OCR egress guard but did not set
  OCR_NON_OCR_NETWORK_LOG, so the guard had no persistent log destination.
  The verifier workflow now creates a provenance-preserving reconciliation
  report; it explicitly leaves the original attempt count unknown and does
  not claim zero attempts. A new verification cannot pass the original-log
  network gate on reconstructed evidence alone.
- The first 21-image verification workflow completed green but its verifier
  step actually failed on undefined recoveryNetworkOk/recoveryNetworkLogPath
  references. Its uploaded post-hoc report remained
  PENDING_ARTIFACT_VERIFICATION. Do not treat that workflow conclusion as a
  verifier pass. The verifier and workflow are being corrected for a fresh
  no-provider 19-image check.
- Gate A remains FAIL/BLOCKED; Gate B remains NOT_PASSED; production remains
  NO-GO. The v6 workbook is a partial working transcription reference, not
  certified acceptance-grade ground truth.

The earlier status snapshot and implementation notes below are retained as
historical provenance; this current update governs.

---

# Current DWBOT authority — updated 2026-11-06

IMPLEMENTATION / VERIFICATION STATUS — 2026-11-06


## Current main / Gate B status — 2026-11-06

- The source-comparison checkpoint was main commit
  46810b5cd76a9148507b2aaa5f4262850c7cbbe4; later commits through the current branch head updated documentation,
  evaluator/test code, ground-truth/manifest metadata, desktop UI copy/contract
  tests, and workflow guards/network logging; OCR pipeline modules and the
  dependency lockfile remain unchanged.
- Exact-head DWBOT verification for the latest main commit is pending; no test
  pass is claimed until the current run's jobs finish and logs/artifacts are
  inspected.
- Existing imagesF-63 OCR.Space run 42160979140 remains in progress at its
  PDF-first extraction step. No artifacts are listed yet. Do not restart it.
- The run's OCR implementation, PDF-first runner, quota ledger, network guard,
  source preflight, PDF contract test and package-lock blobs match current main
  at the compared source checkpoint. package.json differs only in scripts;
  dependencies and Node engine declarations are identical. The run remains
  bound to its original trigger commit and report fingerprint.
- Older push-triggered run 42171236931 is cancelled with no jobs. Run
  42171484972 remains pending with no jobs under the prior workflow revision;
  its job-level workflow_dispatch guard prevents provider requests. The current
  workflow has only a workflow_dispatch trigger, so later pushes cannot create
  provider runs. No duplicate OCR.Space requests were initiated.
- Gate B is exactly the approved 21-image subset, replacing the former
  50-image minimum / 100 preferred target. Gate B remains NOT_PASSED pending
  verified PDFs/rasters, bound artifact report, post-hoc metrics, zero wrongly
  accepted mandatory values, and clean network/secret evidence.
- Reproducible checklist and report schema:
  docs/continuation/DWBOT-UPD-2026-11-06-006-parallel-release-readiness-and-gateB-21.md.
- The v6 reference remains a partial manual-transcription source for the
  63-image corpus; this change does not certify the workbook or the 42 partial
  records. Production remains NO-GO.

- Requirement change committed on canonical main. Implementation commits:
  66daf0df84532afd0699954d88dd08f2c313fc95 (evaluator, deterministic
  21-record test, package command, living-plan/authority/guide update);
  c767c79ef1a49f96fab4562de028dfafec4f1e71 (README and active authority
  alignment); 74df17ace156507571d58bfe4b9ded38c61a3aca (manual-dispatch-only
  guard for billable 63-image workflow); 505bfdb76ae8ff470f8e0966b70ea2fde9e239af
  (README evaluator instructions).
- Exact selection was checked against the v6 JSON: 21/63 records, precisely
  corpus records 1–21, each COMPLETE_9_FIELD_TRANSCRIPTION and all nine
  fieldStatus.eligible_for_exact_match flags true. The source file hashes,
  byte sizes and dimensions remain bound to each original record. One record
  is 1334x627; selection does not impose a new pixel threshold.
- The post-hoc evaluator now accepts --inventory complete-ground-truth-21,
  filters the existing 63-image report to those 21 names, counts missing rows
  and source-hash mismatches as unresolved, and computes per-engine field/full-
  record metrics. Gate B requires a separate artifact/network verification
  report and remains NOT_PASSED until all criteria pass. The evaluator never
  calls OCR.Space.
- The 63-image exploratory run already in progress remains run 42160979140.
  An accidental duplicate push-triggered run 42168859431 was replaced in the
  Actions concurrency queue and is confirmed CANCELLED before any job started.
  The newer push-triggered workflow run 42168986594 uses the new
  workflow_dispatch-only job guard; it is pending and must skip its provider
  job. Future pushes cannot start this billable 63-image extraction.
- Exact-head DWBOT verification run 42168986699 is pending. No test pass is
  claimed until its jobs complete and are inspected. The 21-image post-hoc
  evaluator has not run because the existing 63-image PDF/raster artifacts
  are not yet available. No duplicate OCR.Space submissions were made.
- The 4-image and 16-image tests remain required. The separate 64-image
  inventory run is retired; its manifest/runner/tests remain legacy material.
  Gate B's user-authorized minimum is now exactly 21 complete nine-field images
  from the v6 subset, replacing the former 50 minimum / 100 preferred target.
  The v6 workbook remains a partial working reference, not certified corpus-
  wide ground truth. Gate B remains NOT_PASSED pending actual evidence; production
  NO-GO.


## Node.js runtime authorization — current and governing

Node.js **22.16.0 is the authorized and acceptable DWBOT baseline**. It replaces
older Node.js 24+, >=24.17.0 and v24.22.1 minimum/prerequisite statements.
The current package manifest and lockfile require >=22.16.0; the tracked
`.nvmrc` pins 22.16.0; and GitHub Actions uses 22.16.0 on Linux and Windows.
Node 24 remains optional only when a specific dependency/tool is proven to
require it. Do not block tests or release-candidate verification solely because
the runtime is Node 22.16.0. Windows-specific acceptance must still run on
Windows; this authorization does not convert Linux results into Windows proof.
Keep actual historical Node 24 reports unchanged and bound to their original
source fingerprints and runtime.

## Controlling OCR.Space architecture and activation

OCR.Space is the explicitly enabled, highest-priority text-extraction stage for every eligible original image in the authorized DWBOT screenshot inventories. Set `OCRSPACE_ENABLED=1`, `OCRSPACE_NETWORK_ALLOWLIST=1`, and provide a valid local `OCRSPACE_API_KEY`. Do not describe the active path as default-off, secondary, last-resort, or diagnostic-only.

OCR.Space Engine 2 must process each eligible original World of Warships screenshot first and create one searchable PDF. The searchable text layer is hidden from the rendered page but remains searchable. Download and validate the PDF over the approved HTTPS OCR.Space hosts, preserve its hash and bytes in the configured acceptance artifact directory, and render the PDF page locally to a bounded raster. Tesseract.js, native Tesseract, PaddleOCR (when enabled), OpenCV geometry and all subsequent local readers operate only on that PDF-derived raster. No local reader may fall back to the original screenshot after PDF-first processing begins. A missing/invalid PDF, failed download, failed required artifact preservation or rasterization error fails that image closed.

The current provider comparison marks Engine 2 searchable-PDF generation supported and Engine 3 unsupported; Engine 2 is the PDF-producing first pass. One OCR.Space request/PDF per eligible source image. Provider response text and the PDF text layer remain separate diagnostic/provenance evidence and cannot independently accept, merge, rewrite or override mandatory fields.

## Provider network policy

`OCRSPACE_NETWORK_ALLOWLIST=1` explicitly permits HTTPS access to `api.ocr.space` and `ocr.space` for the provider request and temporary PDF download. The network guard must not block these provider hosts. `OCR_NON_OCR_NETWORK_RESTRICTED=1` restricts only unrelated outbound destinations; it is not a provider network block. Keep unrelated egress restricted rather than enabling arbitrary destinations.

`OCRSPACE_ENABLED=0` is permitted only for isolated mocks/offline tests that do not submit an original image, or for downstream local-reader invocations after the successful PDF-first stage has already produced the raster. It must never be used to process an eligible original image as a local-only fallback.

## Scope, privacy and acceptance

The active PDF-first inventory test matrix is 4 images, 16 images, and the 21 complete-ground-truth records selected from the current 63-image exploratory corpus, including visible player names. The separate 64-image inventory requirement is withdrawn. Reuse existing 63-run artifacts for the 21-image post-hoc evaluation; do not make duplicate provider submissions. Do not transmit unrelated images, credentials, Discord IDs, private account data or unrelated UI. No paid tier/usage, production screenshot transmission, live Discord action or production deployment is authorized. Keep API keys out of source, chat, logs, reports and artifacts; retain quota reservations, no automatic retries, bounded requests, fail-closed behavior and current provider terms/privacy review.

Nine mandatory fields remain exactly: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Zero wrongly accepted mandatory values is required; Gate A also requires zero unresolved mandatory fields. Production remains NO-GO until all gates pass.

## Current source checkpoint

- Canonical repository: `pbrau014/braultDwBotVis`, branch `main`.
- Exact-head run 399 tested main commit `0547237613e3ee331244a591b959642b789b151c`; this authority synchronization is documentation-only on top of that checkpoint.
- Current living plan: `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`.
- OCR.Space implementation guide: `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`.
- Source/test commit `18113f36bf3dc87c95407435a54e204e937734d5` aligns eligible screenshot acceptance with OCR.Space Engine 2 PDF-first. The 64-image safety correction is verified on code checkpoint `2362320ab0daaa001303012a212296bd27bd350a`: only 56 user-eligible images can be submitted; eight user-excluded images are skipped, and all 64 member hashes plus realpath containment are checked before any provider request.
- Exact-head run 399 tested `0547237613e3ee331244a591b959642b789b151c`. Linux focused OCR.Space suite: 51 passed, 0 failed, 0 skipped; Linux full suite: 309 passed, 0 failed, 2 skipped. Windows full suite: 309 passed, 0 failed, 2 skipped. The six 64-inventory safety tests passed in the full suites.
- PDF manual and clean-package job passed. Clean extracted package npm test: 308 passed, 0 failed, 3 skipped; prelive: 21 passed, 0 failed. Package manifest verified with 550 entries. Package ZIP SHA-256: `faeaa16b4d6b4a98582623a070c7778283543266d5138bc1b4e7848629d2d3d5`. Artifact ID `13471702699`, SHA-256 `37bd1b652c2bafd31301ce1ba4351be32e9d65b62a017c076fdc3e4cc256215c`.
- Run 399 is an overall FAILURE because the Windows protected-secret check reported `OCRSPACE_API_KEY configured: False`. The current-source screenshot-acceptance step was skipped. No live OCR.Space request, searchable PDF, 4-/16-image acceptance or 64-image processing is verified.
- The retired 64-image manifest/runner remain historical regression material only. The active replacement subset is exactly the first 21 corpus-order records in the v6 ground-truth JSON with COMPLETE_9_FIELD_TRANSCRIPTION and all nine eligible_for_exact_match flags true. This subset is the approved 21-image Gate B holdout; it does not certify the workbook.
- The approved 21-image Gate B holdout is the first 21 corpus-order v6 records with complete, eligible values for all nine fields. The supplied manual transcription is independent of OCR outputs but not documented as blind double-annotated. Preserve that qualification; Gate B still requires artifact verification, zero wrong accepted values and clean network evidence. Production remains NO-GO.
- The repository Actions secret is confirmed missing/empty. The repository owner must add `OCRSPACE_API_KEY` under Settings -> Secrets and variables -> Actions -> New repository secret; never paste the key into chat or logs. Rerun the exact-head workflow after it is configured.
- Windows acceptance sets a per-run `OCRSPACE_ARTIFACT_DIR`; the current 63-image exploratory runner writes per-image PDF/raster artifacts. Reuse the 21 selected records from those outputs for post-hoc evaluation; do not repeat provider submissions. For other runs requiring durable evidence, configure `OCRSPACE_ARTIFACT_DIR` and verify the actual files/checksums.

The canonical living plan controls the operational queue and supersedes older dated handoff/status text. Preserve the historical records below as provenance; do not promote their former Engine 3/crop-first/default-off instructions to current policy.

- The repository-side candidate manifest now includes the explicit
  gateBSubset list (21 filenames, bytes and SHA-256 values) bound to the v6
  reference. Its automated test confirms zero SHA-256 overlap with the 16-image
  development corpus. The embedded ZIP manifest remains unchanged.
- The 63-image workflow no longer has a push trigger; it is workflow_dispatch
  only, with a second job-level event guard. A push-triggered run already
  queued under the older workflow revision has no jobs and cannot submit.
- The active 42160979140 run predates persistent network-log configuration.
  The current workflow now initializes and uploads
  imagesF-63-blocked-network-attempts.log. For the active run, inspect
  localReaderFailures and completed job logs; if zero unauthorized attempts
  cannot be established, Gate B remains blocked.

- Latest recorded Gate A status remains FAIL/BLOCKED; no newer current-source
  Gate A pass evidence has been located. Therefore the 21-image Gate B holdout
  is approved as the new sample-size requirement, but Gate B cannot pass until
  the 16-image Gate A is rerun and passes on the locked candidate fingerprint.

- The Gate A evidence block is an attestation: evaluator checks its reported
  metrics and fingerprint/hash formats, but does not parse the underlying Gate
  A report. Preserve and manually verify the original Gate A report, its SHA-256
  and the candidate fingerprint against the Gate B run before recording PASS.
