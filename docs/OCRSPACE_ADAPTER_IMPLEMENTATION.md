# OCR.Space PDF-first image processing — governing implementation

**Status:** Implemented in canonical main; live provider and inventory acceptance remain unverified.
**Authority:** The user's 2026-11-06 instruction in this chat supersedes earlier crop-only, diagnostic-only, default-off and local-original-image descriptions.

## Required sequence
1. Receive the original World of Warships screenshot.
2. OCR.Space Engine 2 processes the complete source image first and creates a searchable PDF with a searchable text layer hidden from the rendered page so the local OCR readers do not see duplicate overlay text. The current provider comparison lists searchable-PDF creation as supported for Engine 2 and unsupported for Engine 3.
3. Download the temporary PDF immediately from an approved HTTPS OCR.Space host. Reject redirects, invalid URLs, non-PDF payloads, oversized responses and timeouts.
4. Render the PDF page locally to a bounded PNG raster.
5. Run Tesseract.js, native Tesseract, PaddleOCR (when enabled), OpenCV geometry and all other local image readers on that PDF-derived raster. After successful PDF creation, no local reader may return to the original screenshot.
6. Run existing parsers, independent-read/geometry consensus and exact nine-field validation. OCR.Space text/PDF text-layer evidence remains separate; it is not injected into local OCR candidates or used to accept remote-only values.

If OCR.Space processing, PDF creation/download or rasterization fails, the image fails closed. Do not substitute OCR of the original screenshot. Eligible original-image intake requires `OCRSPACE_ENABLED=1`, `OCRSPACE_NETWORK_ALLOWLIST=1`, and a valid local `OCRSPACE_API_KEY`. `OCRSPACE_ENABLED=0` is reserved for isolated mocks/offline tests and local-reader invocations on a raster already produced from a successful OCR.Space PDF-first pass; it must never be used to process an eligible original image as a local-only fallback.

## Upload normalization and provenance
The OCR.Space Free API file limit is 1 MiB. Images above that limit are re-encoded locally to a bounded JPEG using a descending size/quality profile. The original image is never modified. Record original image SHA-256/size; normalized upload SHA-256/size/dimensions/quality; OCR.Space engine, processing time and provider exit status; searchable PDF SHA-256/size; rendered raster dimensions/size; per-image local-reader outputs and exact comparisons.

The user explicitly authorized OCR.Space processing of the 4-image and 16-image inventories, plus the 21-image complete-ground-truth subset selected from the current 63-image exploratory corpus, including player names visible in those screenshots. Do not initiate a separate 64-image inventory run. Never send credentials, Discord IDs, private account data, unrelated UI or unrelated images. Never log or package the API key.

## Provider limits and privacy
The official API currently documents a 1 MiB Free API upload limit, 500 requests/day, 25,000 requests/month and three PDF pages per document. Free searchable PDFs contain an OCR.Space watermark. Searchable-PDF URLs remain available for one hour. The privacy policy says uploads are deleted after processing, generated PDFs after 60 minutes, and API IP logs after one month. Verify current terms before live processing. Do not use paid tiers or automatically retry rate-limited requests. Reserve quota before every provider request and fail closed on quota-ledger errors.

`OCRSPACE_NETWORK_ALLOWLIST=1` explicitly permits HTTPS to `api.ocr.space` for the API request and `ocr.space` / `api.ocr.space` for the temporary PDF download. The network guard does not block these provider hosts. When `OCR_NON_OCR_NETWORK_RESTRICTED=1`, it restricts and logs only unrelated outbound destinations; this is not blanket network blocking and does not prevent OCR.Space from using the network. Keep the provider allowlist narrow rather than enabling unrestricted outbound access.

## Implementation
- src/ocrspace-pdf-first.js: Engine 2 image-first request, searchable PDF URL validation, bounded download, PDF signature check, provenance hashes and raster handoff.
- src/ocrspace-field-evidence.js and src/ocrspace-prepass.js: legacy crop-only helpers retained for historical tests/provenance; not used by the active bot.
- src/image-processor.js: bounded JPEG upload normalization and searchable-PDF page rendering.
- src/bot.js: performs PDF-first processing before OpenCV/Tesseract; subsequent readers receive only the PDF raster. Production entrypoint refuses normal startup without OCRSPACE_API_KEY; OCRSPACE_ENABLED=0 is local-only.
- scripts/block-network.js: OCR.Space-only HTTPS allowlist for acceptance.
- scripts/run-windows-ocr-acceptance.ps1: requires OCRSPACE_API_KEY, runs PDF-first acceptance, retains PDF/raster artifacts.
- `OCRSPACE_ARTIFACT_DIR` is set to a per-run directory by the Windows acceptance wrapper; the PDF and PDF-derived raster are retained there. The current 63-image exploratory run includes the 21-image complete-ground-truth subset. Reuse its saved artifacts for the subset evaluation; do not submit those 21 images again. The normal bot only writes durable artifacts when `OCRSPACE_ARTIFACT_DIR` is configured; set it before any run that requires persistent evidence. No artifact is claimed until the file and checksum are inspected.
- tests/ocrspace-pdf-first.test.js and tests/ocrspace-64-inventory.test.js: mocked PDF-first contracts plus 64-inventory eligibility, exclusion, preflight and path-containment regressions.
- npm run test:ocrspace includes PDF-first contract tests.

## Inventory gates
| Corpus | Source | Expected truth | Required handling |
|---|---|---|---|
| 4 images | fixtures/four-screenshots/ | Existing exact expected values | OCR.Space PDF first, then local readers, compare all nine fields |
| 16 images | fixtures/additional-screenshots/ | testdata/additional-screenshot-ground-truth.json | OCR.Space PDF first, then local readers, compare all nine fields |
| 21 images / Gate B | First 21 corpus-order records in testdata/ground-truth/imagesF-63-working-ground-truth-v6.json | Complete manual transcription; all nine fields eligible | Approved Gate B holdout replacing the former 50-image minimum. Reuse the current 63-image exploratory run's PDF/raster/local-reader outputs; verify artifacts and post-hoc evaluate only these 21 records. No duplicate OCR.Space submissions or tuning. |

The retired 64-image inventory and its archive are not required for the current project test matrix. The legacy manifest/runner remain only as historical regression material. The active 21-image selection is deterministically checked against the v6 ground-truth record statuses and all nine field-eligibility flags; source filename, byte size and SHA-256 must match the verified 63-image preflight. The evaluator is post-hoc only and does not submit images.

## Acceptance criteria
- OCR.Space Engine 2 creates one searchable PDF per source image.
- PDF is downloaded, signature-checked and rasterized locally.
- Tesseract.js/native Tesseract and any enabled PaddleOCR/OpenCV processing use the PDF-derived raster only.
- All nine fields remain mandatory: result, player, map, mode, battleStart, credits, freeXp, damage, xp.
- Zero wrong accepted mandatory values and zero unresolved required fields for exact-ground-truth corpora. Any wrong accept or unresolved field fails.
- No network destinations beyond the explicit OCR.Space HTTPS allowlist.
- Preserve per-image logs, artifacts, checksums, engine versions and exact-source fingerprint.
- No production release until all existing OCR, Windows/native, security, recovery, desktop/browser, Discord and package gates pass.

## Official references
- API parameters and searchable PDF: https://ocr.space/ocrapi
- Privacy policy: https://ocr.space/privacypolicy

The API documentation contains mixed historical wording about Engine 3 PDF support. The current comparison table marks Engine 3 searchable PDF unsupported; this implementation therefore uses Engine 2 for the PDF-producing first pass.


## Gate B sample-size amendment

The active Gate B holdout is exactly the 21-image complete-ground-truth subset
from the v6 reference. This supersedes the former 50-image minimum / 100-image
preferred target. The selection is deterministic, source-hash-bound and
separate from the 16-image development corpus. Gate B does not pass on the
ground-truth count alone: it requires 21/21 artifact verification, a complete
post-hoc evaluation, zero wrongly accepted mandatory values, and zero
unauthorized network attempts. The manual reference remains qualified as
independent of OCR outputs but not documented as blind double-annotated.
