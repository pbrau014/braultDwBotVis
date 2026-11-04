# Phase 0 OCR Repair and Expanded Screenshot Corpus — Status

> **2026-10-28 contract supersession:** The historical eight-field/optional-XP policy below is superseded. The current DWBOT contract requires all nine fields, with `xp` ninth/final. The current manifest lists all nine in `requiredComparedFields` and no optional XP field. Missing, invalid, uncertain, or conflicting XP blocks acceptance. Historical reports and metrics remain unchanged and must not be represented as evidence for the current nine-field contract.

Date: 2026-10-25

## Implemented

- Applied targeted OCR repair changes in `src/bot.js`, `src/damage-consensus.js`, `src/number-parser.js`, and `src/reward-geometry.js`.
- Added focused regression coverage in `tests/damage-consensus.test.js`, `tests/localized-numeric-parser.test.js`, and `tests/reward-geometry.test.js`.
- Added all 16 images from the supplied `imgs2add.zip` under `fixtures/additional-screenshots/`, preserving original filenames and file bytes.
- Added field-level annotations and SHA-256 hashes in `testdata/additional-screenshot-ground-truth.json`.
- Added a manifest/hash test in `tests/additional-screenshot-corpus.test.js` and an executable supervised OCR sequence via `npm run test:additional-images`.
- Kept the original five approved acceptance fixtures, their expected values, and the established exact-match assertions unchanged.

## Test evidence

- `npm test`: **128 passed, 0 failed, 0 skipped** in the current environment (Node.js v22.16.0).
- Existing five approved screenshots: supplemental direct-extraction comparison **5/5 exact, 5/5 required fields complete**. Evidence is in `testdata/ocr-acceptance/phase0-repair-direct-diagnostics.json`.
- All 16 newly attached images: corpus integrity/unit test passes, and each image's SHA-256 matches the uploaded archive.
- `npm run test:additional-images`: **INCOMPLETE** in this environment. The supervised sequence started `Screenshot_16.jpg` but the command exceeded the execution window before producing a completed acceptance report. This is not an accuracy pass or fail for the screenshot itself.
- Current runtime is Node.js v22.16.0, while `package.json` requires Node.js `>=24.17.0`. The supported-runtime formal supervised acceptance suite still must be run under Node.js 24.17+.

## Phase 0 decision

**Phase 0 is not closed yet.** The repair candidate has strong supplemental evidence, but the formal supervised acceptance gate has not completed in a supported Node.js runtime. Do not lower thresholds, change ground-truth values to match OCR output, or treat missing/ambiguous fields as successes.

## Next steps

1. Install/use Node.js 24.17 or newer (the project's `.nvmrc` specifies the intended major line).
2. Run `npm ci`.
3. Run `npm test`.
4. Run `npm run test:ocr-watchdog`.
5. Run the official existing acceptance checks, including `npm run test:tesseractjs`, `npm run test:reported-screenshot`, and `npm run test:four-images`.
6. Run `npm run test:additional-images`. It must complete all 16 images, produce exact matches for all nine mandatory fields on every image, confirm all supervised child processes closed, and record no network attempts. XP exactness is mandatory for acceptance.
7. If a new annotation appears wrong, inspect the original screenshot and document the reason before changing it. Never edit an expected value solely to make a test pass.
