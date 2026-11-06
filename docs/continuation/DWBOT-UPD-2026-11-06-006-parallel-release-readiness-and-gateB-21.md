# DWBOT parallel verification and Gate B artifact acceptance record

Date: 2026-11-06
Repository: pbrau014/braultDwBotVis
Branch: main

## Gate B authority and exact selection

Gate B now uses exactly 21 images, replacing the former 50-image minimum and
100-image preferred target. The 21 are the first 21 corpus-order records in
the v6 ground-truth JSON with COMPLETE_9_FIELD_TRANSCRIPTION and all nine
required fields eligible and non-empty. They are outside the 16-image
development corpus and must not be used for tuning.

Required fields: result, player, map, mode, battleStart, credits, freeXp,
damage, xp.

The supplied manual transcription is independent of OCR outputs, but the
archive does not document a blind second reviewer. Preserve that provenance
qualification. This amendment does not certify the workbook or the 42 partial
records.

## UI source and test review

Inspected desktop/upload.html, desktop/upload.js, desktop/desktop.css and
tests/desktop-ui-contract.test.js.

- Upload validation enforces one image and 25 MiB using 25*1024*1024; UI copy
  is now stated as 25 MiB.
- The file picker is a keyboard-operable button. The drop target is a labelled
  region with aria-describedby, not a second nested button.
- Page guidance describes Engine 2, searchable PDF, PDF-derived local readers
  and fail-closed behavior.
- Global :focus-visible styling and prefers-reduced-motion handling are
  present.
- Contract tests cover same-origin upload, CSRF, local-only API use, credential
  exclusion including OCRSPACE_API_KEY, one-file type/size validation,
  progress, drop-zone semantics, focus visibility and reduced motion.
- These are source/contract checks, not rendered-browser visual, keyboard
  session, screen-reader or live OAuth acceptance. Exact-head CI must pass.

## PDF-first workflow review

Inspected src/ocrspace-client.js, src/ocrspace-pdf-first.js,
scripts/run-ocrspace-imagesF-63-exploratory.js and the 63-image workflow.

Verified: Engine 2 searchable PDF request; bounded API/download timeouts; 25 MiB
PDF cap; HTTPS host allowlist; redirect rejection; PDF signature; quota
reservation before request; no automatic retry; fail-closed original-image
fallback prohibition; per-image PDF/raster hashes and metadata; artifact
upload with if: always(); manual-dispatch-only workflow guard.

Risks: the runner has no cross-run resume/idempotency, so a manual rerun of an
interrupted batch could resubmit completed images. Do not rerun without
reconciling previous progress and artifacts. Per-image write interruption can
leave a provider submission without complete artifacts. The PDF response streaming path is bounded, but the arrayBuffer fallback checks
size only after allocation. The OCR JSON response has a similar non-streaming
response.json fallback whose size check occurs after parsing. Source inspection found no intentional API-key logging, but
actual run logs/artifacts still require exact-value scanning in a protected
environment; never print the key. The active run is on its fixed earlier
commit and is unaffected by later source changes.

## Reproducible artifact verification checklist

1. Fetch artifact list for the exact run ID; preserve artifact ID, size,
   archive digest, expiration and download timestamp.
2. Download once, hash the ZIP before extraction, preserve original ZIP.
3. Extract to a clean isolated directory; reject path traversal, absolute
   paths, duplicate names, symlinks and unexpected members.
4. Verify final run report and .sha256 sidecar; retain progress.json as
   intermediate evidence, not a replacement final report.
5. Verify source archive SHA-256:
   6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3.
6. For each selected filename, compare run source hash and byte size with v6.
7. Require exactly one run row and providerSubmissionAttempted=true per image.
8. Require pdf-first-complete; contained relative PDF/raster paths; both files.
9. Verify PDF byte count, SHA-256 and %PDF- signature.
10. Verify searchable PDF text layer with a PDF text extractor; record tool,
    version, command, exit code and extracted-text hash.
11. Verify raster byte count, SHA-256, PNG signature and dimensions.
12. Verify PDF-to-raster provenance by rerendering the retained PDF with the
    pinned rasterizer and comparing dimensions/pixels or deterministic hash.
13. Confirm originalScreenshotFallback=false and inspect logs for fallback.
14. Inspect both local-reader outputs, accepted flags, unresolved fields and
    all nine expected/actual values.
15. Verify allowlisted provider network, unrelated egress restriction and
    zero unauthorized attempts; preserve blocked-network-attempts log.
16. Scan logs, JSON, text and metadata for the exact protected key in its
    protected environment; report only PASS/FAIL and paths, never key/content.
17. Record runtime, engine/model, source commit, lockfile, workflow/job IDs,
    timestamps and all artifact hashes.

Any missing PDF/raster, source mismatch, unsearchable PDF, fallback, network
failure, secret leak, duplicate or missing selected row blocks Gate B.

## Artifact verification report schema

Create artifact-verification-report.json beside the final run report only
after completing the checklist. This is a template, not completed evidence:

    {
      "schemaVersion": 1,
      "status": "VERIFIED",
      "runReportSha256": "<exact final run report hash>",
      "groundTruthSha256": "<exact v6 JSON hash>",
      "inventorySelection": {
        "id": "complete-ground-truth-21",
        "selectedImageCount": 21,
        "verifiedImageCount": 21,
        "allSelectedImagesVerified": true
      },
      "checks": {
        "sourceImageHashes": "PASS",
        "pdfIntegrity": "PASS",
        "searchablePdfTextLayer": "PASS",
        "rasterIntegrity": "PASS",
        "pdfDerivedRasterProvenance": "PASS",
        "networkRestriction": "PASS",
        "unauthorizedNetworkAttempts": 0,
        "secretLeakScan": "PASS",
        "originalScreenshotFallback": false
      },
      "images": [
        {
          "filename": "<exact selected filename>",
          "status": "VERIFIED",
          "sourceSha256": "<source image SHA-256>",
          "pdfSha256": "<PDF SHA-256>",
          "rasterSha256": "<PDF-derived PNG SHA-256>"
        }
      ]
    }

The evaluator binds this report to exact run-report and ground-truth hashes
and reconciles each per-image source/PDF/raster hash.

## Post-hoc evaluation and Gate B criteria

After artifact verification, run:
npm run evaluate:ocrspace-imagesF-21

The evaluator counts missing run rows and source-hash mismatches as unresolved,
excludes partial/uncertain reference fields, and reports per-field exact-match
rate, wrong accepted/unaccepted values, unresolved outputs, nine-field
exact-record rate and per-engine metrics. It never calls OCR.Space. Gate B
PASS requires the bound verified artifact report, all 21 rows, both reader
outputs, matching source/PDF/raster hashes, zero wrongly accepted mandatory
values and zero unauthorized network attempts. Unresolved outputs remain
unresolved, never matches. Gate A's zero-unresolved criterion remains separate.

## Other authorized work independent of the active extraction

- Exact-head UI/contract CI, then browser visual, keyboard and screen-reader QA.
- Secret scan and rotate previously exposed credentials before reuse.
- Review 25 MiB streamed ingestion, worker limits, cancellation and cleanup.
- Workbook/scoring parity against authoritative workbook source.
- Desktop OAuth and isolated Discord staging when staging prerequisites exist.
- GrandYoloInstruct deliverable reconciliation against authoritative inputs.
- PDF/clean-package and source-manifest verification.

Do not start another OCR.Space submission, retry the active run, or claim Gate A,
Gate B or production acceptance from source review alone.


## Existing run source-fingerprint comparison — 2026-11-06

The active exploratory run 42160979140 was triggered at commit
adaf4f8c3a9573f56d0348a4bba36686fc31c22e. GitHub blob SHA comparisons against
main at b58175e07ee1e47cb1fdbbecee398fc3af9e9fc4 found identical content for
src/bot.js, src/ocrspace-client.js, src/ocrspace-pdf-first.js,
src/ocrspace-quota-ledger.js, scripts/run-ocrspace-imagesF-63-exploratory.js,
scripts/block-network.js, scripts/prepare-ocrspace-imagesF-63.py,
tests/ocrspace-pdf-first.test.js and package-lock.json. package.json differs
only in scripts: the current branch adds the 21-image test/evaluator command
and removes the retired 64-image package command; package name/version,
Node engine, dependencies and allowScripts are identical. Thus the active run's
OCR implementation and locked dependencies match the current main source for
the compared files; the report still remains fingerprint-bound to its original
triggering commit.

At the latest check, run 42160979140 remained in_progress at the
"Run OCR.Space Engine 2 PDF-first exploratory extraction" step and listed no
artifacts. Exact-head verification run 42170621125 was pending with no jobs
reported yet. Push-triggered 63-image workflow run 42170489690 was pending with
no jobs reported; the current workflow's job-level workflow_dispatch guard
prevents a push event from executing provider submissions. No duplicate
OCR.Space submission is claimed or initiated.


## Restricted-egress log persistence

Source review found that block-network.js records denied non-OCR.Space
destinations only when OCR_NON_OCR_NETWORK_LOG is set. The workflow enabled
restriction but did not set this log path. The workflow now initializes an
empty log before extraction, passes the path to the runner, and includes it in
the always-upload artifact list. The already-running 42160979140 job is pinned
to its original workflow commit and cannot gain this log retroactively; for
that run, inspect the run logs and every localReaderFailures entry for
OCR_NETWORK_BLOCKED, and do not claim a clean zero-attempt result if the
evidence is insufficient.


## Candidate manifest alignment

The repository-side 63-image candidate manifest now carries a derived
gateBSubset block listing the exact 21 selected filenames, byte sizes and
source SHA-256 values, bound to the current v6 JSON SHA-256. Its usePolicy now
distinguishes the full 63-image exploratory archive from the approved 21-image
Gate B subset. The embedded manifest inside the original candidate ZIP and its
fixed preflight fingerprint remain unchanged for provenance and reproducibility.


## Intake, queue and process-resource audit

Inspected attachment-download.js, desktop-bridge.js,
serial-task-queue.js, ocr-process-supervisor.js and their corresponding
download, desktop bridge, queue, supervisor and Windows cancellation tests.

- Discord attachment downloads reject declared over-limit sizes before
  transfer, use a 30-second AbortSignal timeout by default, enforce the
  25 MiB cap while streaming, cancel the response reader when the cap is
  exceeded, and reject empty bodies.
- Desktop upload enforces the same 25 MiB cap, uses a 120-second request
  timeout and 15-second header timeout, caps concurrent uploads at two
  (default one), and has tests for exact 25 MiB acceptance, over-limit
  rejection and concurrency-slot release.
- The desktop bridge does not buffer bytes beyond the limit, but for
  chunked requests without an oversized Content-Length it continues draining
  the request after crossing the cap before returning 413. Memory is bounded
  and request time is bounded by the server timeout, but early connection
  termination would further reduce bandwidth/CPU exposure. Track as a
  hardening opportunity; no production code changed in this audit.
- The serial queue is single-consumer and bounded (default eight outstanding,
  90-second task deadline). It performs timeout cleanup, waits for work to
  settle, and halts the queue if cleanup or settlement cannot be confirmed.
- The process supervisor uses no shell, caps combined child output at 10 MiB,
  has an independent process deadline, kills process trees (Windows taskkill
  /T /F with direct-child fallback), and requires child close confirmation.
  Unconfirmed termination raises SERIAL_TASK_UNSETTLED and the queue fails
  closed.
- Contract tests exist for bounded attachment reads, 25 MiB desktop upload,
  upload concurrency, queue backpressure/timeout/cleanup, process-tree
  termination and Windows cancellation. Exact-head CI remains pending; no
  pass is claimed until these tests execute on the final commit.
