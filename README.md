# DWBOT — World of Warships YOLO Tournament Discord Bot

DWBOT is a Node.js Discord tournament bot with a strict screenshot-to-battle-record pipeline, tournament scoring/workbook integration, persistent state, and an optional local Player/Admin desktop workspace.

**Active implementation branch:** `ocr-multiprovider`  
**Repository:** `pbrau014/braultDwBotVis`  
**Branch policy:** keep implementation changes on `ocr-multiprovider`; do not merge to or modify `main` without separate authorization.

## Runtime

- Node.js `>=24.17.0` (repository pin: `24.22.1`).
- Install with `npm ci`.
- Run the complete offline suite with `npm test`.
- The bundled tournament workbook is `assets/YOLO-Tournament-Workbook.xlsm`; do not silently replace it or change its formulas/schema.

## Mandatory battle-record contract

All nine fields are mandatory, in this order:

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

XP is the ninth and final required field. Missing, invalid, ambiguous, or conflicting values remain unresolved and require human correction. A complete-looking record is not automatically posted if independent OCR evidence disagrees. Never guess player characters or numeric digits.

## OCR architecture

The implementation retains independent evidence sources:

- **OCR.Space Engine 2** — primary online provider when explicitly enabled; searchable-PDF-first output is preserved as derivative evidence.
- **Azure AI Document Intelligence `prebuilt-read`** — optional secondary online provider, explicitly enabled and limited to the configured resource endpoint.
- **Tesseract.js**, **native Tesseract**, and **PaddleOCR** — independent local readers.
- **OpenCV** — image analysis, region geometry, and crop assistance; it is not an OCR engine.

A designated multi-provider run sends the same original screenshot bytes to each configured provider/reader. OCR.Space's prepared upload, searchable PDF, and rendered raster are separate derivatives with distinct hashes; they do not replace the original screenshot for Azure or local readers. Provider text, geometry, source hashes, provider-input hashes, model/API versions, request counts, timings, and errors are retained as evidence.

Cloud OCR is not enabled by default. A live multi-provider run requires explicit flags and credentials:

```dotenv
DWBOT_MULTI_PROVIDER_ENABLED=1
OCRSPACE_ENABLED=1
OCRSPACE_NETWORK_ALLOWLIST=1
OCRSPACE_API_KEY=<secret>
AZURE_DOCUMENT_INTELLIGENCE_ENABLED=1
AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST=1
AZURE_DOCUMENT_INTELLIGENCE_TIER=F0
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<exact-resource-endpoint>
AZURE_DOCUMENT_INTELLIGENCE_KEY=<secret>
AZURE_DOCUMENT_INTELLIGENCE_MAX_PER_MONTH=450
OCR_NON_OCR_NETWORK_RESTRICTED=1
OCR_NON_OCR_NETWORK_LOG=testdata/multi-provider-smoke/network-blocked-attempts.log
```

The Azure `F0` setting is an operator attestation, not proof of the remote SKU. The local quota ledger is only a same-filesystem safety mechanism, not an account-wide Azure meter. Never enable paid usage, upgrade a tier, or submit unrelated/private images without separate authorization.

The smoke script installs a Node-process egress guard before loading the bot. It allows only the exact configured Azure resource host and explicitly enabled OCR.Space hosts. This guard does **not** constrain OS-level traffic or arbitrary native/Python child processes; use Windows Firewall or an isolated runner when OS-level egress containment is required.

## Accuracy and review

Provider confidence scores are not comparable across engines. The application fails closed on detected mandatory-field conflicts and routes those fields to manual correction. There is no majority vote and no single-provider override.

For a labelled evaluation, prepare:
- a predictions JSON/JSONL collection with `sourceSha256`, a `record` (or smoke-report `recordReview.fullRecord`), acceptance state, unresolved fields, and optional provider status/counts;
- a ground-truth JSON/JSONL collection with the same `sourceSha256` and all nine independently reviewed field values.

Generate the report with:

```powershell
npm run summarize:multi-provider-accuracy -- --predictions <predictions.json> --ground-truth <ground-truth.json> --output <accuracy-report.json>
```

The report includes per-field exact match, full nine-field exact records, wrong accepted values, unresolved fields, false acceptance/rejection, reader disagreement, provider availability, and request counts. Only source hashes present in both inputs are scored. Do not claim accuracy without complete independent ground truth.

## Useful commands

```powershell
npm ci
npm test
npm run test:multi-provider
npm run test:ocrspace
npm run test:ocr-watchdog
npm run test:desktop
npm run test:persistence-recovery
```

Live provider connectivity is opt-in:

```powershell
npm run smoke:multi-provider
```

Run it only after setting the explicit provider flags, exact resource endpoint, protected credentials, and network restriction log path.

## Current project references

- `DWBOT_BRANCH_CHARTER.md` — active branch authority and implementation direction.
- `docs/architecture/DWBOT_OCR_ACCURACY_ARCHITECTURE_DECISION.md` — current OCR architecture, provenance, quota, and network boundaries.
- `docs/architecture/DWBOT_PROVIDER_REQUEST_ENABLEMENT_RULE_2026-11-06.md` — explicit provider-request rules.
- `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md` — OCR.Space adapter details.
- `docs/PADDLEOCR_LOCAL_RUNTIME.md` — optional local PaddleOCR provisioning.
- `docs/user/DWBOT_USER_MANUAL.md` — Player/Admin user guide.
- `docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.md` — local operations and verification instructions.
- `docs/GRAND-TOURNAMENT-V3.22-DWBOT-ALIGNMENT.md` — policy/source reconciliation and current nine-field application contract.

This branch does not reinstate the former Gate A/B/C/D sequence or an independent holdout corpus as a prerequisite for ordinary implementation. Testing, labelled accuracy measurement, manual review, and honest reporting remain required engineering practices.

## Retained source and provenance

- `docs/source-baselines/` preserves the original v3.22 tournament documentation baseline; it is historical source, not the active OCR or release policy.
- `provenance/` retains the RC3 source archive and its inventory/provenance records.
- `docs/source-inputs/` preserves original OCR implementation notes and Discord-supplied workbook/scoring explanations.
- `dwbotStuff/` retains the 56-image ground-truth review workbook, reviewed/consolidated image inventories, and original tournament instruction DOCX sources. These are reference inputs, not runtime dependencies.
- `docs/REPOSITORY_PRUNING_MANIFEST_2026-11-06.json` records the original blob hashes and reasons for files removed from this branch.
