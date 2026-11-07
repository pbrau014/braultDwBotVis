# DWBOT Source Reconciliation — 2026-10-28

## Status
**Candidate / blocked for authoritative release.** The archive inputs pass ZIP integrity checks and the Iteration 21 patch's 21-entry SHA-256 manifest verifies. The continuation archive's own embedded `SHA256SUMS.txt` does not match 26 files in the pristine extracted continuation tree. The source archive itself passes ZIP integrity, but that internal manifest is stale/inconsistent and is preserved as historical evidence. A fresh candidate-source `SHA256SUMS.txt` was generated after edits; all 398 listed files verify successfully. The package will also have its own separate manifest.

## Verified input archives
- `YoloDiscordBotV4.zip` — SHA-256 `b57942298f9d1405946f2eadf249ece94cf1cde05131172e44d0a4cd51099899`; ZIP integrity passes; 4,000 entries.
- `DWBOT_ITERATION21_PATCH.zip` — SHA-256 `35bdedfcfdeb3f861bb6b8e444732962644a053b7140c7494504a13e6c858d14`; ZIP integrity passes; all 21 manifest entries verify.
- `DWBOT_ITERATION21_SOURCE_CONTINUATION_2026-10-27.zip` — SHA-256 `1ee665cdf36504bf242b3ced74c72affcfbf544d87c40428747df676bee272c6`; ZIP integrity passes; its embedded manifest reports 26 mismatches on a fresh extraction.
- `artifacts.zip` — SHA-256 `daabff336d8182fcc72e0b065a6fbb07697bdda942d3eabddc9007589208dad2`; ZIP integrity passes.
- `plan1ext(1).zip` — SHA-256 `dbbb47817de7dbab30ca0ea0c75d472d74d85e554e51a688771b0fe092fd96de`; ZIP integrity passes.
- `chtGptLimits.zip` — SHA-256 `6cc2535bfec263e2354da5c9de1b3fc36955f102694577a01d1f9fb10203c7c6`; ZIP integrity passes; its `chtGptLimits.txt` is included unchanged as a reference.

## Plan and instruction variants
The three `plan1.txt` copies in V4 and the `plan1.txt` in `plan1ext(1).zip` are byte-identical (SHA-256 `91aa09e0d5d512b1df1a3262c32dd329d1169a1b867a8f5592b6b2726141f1f3`). The continuation's active plan is newer and differs; it is the working plan updated for this candidate.

The two `addedImgProcess.txt` variants are not identical. V4's embedded version has SHA-256 `307f4575a0b34e5d8d9c7a9c0069086e92f41da61a8fb3934d32455ac103f125`; the planext variant has SHA-256 `484dcfee0e9a5a2d5df4c5fb5ab6caa63aaa7251b342701d026d7e178f5f4f4c`. The diff is preserved in `ADDEDIMG_VARIANTS_DIFF.txt`. The V4-embedded version is placed at `admin/implementationNotes/addedImgProcess.txt` because it is part of the hash-verified base archive; the alternate is retained under `docs/source-reconciliation/`.

The alternate variant says to always keep using PaddleOCR and OpenCV. This is not treated as permission to enable either component without measured benefit. The preserved benchmark evidence reports that the integrated PaddleOCR candidate regressed exact mandatory-field accuracy, complete records, false acceptance, and latency. Keep `PADDLEOCR_FIELD_FALLBACK=0`; keep CV assistance disabled until a same-input benchmark demonstrates improvement. Both variants and the conflict remain visible for future review.

## Nine-field contract applied to active candidate
All nine fields are mandatory and ordered as follows: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP is ninth/final. Missing, invalid, uncertain, or conflicting XP blocks acceptance. The Iteration 21 patch's historical eight-field/optional-XP policy has been superseded in the active source, tests, current manifests, and operator documentation. Historical reports and prior metrics are not rewritten and must not be presented as evidence that the nine-field contract passes OCR accuracy.

## Current verification
- All six input ZIP files passed `unzip -tq`.
- Iteration 21 patch SHA-256 manifest: all 21 entries passed.
- Syntax checks passed for the edited JavaScript files.
- Focused nine-field tests: 52 passed, 0 failed, Node.js `v22.16.0` (diagnostic only; package requires Node.js `>=24.17.0`).
- Full `npm test`: 179 passed, 0 failed on Node.js `v22.16.0`, using the bundled dependency tree extracted from the verified V4 archive. This is not a clean install or target-runtime release test.
- `npm ci` did not complete within 240 seconds; no clean install is claimed. The test run is diagnostic only.
- The candidate has no `.git` directory. No authenticated Git checkout, commit, push, repository migration, Windows Node 24 run, 16-image OCR acceptance run on the current source, independent holdout, Discord staging smoke test, restore rehearsal, or deployment was completed.

## Current-branch addendum — 2026-11-07

This 2026-10-28 record is a historical source-reconciliation snapshot. Its candidate/blocked status, Node 22 diagnostic results, and proposed Gate A/B/C/D release sequence are not the governing status or prerequisites for the current `ocr-multiprovider` branch. The active branch charter and README supersede those workflow directions: continue implementation and CI iteratively without reinstating the former gates or requiring an independent holdout corpus before ordinary work. The nine-field contract remains mandatory. Current CI verification must be tied to the exact branch commit and target Node 24 runtime; historical test results in this document are not current acceptance evidence. Original source archives and their provenance remain retained and unchanged.

## Release decision
Production remains **NO-GO**. This milestone package is a candidate handoff to preserve the current work and evidence, not an authoritative source migration or release. Next: obtain a clean authenticated local Git checkout, reconcile the continuation's 26 stale-manifest mismatches and source lineage, then run clean Windows Node `>=24.17.0` install/tests and the supervised nine-field OCR acceptance gates. Preserve the original repository and history; do not create/migrate a new private repository until reconciliation is complete.
