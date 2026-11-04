# OCR.space optional crop adapter — implementation note

## Status — current `dwbotVis` branch

The current `dwbotVis` tree contains this design note but does **not** contain `src/ocrspace-adapter.js`, `tests/ocrspace-adapter.test.js`, an OCR.space orchestration call site, or an `npm run test:ocrspace-adapter` script. The implementation and test details below describe a prior working-copy effort and are not evidence that the adapter exists in this branch. Treat OCR.space as NOT INTEGRATED until the code, tests, and call site are restored to this branch and verified. No live provider request is authorized or claimed.

## Safety and acceptance boundary

- Disabled by default. Set `OCRSPACE_ENABLED=true` and provide `OCRSPACE_API_KEY` locally to instantiate an enabled adapter.
- Only the official HTTPS `api.ocr.space` host is accepted.
- Accepts an already-localized image crop, not a full screenshot; request payloads are capped at 1 MiB.
- Engine 3 is selected by default for `player`; Engine 2 is selected for other fields. An explicit engine must be 2 or 3.
- Provider text is returned as raw evidence marked `evidenceOnly`. It is not a parsed, selected, or accepted battle-field value.
- Existing exact parsers, validation, provenance and abstention remain authoritative. Do not append remote-only text directly to the accepted candidate stream.
- API key is passed only in the request header and is never included in returned evidence or error messages.
- Requests have a bounded timeout; provider errors, HTTP errors, malformed JSON and empty recognition results fail closed.

## Configuration

```powershell
$env:OCRSPACE_ENABLED = 'true'
$env:OCRSPACE_API_KEY = '<your locally stored free-tier API key>'
```

Do not commit a real key or `.env` file. No external request is made by the offline contract tests.

## Tests

Run:

```powershell
node --test tests/ocrspace-adapter.test.js
# or
npm run test:ocrspace-adapter
```

The live API smoke test remains separate and requires explicit user approval to transmit an actual screenshot crop to the provider after reviewing current provider terms, privacy/retention and quota limits.

## Remaining integration work

1. Add a bounded crop-only call site after local ROI localization, behind the explicit opt-in.
2. Preserve local OCR as baseline; remote output may corroborate but must not independently introduce or accept a value.
3. Add field-level source/provenance and a quota/rate-limit ledger before enabling routine provider calls.
4. Add end-to-end mocked orchestration tests and then separately authorized live provider validation.
