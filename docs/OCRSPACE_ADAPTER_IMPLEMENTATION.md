# OCR.space Free API — remote OCR evidence integration

## Operating rule

For DWBOT OCR work, prefer a configured non-local OCR API when an appropriate free-tier service is available. The selected provider is the official **OCR.space Free API**. Do not silently substitute an unrelated provider or a paid endpoint. Keep the API key local and never commit it.

The API is used for unresolved mandatory fields after local ROI localization. It receives bounded, pre-localized crops only; it does not receive full screenshots. Tesseract.js remains the local baseline and PaddleOCR remains an optional local comparison/fallback. Remote OCR is preferred for additional evidence on unresolved crops, while local engines remain available when the API is unconfigured, rate-limited, unavailable, or over budget.

This is a hybrid, fail-open architecture: remote evidence is attempted when enabled and eligible; local OCR continues to operate if the service cannot be used. Do not claim a request occurred unless a real HTTP request and response are recorded.

## Current implementation — dwbotVis

- src/ocrspace-client.js: official HTTPS multipart client, API-key header, Engine 2/3 support, input MIME/size limits, bounded timeout, response/error classification, and no automatic retry after HTTP 429.
- src/ocrspace-field-evidence.js: sequential localized-crop collection, per-image crop/time bounds, and evidence-only results.
- src/ocrspace-quota-ledger.js: atomic local JSON quota ledger with cross-process lock, stale-lock handling, and fail-closed corruption behavior.
- src/bot.js: integration after local OCR/ROI localization. It selects unresolved fields, builds localized crops, invokes OCR.space, and records separate ocrSpaceEvidence.
- tests/ocrspace.test.js: mocked contract, input validation, API response, timeout, and quota tests.
- package.json: npm run test:ocrspace.

## Configuration

Copy .env.discord-test.example to a local .env, then replace the placeholder with a real OCR.space Free API key obtained directly from the provider. The example enables the stage for an isolated test, but a placeholder is not a credential and cannot authenticate a request. In normal configuration, a non-empty OCRSPACE_API_KEY enables OCR.space automatically unless OCRSPACE_ENABLED=0 is explicitly set.

    OCRSPACE_API_KEY=your_private_free_tier_key
    # Optional: set OCRSPACE_ENABLED=0 to disable explicitly
    OCRSPACE_MAX_CROPS=2
    OCRSPACE_STAGE_BUDGET_MS=20000
    OCRSPACE_MAX_PER_DAY=450
    OCRSPACE_MAX_PER_MONTH=22000
    OCRSPACE_MAX_ENGINE3_PER_MONTH=900
    OCRSPACE_QUOTA_PATH=./data/ocrspace-quota.json

Never put a real key in Git, chat, logs, screenshots, or test fixtures. Store it only in the local environment. Do not use production credentials in an isolated test configuration.

## Provider data handling

The provider states that uploaded documents are deleted after processing and are not retained; it also states that API access IP addresses are logged for one month. Recheck the provider's current privacy policy and terms before changing what data is transmitted. DWBOT's default scope remains localized crops only, not complete battle screenshots. Source: https://ocr.space/privacypolicy.

## Data boundary and validation

- Only unresolved mandatory fields are eligible for remote evidence.
- The bot sends localized crops, not full screenshots.
- The client enforces a 1 MiB input ceiling and supported image MIME types.
- Requests are sequential and bounded by crop count and remaining per-image time.
- The quota ledger reserves usage before a request and fails closed if its state is corrupt or locked.
- Engine 3 is used for player identity; Engine 2 is used for other supported crops.
- API text and word overlays remain separate diagnostics. They are not merged into accepted Tesseract/Paddle candidate arrays and cannot independently accept, rewrite, normalize, or repair any mandatory field.
- The nine-field exact-value contract, including XP, remains authoritative. Missing, invalid, or ambiguous values remain unresolved.
- API failure must not fail the local OCR job. Do not retry automatically after rate limiting.
- Respect the provider's current free-tier limits and terms; internal quota limits are intentionally lower than published ceilings.

## Verification status

The repository's OCR.space tests use injected/mock fetch responses. They verify request shape and failure handling but do not prove live credentials, connectivity, current provider availability, or accuracy benefit.

A live smoke test requires:
1. A valid locally configured free-tier API key.
2. Explicit confirmation that the user authorizes transmission of the selected synthetic or otherwise approved localized crop to OCR.space.
3. A single bounded request with no secret or full screenshot in logs.
4. Recording HTTP/provider status, elapsed time, engine, crop dimensions/size, returned text/overlay, and quota reservation without storing the API key.
5. Separate comparison against the local result and known ground truth. Do not change exact validation based on a single provider response.

A configured key enables the remote stage by default; OCRSPACE_ENABLED=0 is the explicit opt-out. Until a live test is performed, report the integration as implemented and mock-tested, but live API operation and accuracy gain as unverified.
