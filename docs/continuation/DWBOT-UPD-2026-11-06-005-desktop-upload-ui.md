# DWBOT desktop upload UI correction — 2026-11-06

Status: IMPLEMENTED ON MAIN; EXACT-HEAD AUTOMATED VERIFICATION PENDING.

## Scope
The desktop screenshot upload page was reviewed while the existing 63-image OCR.Space PDF-first exploratory workflow continued. Changes are limited to browser-facing upload guidance, drop-zone semantics, and contract-test coverage. No OCR source, provider request, tournament data, or production service behavior was changed.

## Corrections
1. Corrected the upload size helper text from 10 MB to 25 MB. The browser upload handler enforces 25 MiB (25 * 1024 * 1024 bytes); the page now consistently states 25 MiB to match the exact binary limit.
2. Replaced stale OCR instructions that described a local Tesseract baseline, safe-crop remote prepass, and local-only opt-out. The page now accurately describes the active PDF-first flow: OCR.Space Engine 2 receives the original screenshot, creates a searchable PDF, and local readers operate only on a validated PDF-derived raster. It states that PDF-stage failure does not fall back to reading the original screenshot, and that provider text cannot independently accept or overwrite mandatory fields.
3. Improved drop-zone semantics. The drop target is now a labelled region with its file constraints associated through aria-describedby. The nested Choose Image button remains the keyboard-accessible file-picker control; the containing region is no longer incorrectly exposed as a second button or given redundant keyboard emulation.
4. Expanded desktop UI contract tests to assert the 25 MiB copy, current Engine 2/PDF-derived-raster guidance, fail-closed behavior, explicit provider activation, and accessible drop-zone semantics.

## Source commits
- `c8e0407ad54e3542098bca26b1ea32b9ea4b1f7a` — exclude desktop-only changes and the desktop UI contract test from the 63-image provider workflow trigger, preventing UI work from causing another billable OCR.Space submission.
- `e9ec1d5858bc448e66c0d626d5a7032c160aff4b` — correct upload size and PDF-first guidance.
- `38c6362599b603295099c081f020937d319e7a1a` — add contract assertions for the upload limit and current OCR pipeline guidance.
- `8340f88de3ab369c153d8e301af756fb3401cd40` — improve drop-zone accessibility semantics and associate constraints.
- `78c2cd9a6afe2a25a785885ecbea411e57a4385f` — remove redundant keyboard emulation from the non-interactive drop region.
- `56a072e480a30df12d911d30bb82fa6761e8bbef` — test accessible drop-zone semantics.

## Verification and remaining UI work
- Source review confirms the upload handler enforces 25 MiB and the revised copy now matches it. The follow-up contract test also checks the actual OCRSPACE_API_KEY environment-variable spelling.
- Exact-head automated verification for commit `56a072e480a30df12d911d30bb82fa6761e8bbef` has not yet completed. The push-triggered verification attempts were cancelled while an earlier verification workflow was still active; do not claim the new UI contract tests passed until an exact-head run reports them.
- Existing Windows desktop/browser visual, OAuth and accessibility QA remains open. This change is not a visual browser or live OAuth acceptance result.
- No live Discord operation or production deployment was performed.

## OCR.Space workflow preservation
The existing imagesF 63 exploratory run `42160979140` remained `in_progress` at the time of this note. Its provider-extraction step was still running and no run artifacts were listed. Desktop-only paths and the desktop UI contract test are now in `paths-ignore` for that provider workflow, preventing these UI commits from launching duplicate OCR.Space submissions. Continue polling the original run; download and verify artifacts only after its upload step completes.


## Follow-up terminology and secret-name contract

The upload limit is stated as 25 MiB to match the exact 25 * 1024 * 1024
byte check. The desktop UI contract's credential exclusion now checks both
OCRSPACE_API_KEY (the actual environment variable spelling) and the legacy
OCR_SPACE_API_KEY spelling. This is a source/test correction; it does not
replace exact-head CI or browser accessibility verification.
