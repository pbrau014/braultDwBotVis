# OCR.Space Free API — OCR-first diagnostic prepass and searchable-PDF profile

## Governing sequence

When OCR.Space is enabled by a locally configured Free API key (default-on unless explicitly disabled), the sequence is:

1. Inspect the original image locally and run geometry-only OpenCV region proposals. OpenCV does not recognize text or accept values.
2. Require an explicit, valid OpenCV identity proposal with score >= 0.12 (the same minimum used by the local geometry-region selector), and require the complete identity rectangle to be inside the source image. A missing, weak, malformed or out-of-bounds identity proposal disables the entire remote prepass; never substitute a nominal/fallback rectangle. Exclude the player-identity region and construct only bounded, non-identifying crops. If a crop cannot be proven separate from identity content, skip it.
3. Run OCR.Space Engine 3 first on those safe crops, with the request profile below. Preserve text, partial status, processing time, crop geometry, request settings and searchable-PDF status as separate remote evidence.
4. Run the existing Tesseract.js/local pipeline on the original image and its established crops. Preserve local evidence independently and compare it to the remote result.
5. Run the existing parsers, independent-read/geometry consensus and exact validators. Conflicts, ambiguous values and missing fields remain unresolved.

Tesseract.js remains the local baseline and fallback. OCR.Space is the first remote OCR pass, not the authority for accepting a battle record. OCR.Space text is not input text for Tesseract; Tesseract recognizes pixels. After local OCR and parsing, `src/ocrspace-reconciliation.js` parses the remote text independently and emits an exact-value, field-by-field diagnostic cross-check against the local record. Agreement, disagreement, remote-only, remote-conflict and no-candidate states are reported separately. This diagnostic never merges remote candidates into local candidates and cannot independently accept, normalize, rewrite, fuzzy-correct or overwrite any mandatory field. PaddleOCR remains an optional local comparison/fallback.

If OpenCV geometry is unavailable or does not yield a provably safe crop, the remote prepass is skipped and the local OCR pipeline proceeds. The existing post-local OCR.Space refinement stage is reserved for cases where the first remote prepass could not produce evidence; it does not replace the first-pass evidence.

## Runtime enablement and configuration

Remote use is default-on when a locally stored valid Free API key is configured. An unset or blank `OCRSPACE_ENABLED` value uses the default-on behavior; `OCRSPACE_ENABLED=1` explicitly enables it; `OCRSPACE_ENABLED=0` is an explicit local-only opt-out; any other value fails closed. The API key remains mandatory, so no key means no remote request. Keep the key only in the local environment; never commit, display, log, export or package it. No paid tier or paid use is permitted.

Recommended local configuration:

    OCRSPACE_ENABLED=1
    OCRSPACE_API_KEY=
    OCRSPACE_MAX_CROPS=4
    OCRSPACE_STAGE_BUDGET_MS=20000
    OCRSPACE_MAX_PER_DAY=450
    OCRSPACE_MAX_PER_MONTH=22000
    OCRSPACE_MAX_ENGINE3_PER_MONTH=900
    OCRSPACE_QUOTA_PATH=./data/ocrspace-quota.json

With a local Free key, remote processing is enabled by default; use `OCRSPACE_ENABLED=0` only when a test explicitly requires a local-only run. Before first live use, recheck current provider terms, privacy, retention and quota. The default does not bypass safe-crop, identity-exclusion, quota, transport or fail-closed checks.

## Engine capability comparison — searchable PDF

| Capability | Engine 2 | Engine 3 |
|---|---|---|
| Searchable PDF generation | Supported | **Supported** (per the Engine 3 feature description; the provider's comparison matrix still shows unsupported) |

The provider's current API page is internally inconsistent: the Engine 3 feature description says searchable PDF is supported with the same parameters as Engine 1/2, while the comparison matrix marks it unsupported. DWBOT's capability comparison therefore records Engine 3 as supported in accordance with the feature description, but the runtime still verifies the actual SearchablePDFURL. If Engine 3 returns no safe URL, retain the quota-reserved Engine 2 PDF-only fallback and discard Engine 2 OCR text. This is a documented compatibility fallback, not a claim that every live Engine 3 response has been verified.

## Required OCR.Space request profile

- `detectOrientation=true`: let OCR.Space detect orientation and auto-rotate when required.
- `OCREngine=3`: use Engine 3 for the first text-extraction request.
- `scale=true` by default: DWBOT screenshots are normally low-DPI digital captures. OCR.Space documents that auto-scaling helps low-DPI screenshots; if source metadata establishes a true 200–300 DPI image, use `scale=false` because scaling can worsen already-high-resolution input. Record the selected value.
- `isTable=true` for the non-identifying reward/stat band, which is genuinely columnar; use `isTable=false` for result-title and map/mode/time metadata crops that are not tabular. The flag enables receipt/table line-order handling and must not be forced onto unrelated UI text.
- `isCreateSearchablePdf=true` and `isSearchablePdfHideTextLayer=false` together, so the generated PDF has a visible/selectable text layer. Preserve a returned `SearchablePDFURL` only as a short-lived artifact reference.

OCR.Space's current API documentation is inconsistent about Engine 3 searchable-PDF support: one Engine 3 description says the same PDF parameters are supported, while its engine comparison matrix marks searchable PDF unsupported. Therefore the client requests a visible searchable PDF with Engine 3 and checks the actual response. If Engine 3 does not return a safe `SearchablePDFURL`, it makes a separately quota-reserved Engine 2 request solely to generate the PDF with the same orientation/table/scale and visible-layer settings. Engine 2's parsed text is discarded and never replaces Engine 3 text evidence. No paid plan is used to resolve this provider-documentation inconsistency.

The searchable PDF link is documented as valid for one hour. The Free tier adds an OCR.space watermark. Do not treat the link as durable storage or include it in long-lived records.

## Privacy, bounds and quotas

- Send only minimum-necessary, pre-localized, non-identifying crops. Never send player name/identity, Discord IDs, credentials, private account data, unrelated UI or full screenshots.
- Identity exclusion is geometric and happens before transmission. The identity ROI must be an explicit in-bounds OpenCV proposal with score >= 0.12; missing, weak, malformed or out-of-bounds identity geometry disables remote OCR for that image. No nominal/fallback identity rectangle is accepted. If a crop intersects or may include the identity ROI, skip it and record the reason.
- The client uses the fixed HTTPS endpoint `https://api.ocr.space/parse/image`, API key in the request header, redirect rejection, bounded MIME/input/response handling, request-plus-response timeout, and no automatic retry after HTTP 429.
- Maximum upload is 1 MiB per image; JSON response is bounded at 256 KiB. Calls are sequential and bounded by crop count and per-image stage budget.
- The local quota ledger reserves before every provider request, including the Engine 2 PDF-only fallback, and fails closed on corruption or lock contention.
- Current provider documentation lists 500 requests/day, 25,000 requests/month and 1,000 Engine 3 conversions/month for the Free plan. Internal ceilings remain lower: 450/day, 22,000/month and 900 Engine 3/month.
- The provider privacy policy currently states that uploads are deleted after processing, searchable PDFs after 60 minutes, and IP access logs are retained for one month. These terms may change; recheck before first live use and periodically.

## Current implementation map

- `src/opencv-field-isolation.js`: local geometry-only proposals; supports an explicit forced geometry pass when OCR.Space is configured.
- `src/ocrspace-client.js`: fixed HTTPS multipart request; Engine 3 default; orientation/table/scale/searchable-PDF flags; visible text layer; bounded response; safe provider PDF URL extraction; redirect and timeout safeguards.
- `src/ocrspace-field-evidence.js`: default-on with local-key interlock and allowlisted crops, Engine 3 first, quota reservation, visible-PDF request and Engine 2 PDF-only fallback when Engine 3 does not return a PDF URL. Evidence is diagnostic only.
- `src/ocrspace-quota-ledger.js`: atomic local JSON quota ledger with cross-process lock and fail-closed corruption behavior.
- `src/bot.js`: geometry-first OCR.Space prepass before Tesseract, identity exclusion, then existing Tesseract and local image-processing pipeline; a bounded post-local refinement is used only if the prepass could not produce evidence.
- `tests/ocrspace.test.js`, `tests/ocrspace-prepass.test.js` and `tests/ocrspace-reconciliation.test.js`: mocked request profile, default-on/key-interlock behavior, Engine 3 evidence, PDF fallback, privacy allowlists, quota, timeout, redirect, response-size, crop identity exclusion (including missing/weak identity fail-closed cases) and diagnostic reconciliation coverage.
- `package.json`: `npm run test:ocrspace`.

## Nine-field acceptance contract

The exact mandatory fields remain, in order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP is mandatory and ninth. OCR.Space cannot independently accept or overwrite any field. No fuzzy numeric/name correction or expected-value injection is allowed. Wrong, conflicting, ambiguous or missing values remain unresolved; release acceptance requires zero wrongly accepted mandatory values.

## Verification and live-use gates

Mock tests verify request shape, bounds, privacy allowlists, quotas and failure behavior; they do not prove live credentials, provider accuracy or any accuracy improvement. No live API request or accuracy benefit is claimed until a real HTTP request/response and paired comparison to Tesseract.js with approved ground truth are recorded.

Before a first live request: use a valid locally configured Free key, send only synthetic non-identifying crops, confirm the current Free tier and terms, retain redacted diagnostics, and verify the returned Engine 3 text and searchable-PDF URL. No production screenshot or production deployment is authorized by mocked test success.

## Official provider references

- API parameters and Engine 3: https://ocr.space/ocrapi
- Orientation: https://ocr.space/ocrapi#detectorientation
- Receipt/table recognition: https://ocr.space/receiptscanning and https://ocr.space/tablerecognition
- Auto-scaling: https://ocr.space/autoscale
- Searchable PDF: https://ocr.space/searchablepdf
- Engine 3: https://ocr.space/ocrapi#ocrengine3
- Handwriting: https://ocr.space/handwriting
- Status: https://status.ocr.space/
- Privacy policy: https://ocr.space/privacypolicy
