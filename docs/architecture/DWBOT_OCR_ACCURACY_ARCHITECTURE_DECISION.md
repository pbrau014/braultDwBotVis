# DWBOT OCR Accuracy Architecture Decision

- Status: Accepted architecture direction; implementation migration is staged and release-gated
- Decision date: 2026-11-06
- Governing contract: nine mandatory fields, in this exact order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`
- Decision scope: OCR processing, evidence reconciliation, network policy, and acceptance strategy
- This document does not declare Gate A, Gate B, or release acceptance passed.

## Decision

Optimize for **correct accepted records**, not raw OCR character count, throughput, or forced completion. A mandatory field is accepted only when its value is supported by field-specific evidence and validation. Otherwise it remains unresolved and the record is withheld for review.

Adopt a local-first, multi-reader, field-aware architecture:

1. Preserve the original screenshot as immutable source evidence and calculate its SHA-256 before processing.
2. Use OpenCV locally for image quality assessment, geometry, region isolation, and carefully selected image variants.
3. Run Tesseract as the established local baseline and PaddleOCR as an independent local reader. During the accuracy-validation phase, collect both readers' evidence on the same approved inputs so their complementary strengths and disagreements can be measured.
4. Reconcile candidate values per field using source geometry, text-region association, field-specific parsing, independent reader agreement, and domain constraints. Do not compare raw confidence scores across engines as if they were calibrated probabilities.
5. Accept only validated nine-field records. Any unresolved or conflicting mandatory field fails closed and requires review.
6. Keep OCR.Space disabled by default. It may be used only through an explicitly enabled, policy-controlled diagnostic/contingency path. Remote output is separate evidence, never an automatic override or a substitute for a missing local acceptance result.

## Engine responsibilities

### OpenCV

OpenCV is the local preparation and geometry layer, not a text recognizer. It should:
- retain the original source image unchanged;
- measure dimensions, blur/contrast/quality and detect whether rotation or skew correction is warranted;
- identify and bound the known battle-result and reward regions;
- create a small, deterministic set of justified variants (for example original, grayscale/contrast-normalized, and thresholded only when beneficial);
- record each crop/variant's transform and coordinates back to the original image;
- avoid aggressive morphology, thresholding, or rescaling that destroys thin strokes, decimal separators, commas, or small digits.

Do not apply perspective correction or deskew blindly to already-digital game screenshots. Transform only when measured geometry supports it.

### Tesseract

Retain Tesseract as the production baseline while the new ensemble is evaluated. Use structured output (TSV/hOCR where useful) so token text, word/line boxes, and confidence metadata are preserved. Apply field-specific page segmentation modes and whitelists only where validated by the field's actual content; do not use a single global PSM or numeric whitelist for all fields.

Keep the existing Tesseract.js baseline and native Tesseract path distinct in reports. Record executable, traineddata, wrapper, and model versions.

### PaddleOCR

Retain PaddleOCR as an independent local detection/recognition reader. Use pinned, locally provisioned model files and explicit model directories. No model downloads are permitted during acceptance runs. Evaluate text detection and recognition separately where possible, and preserve polygons/boxes and recognition outputs.

The repository's historical 16-image comparison showed the then-current Tesseract+PaddleOCR integration performed worse than Tesseract alone under an eight-field policy (7/16 vs 3/16 complete records; 111/128 vs 108/128 exact mandatory fields; 2 vs 4 wrong accepted fields). That historical result is not a nine-field acceptance result and does not prove PaddleOCR is intrinsically inferior. It does prove the existing integration must not be promoted without controlled re-evaluation. Treat Tesseract as baseline and PaddleOCR as a measured independent reader until a nine-field comparison demonstrates improvement.

### OCR.Space

OCR.Space is not on the normal processing critical path. Keep it disabled by default and enforce an explicit allowlisted activation path. If enabled for a diagnostic:
- transmit only the minimum necessary cropped region, not a full screenshot by default;
- exclude player identity and other unnecessary personal information;
- retain request metadata, provider/engine settings, response, and source hash;
- keep provider output separate from local candidates;
- never let a remote result silently replace a local candidate or make an otherwise failing Gate A/B pass;
- record every network attempt, including denied attempts, and fail acceptance if network policy is violated.

Cloud results may assist a human reviewer or guide a future local improvement. They are not ground truth.

## Field-level reconciliation

For each of the nine mandatory fields, preserve:
- original image hash and source dimensions;
- crop/variant identifier and coordinates in original-image space;
- each engine's raw text, boxes/polygons, confidence metadata, runtime/model version and error state;
- normalized candidate value and parser diagnostics;
- validation rules applied and their outcome;
- agreement/disagreement and final disposition.

Apply field-specific rules:
- `result`: allowed result vocabulary and correct result region;
- `player`: identity region, text integrity and player-name rules; do not infer missing characters from unrelated context;
- `map` and `mode`: bounded metadata region and known vocabulary only where authoritative;
- `battleStart`: timestamp/date-time syntax and region-specific evidence;
- `credits`, `freeXp`, `damage`, `xp`: numeric parsing that preserves separators and magnitude; reject ambiguous digit/grouping interpretations.

A parser or domain constraint may reject a candidate; it must not invent a replacement value. Do not use a high engine confidence score alone to resolve a conflict. Do not accept a value solely because two engines agree if both read the wrong region or share the same corrupted input.

## Accuracy-oriented execution strategy

- During development and Gate A/B evaluation, run both local readers on the same source images and compare complete per-field evidence. Use parallel execution only with bounded concurrency and deterministic output ordering.
- Run full-image detection where useful, then field-specific crops. Avoid repeatedly OCRing every arbitrary variant; select variants based on measurable image-quality diagnostics.
- Use targeted second-pass OCR for unresolved or low-quality fields, with alternate validated PSM/model/variant settings.
- Preserve all candidates. Reconciliation should be deterministic, versioned, testable and replayable.
- Do not auto-learn or tune from Gate B holdout data. Holdout remains independent and sealed from tuning.

## Acceptance and release policy

The authoritative field list is nine fields. Historical eight-field reports remain historical evidence only.

- Gate A: approved 16-image development corpus, reconciled source, Windows runtime at the supported project minimum or higher, exact nine-field ground truth, zero wrongly accepted mandatory values, zero unresolved mandatory fields for a passing corpus, and zero unauthorized network requests.
- Gate B: independent holdout, minimum 50 images and 100 preferred, independent ground truth for all nine fields, no tuning on holdout, zero wrongly accepted mandatory values, zero unresolved mandatory fields for a passing corpus, and zero unauthorized network requests.
- Report per-field exact matches, wrong accepted values, unresolved values, full-record exact matches, coverage, runtime/model versions, source hashes and network diagnostics. Do not report only aggregate character accuracy.
- A gate may not pass because an OCR engine returned text or because CI passed. CI verifies code contracts; the approved Windows corpus verifies OCR accuracy.
- Gate C persistence/recovery and Gate D release decision remain blocked until Gate A and Gate B pass.

## Migration sequence

1. Preserve and fingerprint the current provider-first path as a comparison baseline.
2. Implement a parallel local-first path using the original image, OpenCV geometry/variants, Tesseract and PaddleOCR. Do not change production defaults yet.
3. Add evidence schema and field-level reconciliation with strict nine-field contract, provenance and fail-closed behavior.
4. Add deterministic Windows packaging of pinned local Tesseract traineddata, PaddleOCR runtime and model assets. Acceptance must run without model downloads or unauthorized network.
5. Compare baseline and candidate on Gate A development images; tune only on development data.
6. Freeze the candidate, then evaluate once on independent Gate B holdout.
7. Only after A and B pass, decide whether to switch production default. Retain rollback to the prior path until the new path is accepted.
8. Keep OCR.Space as explicit opt-in contingency/diagnostic, not a normal dependency.

## Evidence and limitations at decision time

- Current main commit reviewed: `dbd459c868fb6490957639dfe7ac83650ac54241`.
- Existing source includes OpenCV geometry proposals, a PaddleOCR field-crop fallback, Tesseract.js/native Tesseract paths, and OCR.Space PDF-first components. Their presence does not establish that all are installed, invoked, or accuracy-validated together.
- The historical 16-image comparison used an eight-field policy and is not a current gate result.
- The raw PaddleOCR benchmark was blocked because PaddleOCR runtime packages were unavailable in that benchmark environment; it is not an accuracy score.
- Gate A/B source and independent ground-truth gaps remain open. This architecture decision does not resolve missing source archives or ground truth.
- The general verification workflow run on 2026-11-07 passed under Node 22.16.0, below the documented Node >=24.17.0 project acceptance minimum; it is not Windows OCR acceptance.

## Technical references

- PaddleOCR detection module: https://www.paddleocr.ai/latest/en/version3.x/module_usage/text_detection.html
- PaddleOCR recognition module: https://www.paddleocr.ai/latest/en/version3.x/module_usage/text_recognition.html
- PaddleOCR offline/local model configuration: https://www.paddleocr.ai/main/en/FAQ.html
- Tesseract command-line and TSV output: https://github.com/tesseract-ocr/tessdoc/blob/main/Command-Line-Usage.md
- Tesseract quality guidance and page segmentation: https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html
- OCR.Space privacy policy: https://ocr.space/privacypolicy

## Change control

This is the governing architecture direction for future implementation. It does not authorize weakening acceptance gates, changing the nine-field contract, tuning against holdout data, uploading private screenshots, or declaring a release accepted without evidence.
