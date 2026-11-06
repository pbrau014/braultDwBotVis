# Current DWBOT authority — updated 2026-11-06

## Node.js runtime authorization — current and governing

Node.js **22.16.0 is the authorized and acceptable DWBOT baseline**. It replaces
older Node.js 24+, >=24.17.0 and v24.22.1 minimum/prerequisite statements.
The current package manifest and lockfile require >=22.16.0; the tracked
`.nvmrc` pins 22.16.0; and GitHub Actions uses 22.16.0 on Linux and Windows.
Node 24 remains optional only when a specific dependency/tool is proven to
require it. Do not block tests or release-candidate verification solely because
the runtime is Node 22.16.0. Windows-specific acceptance must still run on
Windows; this authorization does not convert Linux results into Windows proof.
Keep actual historical Node 24 reports unchanged and bound to their original
source fingerprints and runtime.

## Controlling OCR.Space architecture and activation

OCR.Space is the explicitly enabled, highest-priority text-extraction stage for every eligible original image in the authorized DWBOT screenshot inventories. Set `OCRSPACE_ENABLED=1`, `OCRSPACE_NETWORK_ALLOWLIST=1`, and provide a valid local `OCRSPACE_API_KEY`. Do not describe the active path as default-off, secondary, last-resort, or diagnostic-only.

OCR.Space Engine 2 must process each eligible original World of Warships screenshot first and create one searchable PDF. The searchable text layer is hidden from the rendered page but remains searchable. Download and validate the PDF over the approved HTTPS OCR.Space hosts, preserve its hash and bytes in the configured acceptance artifact directory, and render the PDF page locally to a bounded raster. Tesseract.js, native Tesseract, PaddleOCR (when enabled), OpenCV geometry and all subsequent local readers operate only on that PDF-derived raster. No local reader may fall back to the original screenshot after PDF-first processing begins. A missing/invalid PDF, failed download, failed required artifact preservation or rasterization error fails that image closed.

The current provider comparison marks Engine 2 searchable-PDF generation supported and Engine 3 unsupported; Engine 2 is the PDF-producing first pass. One OCR.Space request/PDF per eligible source image. Provider response text and the PDF text layer remain separate diagnostic/provenance evidence and cannot independently accept, merge, rewrite or override mandatory fields.

## Provider network policy

`OCRSPACE_NETWORK_ALLOWLIST=1` explicitly permits HTTPS access to `api.ocr.space` and `ocr.space` for the provider request and temporary PDF download. The network guard must not block these provider hosts. `OCR_NON_OCR_NETWORK_RESTRICTED=1` restricts only unrelated outbound destinations; it is not a provider network block. Keep unrelated egress restricted rather than enabling arbitrary destinations.

`OCRSPACE_ENABLED=0` is permitted only for isolated mocks/offline tests that do not submit an original image, or for downstream local-reader invocations after the successful PDF-first stage has already produced the raster. It must never be used to process an eligible original image as a local-only fallback.

## Scope, privacy and acceptance

The user's explicit upload authorization is limited to the named 4-, 16- and 64-image World of Warships inventories, including visible player names in those images. Do not transmit unrelated images, credentials, Discord IDs, private account data or unrelated UI. No paid tier/usage, production screenshot transmission, live Discord action or production deployment is authorized. Keep API keys out of source, chat, logs, reports and artifacts; retain quota reservations, no automatic retries, bounded requests, fail-closed behavior and current provider terms/privacy review.

Nine mandatory fields remain exactly: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Zero wrongly accepted mandatory values is required; Gate A also requires zero unresolved mandatory fields. Production remains NO-GO until all gates pass.

## Current source checkpoint

- Canonical repository: `pbrau014/braultDwBotVis`, branch `main`.
- Exact-head run 399 tested main commit `0547237613e3ee331244a591b959642b789b151c`; this authority synchronization is documentation-only on top of that checkpoint.
- Current living plan: `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`.
- OCR.Space implementation guide: `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`.
- Source/test commit `18113f36bf3dc87c95407435a54e204e937734d5` aligns eligible screenshot acceptance with OCR.Space Engine 2 PDF-first. The 64-image safety correction is verified on code checkpoint `2362320ab0daaa001303012a212296bd27bd350a`: only 56 user-eligible images can be submitted; eight user-excluded images are skipped, and all 64 member hashes plus realpath containment are checked before any provider request.
- Exact-head run 399 tested `0547237613e3ee331244a591b959642b789b151c`. Linux focused OCR.Space suite: 51 passed, 0 failed, 0 skipped; Linux full suite: 309 passed, 0 failed, 2 skipped. Windows full suite: 309 passed, 0 failed, 2 skipped. The six 64-inventory safety tests passed in the full suites.
- PDF manual and clean-package job passed. Clean extracted package npm test: 308 passed, 0 failed, 3 skipped; prelive: 21 passed, 0 failed. Package manifest verified with 550 entries. Package ZIP SHA-256: `faeaa16b4d6b4a98582623a070c7778283543266d5138bc1b4e7848629d2d3d5`. Artifact ID `13471702699`, SHA-256 `37bd1b652c2bafd31301ce1ba4351be32e9d65b62a017c076fdc3e4cc256215c`.
- Run 399 is an overall FAILURE because the Windows protected-secret check reported `OCRSPACE_API_KEY configured: False`. The current-source screenshot-acceptance step was skipped. No live OCR.Space request, searchable PDF, 4-/16-image acceptance or 64-image processing is verified.
- The 64-image manifest contains 64 unique decode-verified records: 56 eligible and 8 explicitly excluded. The exact imgsHalf1.zip archive and extracted image root are still unavailable; no substitute is authorized. The 64 inventory has no independent nine-field ground truth and is not a holdout.
- The independent holdout (50 minimum / 100 preferred, independently labeled for all nine fields) remains unavailable. Production remains NO-GO.
- The repository Actions secret is confirmed missing/empty. The repository owner must add `OCRSPACE_API_KEY` under Settings -> Secrets and variables -> Actions -> New repository secret; never paste the key into chat or logs. Rerun the exact-head workflow after it is configured.
- Windows acceptance sets a per-run `OCRSPACE_ARTIFACT_DIR`; the 64-image runner writes per-image PDF/raster artifacts. For other runs requiring durable evidence, configure `OCRSPACE_ARTIFACT_DIR` and verify the actual files/checksums.

The canonical living plan controls the operational queue and supersedes older dated handoff/status text. Preserve the historical records below as provenance; do not promote their former Engine 3/crop-first/default-off instructions to current policy.
