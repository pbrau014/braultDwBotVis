# DWBOT multi-provider OCR branch charter

- Status: Active implementation direction for `ocr-multiprovider`
- Date: 2026-11-06
- Scope: This branch is a fresh implementation workspace based on the complete `main` baseline at its branch-creation point.
- Isolation: All changes remain on `ocr-multiprovider`. Do not update or merge `main` without separate authorization.

## Current project direction

This branch is not governed by the former Gate A/Gate B/Gate C/Gate D release sequence. There is no holdout-corpus prerequisite and no legacy gate that may stop ordinary implementation, testing, integration, documentation, or deployment preparation. Do not recreate those gates as mandatory prerequisites.

Continue implementation iteratively: make a coherent change, run the relevant tests, inspect results, correct defects, and continue. Report genuine technical blockers (for example missing credentials, unavailable provider resources, missing source inputs, or external service outages) as actionable dependencies, not as legacy release-gate failures.

## Provider-request rule

Provider requests are explicitly enabled functionality, not a permanently disabled diagnostic contingency. The application must support a designated run that requests the configured online providers concurrently with available local readers.

- Primary online provider: OCR.Space Engine 2 searchable-PDF-first.
- Secondary online provider: Azure AI Document Intelligence Read (`prebuilt-read`) using the API version supported by the adapter.
- Local readers retained: Tesseract.js, native Tesseract, and PaddleOCR.
- Image analysis and geometry: OpenCV.
- The original screenshot is the immutable source identity. Azure and the independent parallel local-reader workers receive the original bytes. The primary in-process Tesseract.js path uses a separately hashed local preprocessing derivative. OCR.Space receives the original bytes when they fit its 1 MiB Free API cap; otherwise it receives a bounded resized/re-encoded derivative with a separate hash. Any searchable PDF/raster outputs are additional derivatives, never replacements for the original source.
- Preserve each provider's raw text, line/word geometry, model/API version, source and derived hashes, timing, request state, and errors.
- A provider that was not configured, could not start, or failed must be represented honestly. Do not report it as having participated.
- Credentials are provided through runtime secrets, never committed or logged.

A multi-provider run is explicitly activated with:
- `DWBOT_MULTI_PROVIDER_ENABLED=1`
- `OCRSPACE_ENABLED=1` and `OCRSPACE_API_KEY`
- `AZURE_DOCUMENT_INTELLIGENCE_ENABLED=1`, `AZURE_DOCUMENT_INTELLIGENCE_TIER=F0`, `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, and `AZURE_DOCUMENT_INTELLIGENCE_KEY`

The Azure tier environment value is only an operator attestation. Confirm the resource's actual SKU in the provider console before sending requests. The code's quota ledger and request-size limits are local safeguards, not proof of the remote SKU. Do not incur paid usage or upgrade a provider tier without separate cost authorization.

## Data contract and compatibility

Keep the current battle-record output shape compatible while the multi-provider pipeline is implemented. Existing nine-field records may remain supported as the current application contract, but no old gate, holdout, or acceptance-corpus rule is a prerequisite for implementation. Do not silently change stored data or workbook formats; if a new schema is needed, implement an explicit migration and compatibility path.

## Development and verification

- Offline unit tests and mocked provider tests must not make network requests.
- Real provider integration tests must be explicit, use configured credentials, and clearly report whether requests were actually made.
- Test local readers and online readers independently and in combination.
- Continue through integration, diagnostics, error handling, performance improvements, documentation, and CI review.
- Do not treat a successful mock as proof of live-provider availability or OCR accuracy.
- Do not claim completion until the relevant implementation and tests have actually completed.

## Supersession

This charter supersedes earlier DWBOT branch-specific workflow and gate instructions for work performed on `ocr-multiprovider`. It does not authorize changes to `main`, unrelated repositories, third-party account settings, paid services, or unrelated personal data.
