# Node.js 22+ compatibility and test evidence — 2026-11-03

Actual test runtime: Node.js v22.16.0, npm 10.9.2, Linux x64.

The project baseline remains Node.js 22.16.0 (`.nvmrc`). The application/runtime package minimum is 22.16.0 or newer. A runtime is only empirically verified when a command log below shows it was actually used; policy eligibility does not claim that other Node versions were executed.

## Completed checks

| Command | Result |
|---|---:|
| `npm test` | 185 passed, 0 failed, 0 skipped |
| `npm run test:opencv` | 6 passed, 0 failed, 0 skipped |
| `npm run test:ocr-watchdog` | 21 passed, 0 failed, 0 skipped |
| `npm run test:paddleocr-fallback` | 16 passed, 0 failed, 0 skipped |
| `npm run test:sqlite` | 5 passed, 0 failed, 0 skipped |
| `node --test tests/ocr-report-metadata.test.js` | 2 passed, 0 failed, 0 skipped |
| `npm ls --depth=0` | succeeded |
| `node scripts/check-tesseractjs-assets.js` | all required local assets present |
| `node --check` on changed JS files | succeeded |

The targeted test commands overlap with the full test suite; do not sum the individual counts as independent unique tests.

## OCR qualification

A prior single-image reported-issue report (`../reported-screenshot-regression-results.json`) records a completed pipeline and exact nine-of-nine field match using local Tesseract.js. It is a one-image result only. The report predates explicit OCR feature-flag metadata, so its OpenCV feature setting is not independently recorded and it cannot be used as a paired OpenCV comparison.

The broad Tesseract.js acceptance launcher and separate Asashio sequence did not produce complete aggregate reports within the execution window. Fresh CV-on and CV-off reported-screenshot reruns were also interrupted by the environment execution ceiling. Logs are retained with the `incomplete-` prefix; they are not acceptance passes or accuracy failures.

PaddleOCR model accuracy is not benchmarked: the local Python PaddleOCR packages/models were unavailable. Its fallback unit tests verify bounded, fail-closed behavior only.

## Feature configuration

- OpenCV assist is disabled by default; only `OCR_CV_ASSIST=1` enables controlled geometry-proposal evaluation.
- PaddleOCR field fallback is disabled by default; only explicit configuration enables its bounded local process.
- New OCR reports now record engine, OpenCV/PaddleOCR flags, network-block state, and image/operation time budgets.

## Not established by this evidence

No clean `npm ci`, Node runtime other than v22.16.0, Windows/native-Tesseract test, completed broad OCR corpus, independent holdout, paired PaddleOCR benchmark, live Discord staging test, dedicated secret scanner, backup/restore rehearsal, or production release gate is claimed.

Additional current checks confirm `package.json` and root `package-lock.json` both declare `>=22.16.0`. The Tesseract.js launcher and Windows paired PaddleOCR runner now capture feature/runtime configuration; Windows output filenames are runtime-specific so distinct Node-version reports do not overwrite each other. The PowerShell file was not executed in this Linux environment because neither Windows PowerShell nor `pwsh` is available.
