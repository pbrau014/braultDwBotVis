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
- Current main HEAD at this authority update: `23f92938ec02ebf9dd3bedd72f587183c47aa16d`.
- Current living plan: `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`.
- OCR.Space implementation guide: `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`.
- The PDF-first source is implemented; the latest test correction and documentation sync are committed. No live provider request or provider PDF is verified in this chat. The local API key is unavailable here and the Actions secret's presence/value is unverified. Combined commit status returned no status entries; no exact-head CI pass is claimed.
- Windows acceptance sets a per-run `OCRSPACE_ARTIFACT_DIR`; the 64-image runner writes per-image PDF/raster artifacts. For other runs requiring durable evidence, configure `OCRSPACE_ARTIFACT_DIR` and verify the actual files/checksums.

The canonical living plan controls the operational queue and supersedes older dated handoff/status text. Preserve the historical records below as provenance; do not promote their former Engine 3/crop-first/default-off instructions to current policy.
