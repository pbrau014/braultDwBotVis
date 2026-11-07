# OCR.Space Engine 2 adapter

**Status:** Active implementation on `ocr-multiprovider`.  
**Role:** Primary online OCR evidence source when explicitly enabled.  
**Authority:** `DWBOT_BRANCH_CHARTER.md` and `docs/architecture/DWBOT_OCR_ACCURACY_ARCHITECTURE_DECISION.md`.

## Request and derivative flow

1. Hash and retain the original World of Warships screenshot bytes.
2. When OCR.Space is explicitly enabled, normalize only the upload copy if needed to satisfy the Free API's 1 MiB upload limit. Never alter the original screenshot.
3. Submit the prepared upload to OCR.Space Engine 2 with searchable-PDF creation enabled.
4. Validate the returned temporary PDF URL against the exact approved OCR.Space hosts, reject redirects, download with bounded streaming, validate the PDF signature, and render a bounded local raster for derivative inspection.
5. Preserve the original screenshot, prepared upload, searchable PDF, and rendered raster as separate identities. The adapter reports the original screenshot SHA-256, provider-input/upload SHA-256, PDF SHA-256, raster SHA-256, sizes, dimensions, MIME type, engine, processing time, provider status, and HTTP request counts.
6. The PDF and raster are additional evidence. Azure, Tesseract.js, native Tesseract, PaddleOCR, and OpenCV receive the same original screenshot bytes in the designated ensemble. They must not silently switch to the OCR.Space PDF raster or confuse its hash with the original screenshot hash.

The API request and searchable-PDF download each pass through a provider-fetch wrapper. The wrapper checkpoints immediately before each actual fetch invocation and counts the request. If the checkpoint fails, that request is not sent. Failures retain the exact number of fetch invocations attempted.

## Explicit activation and egress

OCR.Space is not enabled by this example configuration by default. A designated run requires:
- `DWBOT_MULTI_PROVIDER_ENABLED=1` for the ensemble;
- `OCRSPACE_ENABLED=1`;
- `OCRSPACE_NETWORK_ALLOWLIST=1`;
- a protected `OCRSPACE_API_KEY`.

When `OCR_NON_OCR_NETWORK_RESTRICTED=1`, the Node-process guard allows HTTPS only to the explicitly enabled OCR.Space hosts and the exact configured Azure resource endpoint. The guard is loaded before bot/provider imports in the multi-provider smoke process. It does not enforce OS-level egress restrictions or automatically constrain arbitrary native/Python child processes.

Do not include credentials in source, event logs, reports, error messages, or handoff packages. Do not send unrelated/private images, Discord account identifiers, or other personal data. Do not enable paid usage or upgrade a provider tier without separate cost authorization.

## Quota and privacy

The OCR.Space quota ledger is a local safeguard, not an account-wide service meter. It cannot see other machines or workloads using the same provider account. Review current provider terms, free-tier limits, retention, and privacy conditions before any live run. Do not automatically retry rate-limited requests.

## Related implementation

- `src/ocrspace-pdf-first.js` — upload preparation, Engine 2 request, PDF download, signature validation, raster rendering, provenance hashes and per-request callback/counting.
- `src/ocrspace-client.js` — bounded provider HTTP client and searchable-PDF URL validation.
- `src/ocrspace-quota-ledger.js` — local request quota accounting.
- `src/multi-provider-ocr.js` — explicit provider activation and concurrent online orchestration.
- `src/azure-document-intelligence-client.js` — independent Azure Read client.
- `src/parallel-local-ocr.js` — independent local readers, each launched with original screenshot bytes.
- `scripts/block-network.js` — Node-process exact-host provider allowlist.
- `scripts/run-multi-provider-smoke.js` — explicit live connectivity/evidence smoke report.
- `tests/ocrspace-pdf-first.test.js`, `tests/ocrspace-reconciliation.test.js`, and `tests/block-network.test.js` — adapter, evidence, and egress contracts.

## Acceptance interpretation

A successful OCR.Space response proves only that the provider participated and returned a response. It does not prove OCR accuracy or authorize a battle-record field. All nine fields remain mandatory: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. Preserve disagreements and unresolved values for manual review; never use raw confidence alone, majority vote, or a provider-only override.

This branch does not require the former Gate A/B/C/D sequence or a holdout corpus as a prerequisite for implementation. Labelled evaluation is available through `npm run summarize:multi-provider-accuracy` when complete independent ground truth is available.
