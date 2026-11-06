# DWBOT update — imagesF 63 exploratory OCR.Space runner

Date: 2026-11-05
Repository: `pbrau014/braultDwBotVis`
Branch: `main`

## Exact archive source and gate

- User-supplied download URL: https://github.com/user-attachments/files/34459783/DWBOT_IMAGESF_HOLDOUT_CANDIDATE_63.zip
- Expected archive size: 25,862,132 bytes
- Expected archive SHA-256: `6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3`
- Expected embedded full manifest SHA-256: `c84f590e61ef835c9b53cf6baceb3f1937cf88b06cb9aafaf0472c65f796ffc6`
- Expected ZIP members: 63 image files plus one manifest (64 total).
- The GitHub release API currently lists no binary release assets. The workflow therefore downloads the exact user-attachment URL directly; the runner must prove it obtained the expected bytes before any provider access.

## Implementation

- `scripts/prepare-ocrspace-imagesF-63.py` verifies the whole-archive fingerprint, embedded manifest fingerprint, exact member set, safe flat paths, no duplicate names/symlinks, exact member sizes and SHA-256 hashes, then extracts to a clean runner directory.
- `scripts/run-ocrspace-imagesF-63-exploratory.js` rechecks the source image hashes after preflight, sends each verified source through OCR.Space Engine 2 searchable-PDF generation, validates/downloads the PDF through the existing PDF-first implementation, saves the PDF and its locally rasterized page, and runs Tesseract.js and native Tesseract only against the PDF-derived raster.
- The report records source/upload/PDF/raster hashes, provider response metadata and parsed text, local reader outputs, per-image failures, and a report checksum.
- The workflow uploads the preflight report, full embedded manifest, exploratory report, per-image searchable PDFs and PDF-page rasters, and the existing missing-label register even if a step fails.

## Evaluation limits

Every per-image accuracy field and the run-level accuracy value are fixed to `NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH`. Gate B is explicitly `NOT_PASSED`. The existing gap register is included unchanged; no missing labels are inferred or fabricated. This is exploratory extraction only and cannot authorize production use.

## Execution status

Implementation has been committed to `main`. A runner-side download, preflight, provider run, and artifact upload are not considered complete until their actual Actions run and artifacts have been inspected. A workflow failure at download or preflight must result in zero OCR.Space submissions.
