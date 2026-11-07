# DWBOT multi-provider OCR architecture

**Branch:** `ocr-multiprovider`  
**Status:** Active implementation  
**Branch policy:** Keep all changes on this branch. `main` is unchanged and is not a merge target without separate authorization.

## 1. Runtime pipeline

The target pipeline is an ensemble of remote and local readers, all operating from the same immutable original screenshot:

- **OCR.Space Engine 2** — primary online OCR provider; use the searchable-PDF-first workflow and retain the provider's parsed text, searchable PDF, raster page, upload metadata, hashes, and request diagnostics.
- **Azure AI Document Intelligence Read** — secondary online OCR provider; use `prebuilt-read`, API `2024-11-30`, and retain full text, line and word polygons, confidence values, page count, status, and polling metadata.
- **Tesseract.js** — local JavaScript OCR reader.
- **Native Tesseract** — separate local executable-based reader where installed.
- **PaddleOCR** — independent local OCR reader where its runtime and model assets are installed.
- **OpenCV** — image-quality, region geometry, and crop/transform assistance. It is not an OCR engine.

The online providers are started concurrently for a designated multi-provider run. Tesseract.js, native Tesseract, PaddleOCR, and OpenCV continue as independent local branches. A searchable PDF or raster created by OCR.Space is derivative evidence and must never replace the original screenshot for the other providers.

## 2. Explicit provider activation

A designated online run requires all of these:

```dotenv
DWBOT_MULTI_PROVIDER_ENABLED=1
OCRSPACE_ENABLED=1
OCRSPACE_API_KEY=<secret>
AZURE_DOCUMENT_INTELLIGENCE_ENABLED=1
AZURE_DOCUMENT_INTELLIGENCE_TIER=F0
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<resource-endpoint>
AZURE_DOCUMENT_INTELLIGENCE_KEY=<secret>
AZURE_DOCUMENT_INTELLIGENCE_MAX_PER_MONTH=450
OCRSPACE_NETWORK_ALLOWLIST=1
AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST=1
OCR_NON_OCR_NETWORK_RESTRICTED=1
OCR_NON_OCR_NETWORK_LOG=testdata/multi-provider-smoke/network-blocked-attempts.log
```

The F0 environment value is an operator attestation, not remote proof of the SKU. Confirm the resource is actually F0 in the provider console before enabling it. The current Microsoft limits list 500 free pages per month for F0, a 4 MB maximum document, up to two pages per analysis, and one analyze/get operation per second. The adapter reserves one page per screenshot and caps local reservations at 450/month, leaving a 50-page safety margin. It enforces the F0 request-size ceiling, HTTPS resource endpoints, same-origin operation polling, bounded response reads, at-least-one-second polling intervals, a persisted 1.5-second request-slot scheduler shared by processes using the same ledger filesystem, per-request callbacks immediately before each POST/GET, exact HTTP invocation counts on success and failure, and no automatic retry on rate-limit responses. The ledger is a local coordination and safety buffer, not an account-wide Azure usage meter; other machines and workloads sharing the Azure resource are outside its view. Unsubmitted reservations can be released; submitted or crash-ambiguous reservations remain conservatively charged. A stale lock is recovered only when its owner is verifiably a dead process on the same host. These controls do not guarantee that a misconfigured paid Azure resource cannot incur charges.

Missing credentials or unavailable resources are recorded as blocked; provider failures are recorded as failed. A requested multi-provider run is complete only when both online providers actually return success. There is no silent OCR.Space-only or local-only downgrade when the multi-provider switch is enabled.

## 3. Evidence model

Each provider result preserves or is expected to preserve:

- provider name, model, API/runtime version, and provider-specific engine settings;
- original source SHA-256 and exact provider-input SHA-256 (the OCR.Space prepared upload hash, or the original screenshot hash for Azure);
- any upload, searchable-PDF, raster, crop, or variant hashes;
- input dimensions, MIME type, and byte count;
- raw text and provider-native line/word geometry;
- confidence metadata without pretending confidence scales are comparable across providers;
- request count, quota reservation, start/completion times, elapsed time, HTTP/provider status, and bounded error details;
- crop/variant identity and coordinate transform back to original-image space.

Provider outputs remain separate evidence. Do not discard the provider-native response when creating normalized candidates.

## 4. Reconciliation and record compatibility

The current application record shape is retained for compatibility during this implementation. All nine fields are mandatory: 

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

Reconciliation is fail-closed for detected cross-reader conflicts: a complete local record is not accepted when OCR.Space, Azure, or an independent local reader disagrees with a mandatory local value. This is a conservative conflict barrier, not yet a calibrated field-level ensemble. The current remote parser still extracts candidates from full-screen text; region-specific association and robust coordinate mapping remain implementation work. Do not use raw confidence alone or majority vote. Do not infer missing characters or invent values. Preserve disagreements and unresolved values for review. Remote OCR output is evidence, not ground truth.

This compatibility description is not a release gate or a holdout-corpus prerequisite. Schema changes, if later required, must be explicit and include storage/workbook compatibility handling.

## 5. Local PaddleOCR setup

On Windows, provision the pinned local CPU runtime and PP-OCRv6 models with the repository installer. The live multi-provider workflow runs this installer before the end-to-end smoke test and exports the resulting Python executable, detection/recognition model directories, and model manifest to the child readers. For a local installation, run `scripts/install-paddleocr-windows.ps1` with a runtime directory outside the repository, then set `PADDLEOCR_PYTHON_BIN`, `PADDLEOCR_DET_MODEL_DIR`, `PADDLEOCR_REC_MODEL_DIR`, and `PADDLEOCR_MODEL_MANIFEST` to the generated paths. If the model manifest is missing, PaddleOCR is reported as blocked rather than represented as a participating reader.

## 6. Development workflow

This branch does not use the former Gate A/B/C/D release sequence or independent holdout corpus as prerequisites for implementation. Continue through feature work, provider integration, tests, diagnostics, error handling, performance work, and documentation.

- Offline tests use mocks and do not make network requests.
- Live provider integration tests are explicitly enabled and use configured development inputs. The smoke process loads `.env`, installs the Node egress guard before importing the bot/provider modules, and permits only explicitly enabled OCR.Space hosts plus the exact configured Azure resource host.
- The Node egress guard does not constrain OS-level traffic or arbitrary native/Python child processes. Use a Windows Firewall rule, isolated runner, or equivalent OS/container egress control when a true process-tree/network sandbox is required.
- Tests must distinguish mocked provider success from actual remote participation.
- Keep credentials out of source control, logs, reports, and error messages.
- Do not automatically retry rate limits, bypass provider quotas, or upgrade paid tiers.
- Report technical dependencies directly and continue all unrelated implementation tasks.

## 7. Branch isolation

All work belongs on `ocr-multiprovider`. Do not update `main`, create a merge, or use a main-branch release workflow without separate authorization.
