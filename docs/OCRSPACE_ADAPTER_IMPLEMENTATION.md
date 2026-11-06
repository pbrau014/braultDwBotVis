# OCR.Space PDF-first image processing — governing implementation

**Status:** Implemented in canonical main; live provider and inventory acceptance remain unverified.
**Authority:** The user's 2026-11-05 instruction in this chat supersedes earlier crop-only and diagnostic-only OCR.Space descriptions.

## Required sequence
1. Receive the original World of Warships screenshot.
2. OCR.Space Engine 2 processes the complete source image first and creates a searchable PDF with a searchable text layer hidden from the rendered page so the local OCR readers do not see duplicate overlay text. The current provider comparison lists searchable-PDF creation as supported for Engine 2 and unsupported for Engine 3.
3. Download the temporary PDF immediately from an approved HTTPS OCR.Space host. Reject redirects, invalid URLs, non-PDF payloads, oversized responses and timeouts.
4. Render the PDF page locally to a bounded PNG raster.
5. Run Tesseract.js, native Tesseract, PaddleOCR (when enabled), OpenCV geometry and all other local image readers on that PDF-derived raster. After successful PDF creation, no local reader may return to the original screenshot.
6. Run existing parsers, independent-read/geometry consensus and exact nine-field validation. OCR.Space text/PDF text-layer evidence remains separate; it is not injected into local OCR candidates or used to accept remote-only values.

If OCR.Space processing, PDF creation/download or rasterization fails, the image fails closed. Do not substitute OCR of the original screenshot. The production bot requires OCRSPACE_API_KEY; OCRSPACE_ENABLED=0 is explicit local-only development/test mode.

## Upload normalization and provenance
The OCR.Space Free API file limit is 1 MiB. Images above that limit are re-encoded locally to a bounded JPEG using a descending size/quality profile. The original image is never modified. Record original image SHA-256/size; normalized upload SHA-256/size/dimensions/quality; OCR.Space engine, processing time and provider exit status; searchable PDF SHA-256/size; rendered raster dimensions/size; per-image local-reader outputs and exact comparisons.

The user explicitly authorized OCR.Space processing of the 4-, 16-, and 64-image World of Warships inventories in this chat, including player names visible in those screenshots. This authorization is limited to those inventories. Never send credentials, Discord IDs, private account data, unrelated UI or unrelated images. Never log or package the API key.

## Provider limits and privacy
The official API currently documents a 1 MiB Free API upload limit, 500 requests/day, 25,000 requests/month and three PDF pages per document. Free searchable PDFs contain an OCR.Space watermark. Searchable-PDF URLs remain available for one hour. The privacy policy says uploads are deleted after processing, generated PDFs after 60 minutes, and API IP logs after one month. Verify current terms before live processing. Do not use paid tiers or automatically retry rate-limited requests. Reserve quota before every provider request and fail closed on quota-ledger errors.

Network acceptance allows only HTTPS to api.ocr.space and ocr.space for the API call and temporary PDF download. All other outbound requests remain blocked and logged.

## Implementation
- src/ocrspace-pdf-first.js: Engine 2 image-first request, searchable PDF URL validation, bounded download, PDF signature check, provenance hashes and raster handoff.
- src/ocrspace-field-evidence.js and src/ocrspace-prepass.js: legacy crop-only helpers retained for historical tests/provenance; not used by the active bot.
- src/image-processor.js: bounded JPEG upload normalization and searchable-PDF page rendering.
- src/bot.js: performs PDF-first processing before OpenCV/Tesseract; subsequent readers receive only the PDF raster. Production entrypoint refuses normal startup without OCRSPACE_API_KEY; OCRSPACE_ENABLED=0 is local-only.
- scripts/block-network.js: OCR.Space-only HTTPS allowlist for acceptance.
- scripts/run-windows-ocr-acceptance.ps1: requires OCRSPACE_API_KEY, runs PDF-first acceptance, retains PDF/raster artifacts.
- tests/ocrspace-pdf-first.test.js: mocked first-pass, upload-size normalization, PDF URL/redirect/signature/size and fail-closed tests.
- npm run test:ocrspace includes PDF-first contract tests.

## Inventory gates
| Corpus | Source | Expected truth | Required handling |
|---|---|---|---|
| 4 images | fixtures/four-screenshots/ | Existing exact expected values | OCR.Space PDF first, then local readers, compare all nine fields |
| 16 images | fixtures/additional-screenshots/ | testdata/additional-screenshot-ground-truth.json | OCR.Space PDF first, then local readers, compare all nine fields |
| 64 images | imgsHalf1.zip / dwbotStuff/DWBOT_64_IMAGE_INVENTORY_REVIEWED.json | No independent nine-field ground truth | Process all 64 when archive is restored and SHA-verified; report extraction only, not accuracy. Preserve 56 eligible / 8 excluded classification |

The 64-image archive is not in the current repository tree. The reviewed provenance specifies imgsHalf1.zip as 57,665,767 bytes with SHA-256 e32e43991ab90d6e2ca3e060f264456d175d0e93390f273d7f3a3f5d93fa98a2. The 58,090,288-byte inventory total is the sum of the 64 uncompressed image files, not a competing ZIP size. Retrieve the exact archive, verify its size/hash, then verify all 64 member hashes before processing; never reconstruct or select a candidate by guess.

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
