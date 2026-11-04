> **Historical contract notice — superseded 2026-10-28:** This report records the Iteration 21 eight-field/optional-XP decision as it stood when that patch was applied on 2026-10-27. The later `CURRENT RESUMPTION ADDENDUM — 2026-10-28` in the active `plan1.txt` explicitly reinstated the nine-field mandatory contract, with XP ninth/final. The historical analysis and metrics below are retained unchanged; they are not the current DWBOT acceptance contract.

---

# DWBOT Iteration 21 Patch Application Report

Date: 2026-10-27

## Decision and provenance

The user explicitly selected `DWBOT_ITERATION21_PATCH.zip` and supplied `artifacts.zip`. The patch was applied only to an isolated working copy of the exact V4 base. The original V4 ZIP, patch ZIP, and artifacts ZIP were preserved unchanged.

- V4 base `YoloDiscordBotV4.zip` SHA-256: `b57942298f9d1405946f2eadf249ece94cf1cde05131172e44d0a4cd51099899`
- Selected `DWBOT_ITERATION21_PATCH.zip` SHA-256: `35bdedfcfdeb3f861bb6b8e444732962644a053b7140c7494504a13e6c858d14`
- Supplied `artifacts.zip` SHA-256: `daabff336d8182fcc72e0b065a6fbb07697bdda942d3eabddc9007589208dad2`
- V4 ZIP integrity: PASS
- Patch ZIP integrity: PASS
- Artifacts ZIP integrity: PASS
- Patch manifest: all 21 listed payload files matched their declared SHA-256 values.

## What was applied

The overlay was applied to `DWBOT_ITERATION21_WORK` and covers the acceptance contract, battle record validation, OCR sequence/regression scripts, acceptance metrics, ground-truth schema annotations, operator notes, and focused tests. The patch's README and acceptance-contract report are retained under `docs/iteration21/`.

The selected patch establishes **eight mandatory fields** in this order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`. `xp` is optional and diagnostic. This intentionally supersedes the earlier working-plan proposal that treated all nine fields as mandatory because the user explicitly instructed use of this Iteration 21 patch. Optional XP remains visible in diagnostics; it is not silently discarded. The patch also rejects Unicode replacement character U+FFFD in OCR and manual values.

## Local checks performed here

Environment: Linux container, Node.js `v22.16.0`; project declares Node.js `>=24.17.0`.

- Focused regression suite: **36 passed, 0 failed, 0 skipped**. The suite covered `tests/battle-record.test.js`, `tests/ocr-metrics.test.js`, `tests/additional-screenshot-corpus.test.js`, `tests/paddleocr-comparison.test.js`, and `tests/tesseractjs-acceptance.test.js`.
- `node --check`: **9 modified JavaScript files passed**.
- Full `npm test`: not completed in this environment; the attempt was interrupted by the execution time limit. No full-suite pass is claimed from this run.
- The supplied patch's `ITERATION21-ACCEPTANCE-CONTRACT-REPORT.md` reports a prior Node v24.17.0 full suite of 178 passed, 0 failed, 0 skipped. That result is attributed to the supplied report and was not independently reproduced in this environment.

## OCR evidence and release status

The supplied patch report says the paired Windows comparison found Tesseract-only at 111/128 exact mandatory fields and 7/16 fully exact mandatory records; the Tesseract+PaddleOCR candidate had 108/128 and 3/16, with more incorrect accepted mandatory values (4 vs 2) and slower median latency (42,601 ms vs 34,898 ms). Keep `PADDLEOCR_FIELD_FALLBACK=0`.

**Release remains NO-GO.** No target-Windows Node 24 full suite, live OCR acceptance sequence, independent holdout, Discord staging smoke test, backup/restore rehearsal, production deployment, Git commit/push, or repository migration was performed here.

## Required next gates

1. On target Windows, use Node.js `>=24.17.0` in a clean folder; run `npm ci`, `npm test`, and the supervised OCR acceptance sequence.
2. Preserve complete logs and JSON reports, and verify mandatory-field acceptance while optional XP remains separately reported.
3. Evaluate a fresh independently labeled holdout; the existing 16-image corpus is a development/tuning corpus.
4. Complete native Windows Tesseract checks, Discord staging smoke test, and backup/restore rehearsal before considering release.
