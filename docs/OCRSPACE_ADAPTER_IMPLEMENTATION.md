# OCR.space Free API — restricted last-resort evidence integration

## Operating rule

Tesseract.js remains the primary local OCR baseline. OpenCV performs local geometry/ROI isolation. PaddleOCR is an optional local comparison/fallback. OCR.space Free API is the secondary, last-resort remote evidence provider and runs only after local OCR (including an enabled local PaddleOCR fallback) has completed and mandatory fields remain unresolved.

Remote use is default-off. Both OCRSPACE_ENABLED=1 and a locally stored, valid Free API key are required. A key alone never enables network use. Do not silently substitute another provider or any paid endpoint. Never commit, display, log or package the API key.

## Current implementation

- src/ocrspace-client.js: fixed HTTPS multipart endpoint, API-key header, redirect rejection, complete request/response timeout, bounded response parsing, MIME/input limits, response/error classification and no automatic retry after HTTP 429.
- src/ocrspace-field-evidence.js: explicit opt-in, strict non-identifying field/source allowlists, sequential crop collection, per-image crop/time bounds and evidence-only results.
- src/ocrspace-quota-ledger.js: atomic local JSON quota ledger with cross-process lock, stale-lock handling and fail-closed corruption behavior.
- src/bot.js: last-resort integration after Tesseract and optional local PaddleOCR; sends only unresolved allowlisted field crops and records separate ocrSpaceEvidence.
- tests/ocrspace.test.js: mocked contract, default-off, identity/unknown-field rejection, redirect, timeout/body parsing, response bounds, quota and evidence-isolation tests.
- package.json: npm run test:ocrspace.

## Configuration

Default-off example:

    OCRSPACE_ENABLED=0
    OCRSPACE_API_KEY=
    OCRSPACE_MAX_CROPS=2
    OCRSPACE_STAGE_BUDGET_MS=20000
    OCRSPACE_MAX_PER_DAY=450
    OCRSPACE_MAX_PER_MONTH=22000
    OCRSPACE_MAX_ENGINE3_PER_MONTH=900
    OCRSPACE_QUOTA_PATH=./data/ocrspace-quota.json

Only set OCRSPACE_ENABLED=1 for a specifically authorized isolated synthetic test after reviewing current provider terms/privacy/retention and confirming the Free tier. Keep the API key in the local environment only. Do not use production credentials.

## Data boundary and validation

- Eligible diagnostic crops are allowlisted: xp, freeXp, credits, damage, result and battleMetadata (a non-identifying map/mode/battle-start region).
- Player name/identity, Discord IDs, credentials, private account data, unknown fields, arbitrary sources, unrelated UI and full screenshots are categorically excluded.
- The DWBOT field collector currently uses Engine 2 only. Engine 3 is not used for player identity.
- The client enforces a 1 MiB input ceiling, PNG/JPEG/BMP MIME allowlist and 256 KiB response ceiling. The timeout remains active through full body parsing; redirects are rejected.
- Requests are sequential, bounded by crop count and remaining per-image time, and quota is reserved before each request. Internal quotas remain below provider-published free ceilings.
- OCR.space text and overlays remain separate diagnostic evidence. They are never merged into Tesseract/Paddle accepted candidate arrays and cannot independently accept, rewrite, normalize, fuzzy-correct or repair any mandatory field.
- Missing, invalid, ambiguous or conflicting mandatory values remain unresolved. The exact nine-field contract, including mandatory ninth field XP, remains authoritative.
- API failure never fails or mutates the local OCR job. Do not retry automatically after rate limiting.

## Provider data handling

Before any live request, recheck the provider's current terms, privacy policy, retention and Free-tier quotas. The provider's published privacy statements must not be assumed permanent. Source to review: https://ocr.space/privacypolicy. Use synthetic crops for the first live smoke test.

## Verification status

Mocked tests verify request shape, safeguards and failure behavior; they do not prove live credentials, network availability, provider accuracy or accuracy benefit. A live smoke test requires a valid locally configured Free key, explicit approved synthetic-crop transmission, one bounded request, redacted diagnostics, and separate comparison to local OCR plus known ground truth. Never log the key. No live request or accuracy improvement is claimed until a real HTTP request/response and paired benchmark are recorded.
