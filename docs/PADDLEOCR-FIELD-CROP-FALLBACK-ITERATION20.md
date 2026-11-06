> **Current architecture override (2026-11-05):** PaddleOCR is downstream of OCR.Space. It must process the locally rendered raster of the OCR.Space searchable PDF, never the original screenshot after the PDF-first stage. OCR.Space Engine 2 creates the PDF first. This note supersedes any earlier source-image/crop-first description below; historical benchmark details remain unchanged.

# Iteration 20 — Local PaddleOCR field-crop fallback

**Status:** fallback implementation and unit-level safeguards are complete; feature is disabled by default. The full Tesseract-only 16-image control and targeted fixtures were rerun. The integrated PaddleOCR field-crop candidate remains unmeasured; its paired Windows Node 24 runner now captures a Tesseract-only control and a hybrid candidate on the same host. **Production release remains NO-GO.**

## Architecture and safety contract

The existing Tesseract.js pipeline remains primary. Existing OpenCV anchor/crop proposals and field-specific parsers remain in place. The new optional path is invoked only after Tesseract extraction and only requests fields whose current record is unresolved, ambiguous, or supported by contradictory candidate values.

`PADDLEOCR_FIELD_FALLBACK=0` is the default. To run the fallback, all three explicit local configuration values must be set:

- `PADDLEOCR_PYTHON_BIN`
- `PADDLEOCR_DET_MODEL_DIR`
- `PADDLEOCR_REC_MODEL_DIR`

The helper (`scripts/paddleocr_field_crops.py`) blocks Python socket connections before Paddle/PaddleOCR imports. It requires model directories and refuses default/remote model resolution. It decodes source image bytes by content signature, uses bounded in-memory OpenCV crops, caps per-image crop count, uses `enable_mkldnn=False`, and emits machine-readable crop results. A blocked network attempt is a failure and must be visible in diagnostics.

Paddle text is not copied directly into `BattleRecord`. It is parsed using the established player, metadata, result, reward, and damage parsers and enters existing candidate arrays as evidence with confidence capped at 84, below the 85 single-read threshold. A lone Paddle output cannot authorize a record field. Numeric candidates still use strict parsers, so multiple merged reward numbers are rejected. A known O/0-style player conflict is preserved as an ambiguity for human review. Model failure, crop failure, invalid geometry, or time-budget exhaustion preserves the primary Tesseract result (fail-open to the existing engine; fail-closed for candidate acceptance).

## Main files

- `src/paddleocr-field-fallback.js` — feature gate, field-need detection, bounded crop planning, existing-parser candidate handling, no-single-engine-authority rule, time budget, and diagnostics.
- `scripts/paddleocr_field_crops.py` — local model worker, explicit model directory checks, network guard, crop validation, and per-crop timing.
- `scripts/run-paddleocr-integrated-acceptance.ps1` — Windows entry point for the measured, local-only 16-image integrated run.
- `scripts/compare-paddleocr-integrated-acceptance.js` — verifies approved fixture hashes and compares exact-field, complete-record, false-acceptance, unresolved-field, end-to-end latency, fallback latency, and per-crop latency metrics.
- `tests/paddleocr-field-fallback.test.js` — fallback gate, conflict handling, strict parsing, crop bounds, time-budget, network-attempt reporting, and latency tests.
- `tests/paddleocr-comparison.test.js` — validates metric numerators/denominators and crop-latency aggregation.
- `testdata/ocr-acceptance/tesseract-only-baseline-iteration19.json` — pinned Tesseract-only development baseline; historical report retained without altering ground truth.
- `.env.example` — local-only configuration; fallback default is off.

`package-lock.json` is unchanged. No cloud API, external OCR service, or new npm runtime dependency was added.

## Development-corpus baseline

The pinned Tesseract-only baseline is the existing 16-image *development/tuning* corpus, not a holdout:

- Exact required fields: 135 / 144 (93.75%).
- Complete exact records: 10 / 16 (62.5%).
- Accepted-wrong required field values: 3.
- Unresolved required field values: 6.
- End-to-end median: 43,415 ms.
- End-to-end p95: 54,586 ms.

Raw PaddleOCR full-screen evidence previously completed 16 / 16 screenshots without network attempts, but it averaged about 42,970 ms per screenshot, with median 39,700 ms and p95 83,540 ms. This is raw recognition evidence, not integrated field accuracy. It shows promising text for some Tesseract failures but also merges adjacent reward values and has O/0-style player identity errors. It is insufficient to justify replacing Tesseract or accepting Paddle candidates without validation.

A local Windows smoke test reported `installed-and-offline-verified`, PaddlePaddle 3.3.1, PaddleOCR 3.7.0, PP-OCRv6 medium detection/recognition model directories, synthetic reward text recognized, and zero network attempts. This verifies local inference availability for the synthetic image, not accuracy on the WoWS screenshot corpus.

## Final iteration-20 validation recorded

Executed in this development environment with Node.js v24.17.0 and the Paddle fallback explicitly disabled for Tesseract baseline runs:

- `npm test`: **174/174 passed** (0 failures, 0 skipped).
- `npm run test:ocr-watchdog`: **21/21 passed**.
- `npm run test:opencv`: **5/5 passed**.
- `npm run test:paddleocr-fallback`: **16/16 passed**.
- `node --test tests/paddleocr-comparison.test.js`: **1/1 passed**.
- JavaScript `node --check` for files under `src/`, `scripts/`, and `tests/`: passed.
- Python `py_compile` for the local Paddle helper and offline benchmark helper: passed.
- Comparator self-test with baseline equal to candidate: all deltas zero and all image hashes matched.
- Tesseract-only 16-image acceptance: **16/16 executed**, **10/16 exact complete records**, **12/16 records with all fields present**, **135/144 exact required fields (93.75%)**, **3 accepted-wrong values**, **6 unresolved required fields**. The required exact-match gate **failed**, matching iteration 19's accuracy result. No blocked network attempts were reported by the network guard.
- Tesseract-only latency across the 16-image development corpus: mean **44.557 s**, median **44.807 s**, p95 **58.223 s**, total **713.019 s**. Compared with the older pinned baseline (mean 43.873 s, median 43.415 s, p95 54.586 s), exactness is unchanged; timing is somewhat slower and the runs are not evidence of speed improvement.
- Reported-issue screenshot Tesseract.js regression: **9/9 required/compared fields exact**, no required missing fields.
- Four original repair fixtures: **2/4 full exact records** (Hoffmann and Libertad); **3/4 have all production-required fields present**. Asashio still returns `[OVF]O0ldschoolGaming_YouTube` instead of `[OVF]OldschoolGaming_YouTube`; Schlieffen leaves Credits unresolved and XP unresolved. This targeted exact gate fails and these defects remain actionable.

A comprehensive `npm run test:tesseractjs` launcher was attempted earlier but its wrapper timed out during a long negative-control recognition scenario after unit/contract checks and asset checks. It is not counted as a pass. The completed 16-image, reported-issue, and four-fixture runs are separately recorded.

The installed Windows machine reported PaddlePaddle 3.3.1, PaddleOCR 3.7.0, PP-OCRv6 medium local detection/recognition models, and a synthetic offline smoke test that recognized `WOWS XP 123456 FREE XP 7890` with zero network attempts. Its raw full-screen Paddle benchmark completed **16/16 images** with **zero network attempts**, average ~42.97 s, median ~39.70 s, and p95 ~83.54 s. This is raw OCR only—not integrated field-crop accuracy. The models are installed on the user's Windows machine; the integrated fallback benchmark has not yet been executed with them.

## How to run the paired integrated benchmark on Windows

From the project root in a PowerShell session on the Node.js 24 machine where the local PaddleOCR setup is installed:

```powershell
.\scripts\run-paddleocr-integrated-acceptance.ps1 -ProjectRoot (Get-Location).Path
```

The script uses `%LOCALAPPDATA%\WoWSYOLO\PaddleOCR\venv\Scripts\python.exe` plus the staged local `PP-OCRv6_medium_det` and `PP-OCRv6_medium_rec` directories. It does not reinstall packages or download models. It runs two ordered passes on the same Windows machine and Node runtime: (1) Tesseract-only with fallback disabled; (2) Tesseract plus local Paddle field crops enabled. Both passes use the same unchanged 16-image manifest and network guard. The second engine is enabled only for that benchmark process, not persistently for the bot.

Outputs:

- `testdata\ocr-acceptance\tesseract-only-baseline-windows-node24.json`
- `testdata\ocr-acceptance\paddleocr-integrated-acceptance-windows-node24.json`
- `testdata\ocr-acceptance\paddleocr-integrated-comparison-windows-node24.json`

The comparison validates fixture hashes and reports exact-field/complete-record deltas, wrong accepted values, unresolved fields, human-review rate, end-to-end latency, fallback latency, per-crop latency and errors. The baseline may exit nonzero due current known defects; if its report is complete and the network guard is clean, the script continues to the candidate and comparison. Candidate failures do not imply successful acceptance.

## Remaining gates

1. Run the paired Windows Node 24 benchmark above and review every Paddle candidate, rejected merged reward string, timeout, field crop and O/0 conflict.
2. Do not accept raw Paddle output by itself; it must pass the existing parsers and consensus. Ambiguous identity and numeric values must remain unresolved for review.
3. Keep the 16 screenshots designated development/tuning data. Obtain a new untouched, independently labeled holdout (preferably 25–50 new screenshots to begin) before using any tuning result as evidence of generalization.
4. Finish targeted Tesseract repairs for unresolved player identity, malformed/ambiguous metadata, XP token loss and damage crop conflict while keeping exact expected values fixed.
5. Run native Windows Tesseract (separate from Tesseract.js), verify repeated sequential processing and process cleanup on Windows, and complete the Discord smoke test on the target host.

The second OCR engine stays off by default until integrated accuracy improves without increasing critical false acceptance, its crop p95 fits the processing budget, and platform/live integration gates pass. Production release remains NO-GO.
