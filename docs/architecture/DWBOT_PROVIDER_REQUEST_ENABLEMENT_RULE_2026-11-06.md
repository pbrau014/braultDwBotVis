# DWBOT provider-request enablement rule

**Status:** Governing implementation rule for the isolated `ocr-multiprovider` branch.
**Authority:** User instruction dated 2026-11-06.

## Rule

Provider requests are an intended, enabled part of the DWBOT multi-provider OCR pipeline. Do not impose a local-only mode, blanket-disable online providers, or silently force provider request flags off in the actual multi-provider pipeline.

For an explicitly designated multi-provider run, the orchestrator must attempt the configured OCR.Space primary request and configured secondary free-tier provider request, concurrently with the available local Tesseract.js, native Tesseract, PaddleOCR and OpenCV branches, subject to provider-specific quotas, credentials, rate limits, file limits, endpoint allowlists and privacy controls.

Enablement must be visible and auditable:
- The run configuration must explicitly identify the providers requested for that run and record the effective enablement state.
- Missing credentials, unavailable free-tier resources, exhausted quotas, provider limits, policy denials and network failures must be recorded as provider-not-run or provider-failed states; they must not be represented as successful participation.
- Do not silently downgrade a requested multi-provider run to local-only or OCR.Space-only. Report the missing provider and mark the run incomplete.
- Do not bypass quotas, retry rate-limited requests automatically, upgrade to a paid tier, or incur charges without a separately approved cost policy.
- Do not log credentials. Preserve source hashes, upload hashes, request metadata, provider/model versions, response evidence, timing, errors and quota reservations.
- Keep provider calls out of offline unit tests, diagnostic replay tools and sealed holdout preparation. Actual network integration tests must be explicitly labeled and use approved development inputs.
- A provider result is evidence, not ground truth. All nine mandatory fields remain subject to the same field-specific reconciliation and fail-closed acceptance policy.

## Required effective behavior

- OCR.Space is the primary online provider and is requested for every eligible, explicitly designated multi-provider OCR run.
- The selected secondary free online provider is requested for the same eligible source input in the same run, subject to its verified free-tier eligibility and configured limits.
- Tesseract.js, native Tesseract and PaddleOCR run as configured local reader branches; OpenCV supplies geometry and controlled image preparation.
- The orchestrator records whether each branch was requested, enabled, started, completed, failed, skipped or blocked, with a reason.
- A run is not a complete multi-provider run unless all required configured provider branches actually participated. Provider outages produce an incomplete/degraded result, never a false full-pass label.

## Scope and safety boundary

This rule does not authorize sending arbitrary or unrelated private screenshots to providers, bypassing privacy review, or spending money. Provider requests are enabled in the designated DWBOT pipeline only for approved DWBOT development/operational inputs and within verified free-tier limits. Any paid usage, tier upgrade, overage, or expansion to unrelated/private data requires separate authorization.

Offline diagnostic/replay tools and unit tests must not initiate provider requests. The actual multi-provider orchestrator sends online requests only when its explicit multi-provider and provider-specific enablement settings are active.

## Branch isolation

Implement and verify this rule only on `ocr-multiprovider`. Do not modify `main` or merge this branch without separate authorization.

## Acceptance

Provider-request enablement is a configuration and orchestration requirement, not proof of provider accuracy. This branch does not impose the former Gate A/Gate B sequence or an independent holdout corpus as a prerequisite for ordinary implementation or deployment preparation. Accuracy evaluation remains an engineering capability: when labelled data is available, report per-field exact match, full nine-field record exact match, wrong accepted values, unresolved values, disagreements, provenance, runtime, provider availability, and request/quota usage. Never claim measured accuracy without independent ground truth, and never treat provider participation as proof of correctness.

