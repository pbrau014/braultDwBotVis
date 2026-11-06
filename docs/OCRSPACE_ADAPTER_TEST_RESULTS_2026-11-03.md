> **Supersession note — 2026-11-05:** This report records a historical standalone adapter test from 2026-11-03. It does not describe or verify the current integrated architecture. The governing sequence is now OCR.Space Engine 2 source-image processing → searchable PDF → local PDF-page raster → Tesseract.js/native Tesseract/PaddleOCR/OpenCV downstream. The current implementation is in src/ocrspace-pdf-first.js, src/image-processor.js and src/bot.js. Its mocked tests are registered under npm run test:ocrspace, but live provider and inventory acceptance remain unverified. See docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md and the top override in docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt.

# OCR.space adapter test results — 2026-11-03

- Runtime: Node.js v22.16.0
- Command: `npm run test:ocrspace-adapter`
- Result: **6 passed, 0 failed, 0 skipped**
- Syntax checks: `node --check src/ocrspace-adapter.js` and `node --check tests/ocrspace-adapter.test.js` passed.
- Test mode: offline contract tests with injected fetch responses; no external OCR request and no screenshot transmission.

Coverage: disabled-by-default behavior; required key; official HTTPS endpoint restriction; Engine 3 player routing; Engine 2 general-field routing; evidence-only return contract; empty/invalid/oversized input; provider errors; empty OCR result; malformed JSON; HTTP failure.

Limitations: the adapter is standalone and not connected to the bot's live OCR orchestration. `node_modules` is not present in this extracted package, so the complete project suite was not run. Windows/native-Tesseract, OCR.space live-provider, PaddleOCR comparative accuracy, and Discord smoke-test gates remain unverified. Production remains NO-GO.


## Branch reproducibility notice — 2026-11-04

This is a historical working-copy test report. The current `dwbotVis` branch does not contain the adapter/test files or npm script named above, so the 6/6 result is not currently reproducible from this branch. Do not count it toward current-branch acceptance until the source and tests are restored and rerun.
