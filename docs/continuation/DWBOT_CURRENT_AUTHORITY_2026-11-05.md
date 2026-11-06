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
- Current main HEAD at this authority update: `17199b3b973be058631ae4c23a778f7694e8a589` (documentation-only plan synchronization atop source/test commit `18113f36bf3dc87c95407435a54e204e937734d5`).
- Current living plan: `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`.
- OCR.Space implementation guide: `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`.
- Source/test commit `18113f36bf3dc87c95407435a54e204e937734d5` fixes the PDF-first regression contract and aligns the Windows acceptance launcher/workflow with the governing OCR.Space Engine 2 first-pass policy. The current main head `17199b3b973be058631ae4c23a778f7694e8a589` adds the corresponding living-plan evidence.
- Exact-head run 393 tested source/test commit `18113f36bf3dc87c95407435a54e204e937734d5`. Linux offline verification passed; the PDF manual/clean-package job passed; Windows full Node 22 tests passed (303 passed, 0 failed, 2 skipped) and Windows process-level persistence/recovery passed. The Windows job nevertheless failed because GitHub reported `OCRSPACE_API_KEY configured: False`; the screenshot acceptance step was skipped.
- The run-393 clean package passed `npm ci`, `npm test` (302 passed, 0 failed, 3 skipped) and prelive checks. Package SHA-256: `9eb2729967cbc77264dff0f8b10de2b75bf4c67c13d3b3175542bd2e4901fa67`. Workflow artifact ID `13471365068`; artifact SHA-256 `3cae3847b8600069756ab0d8efc9d63ed9adbb191cb8b4a3ccf10cd7211074bf`.
- No live OCR.Space request, searchable PDF or image-acceptance result is verified. The repository Actions secret is confirmed missing/empty, not merely unverified. The repository owner must add `OCRSPACE_API_KEY` under Settings -> Secrets and variables -> Actions -> New repository secret; never paste the key into chat or logs. Re-run and inspect the exact-head workflow after the secret is configured.
- Run 394 is the workflow triggered by the documentation-only plan synchronization commit `17199b3b973be058631ae4c23a778f7694e8a589`; re-read its final result before claiming verification for that exact head.
- Windows acceptance sets a per-run `OCRSPACE_ARTIFACT_DIR`; the 64-image runner writes per-image PDF/raster artifacts. For other runs requiring durable evidence, configure `OCRSPACE_ARTIFACT_DIR` and verify the actual files/checksums.

The canonical living plan controls the operational queue and supersedes older dated handoff/status text. Preserve the historical records below as provenance; do not promote their former Engine 3/crop-first/default-off instructions to current policy.
