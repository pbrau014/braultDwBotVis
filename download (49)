# DWBOT Iteration 21 — Acceptance Contract and Validation Report

**Date:** 2026-10-26  
**Base:** V4 / version 2.5.0 / iteration 20  
**Status:** Iteration 21 code changes implemented in an isolated working copy; automated regression GO; product release remains NO-GO.

## Scope

This iteration corrected the mismatch between the documented product contract and the OCR acceptance harness. The app defines eight required fields (`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`); `xp` is optional. Previously, sequence runners and the added-screenshot acceptance wrapper required all nine annotated values to match, so optional XP could block a valid mandatory record.

The iteration also rejected the Unicode replacement character (`U+FFFD`, displayed as `�`) from OCR text values and manual corrections. The paired PaddleOCR Windows comparison had produced map candidates such as `Estuary �` and `Hotspot �`; these must be unresolved instead of stored as valid map names.

## Files changed

- `src/acceptance-checks.js` — centralizes mandatory-field exactness using `REQUIRED_MANUAL_FIELDS`; still computes all-compared exactness diagnostically.
- `src/battle-record.js` — rejects U+FFFD during OCR field acceptance, required-field validation, and manual corrections.
- `scripts/run-ocr-sequence.js` — records `allRequiredFieldsPass` and `mandatoryExactMatches`; optional XP remains diagnostic.
- `scripts/run-reported-screenshot-regression.js` and `scripts/run-four-screenshot-pipeline.js` — gate on mandatory fields; preserve all-field comparison diagnostics.
- `scripts/run-additional-screenshot-regression.js` — requires all 8 mandatory fields exact and complete.
- `scripts/accept-tesseractjs.js` — negative-control baseline validates mandatory exactness.
- `scripts/compare-paddleocr-integrated-acceptance.js` — emits a schema-v2 comparison with mandatory and optional metrics separately; optional fields do not count as required human review.
- `scripts/summarize-ocr-acceptance.js` — reports mandatory, optional, and all-compared statistics separately.
- `testdata/additional-screenshot-ground-truth.json` and `testdata/ocr-benchmark-manifest-v1.json` — explicitly label 8 required fields, optional XP, and 9 total compared fields. Ground-truth values and image hashes were not changed. The wrapper's source-manifest SHA-256 was refreshed.
- Focused tests were added to verify optional XP cannot fail the required gate or mandatory review count, and undecodable replacement characters are rejected.
- The additional-screenshot operator README and Phase 0 status note were clarified; historical evidence files remain unchanged.

## Validation results

- `npm test` using the archive's Node.js 24.17.0 runtime: **178 passed, 0 failed, 0 skipped**.
- Focused OCR/acceptance/corpus/comparator suite: **36 passed, 0 failed**.
- The newly emitted paired comparison report was regenerated from the preserved Windows Node 24.22.1 reports. Its mandatory-field figures are:

| Metric | Tesseract.js only | Tesseract.js + PaddleOCR |
|---|---:|---:|
| Exact mandatory fields | 111/128 | 108/128 |
| Fully exact mandatory records | 7/16 | 3/16 |
| Incorrect accepted mandatory fields | 2 | 4 |
| Unresolved mandatory fields | 15 | 16 |
| Optional XP exact | 13/16 | 12/16 |
| Median latency | 34,898 ms | 42,601 ms |

The hybrid still loses: −3 exact mandatory fields, −4 fully correct mandatory records, +2 incorrect accepted mandatory values, +1 unresolved mandatory value, and +7,703 ms median latency. Keep `PADDLEOCR_FIELD_FALLBACK=0`.

## Not completed / not claimed

- A one-image live OCR-sequence smoke attempt in this Linux sandbox exceeded the command execution limit; it did not produce a valid acceptance report. The orphaned child was explicitly terminated. This is **not** counted as a pass or an OCR accuracy result.
- A clean `npm ci` on the target Windows host is not performed here.
- The new source has not yet been run through the full 16-image Tesseract.js acceptance sequence on target Windows Node 24.22.1.
- No live Discord login/channel smoke test, backup restore rehearsal, or production deployment was performed.
- The 16-image corpus remains a development/tuning corpus, not an independent holdout.

## Decision

**Iteration 21 automated regression: PASS. DWBOT production readiness: NO-GO.** This iteration repairs acceptance semantics and hardens malformed text rejection; it does not improve measured Tesseract OCR accuracy. The next gate is a clean Windows 24.22.1 install and supervised Tesseract.js acceptance run, followed by a fresh independent holdout. Do not enable PaddleOCR fallback.
