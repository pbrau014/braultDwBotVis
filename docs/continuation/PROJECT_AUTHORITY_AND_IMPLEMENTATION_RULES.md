# DWBOT project authority and implementation rules

**Canonical GitHub repository:** https://github.com/pbrau014/braultDwBotVis.git  
**Repository:** `pbrau014/braultDwBotVis`  
**Only active implementation/delivery branch:** `main`

The only authorized DWBOT source and destination is pbrau014/braultDwBotVis; main is the sole active implementation/delivery branch and current working branch. Do not use, sync from, or push to any other DWBOT repository or branch. Older repository/branch references in historical records are provenance only and never current instructions. Do not delete other repositories or remote branch refs as part of documentation reconciliation. Before every remote write, re-read main, use an expected-head lease, then fetch and verify the resulting commit and tree. Never force-push or rewrite history.

## Chat-only execution and living-plan authority

All DWBOT research, file review, planning, code changes, GitHub operations, testing, correction, packaging and reporting must remain in the current ChatGPT conversation. Do not hand off to Work mode or another execution environment. Every development step and status update must reference and reconcile with the checked-in canonical living plan at docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt. The File Library contains older duplicate plan snapshots; do not treat them as current until the exact canonical content is synchronized there. Update the plan when decisions, implementation, evidence, risks or blockers change. On every plan update or download/export, reconcile the complete accessible project context, active and historical narratives, recent/current/next steps and outcomes. Preserve dated history and distinguish attempted, implemented, tested, verified and accepted. Do not display progress narration or interim status text; provide one consolidated summary after operations are complete or blocked.

## Persistent implementation rule

Continue authorized project work through implementation, testing, defect correction, retest, packaging and verification. A missing exact filename is not a reason to stop. Search surrounding plan sections, caller/callee code, tests, README/docs, archive inventories, manifests, similar artifacts, and operational records until the best-supported answer or implementation path is established. Preserve provenance, state substitutions, and never claim an uninspected file was reviewed. Complete independent work despite an isolated blocker.

Distinguish facts, assumptions, inferred design, and uncertainty. Never invent a test result, credential, approval, file, permission or live operation. A test is PASS only when its actual acceptance criteria were executed and verified. Clearly label local, simulated, live, blocked and not-run results.

## Source and acceptance rules

- The existing Node.js Discord bot, its persistence, permissions, tournament rules and scoring functions remain authoritative.
- Preserve exactly nine mandatory OCR fields in order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP is mandatory and ninth/final.
- Missing, invalid, ambiguous, conflicting or incorrect mandatory values block acceptance. Do not fuzzy-correct values or modify approved ground truth to create a pass.
- OCR.Space is the highest-priority and first text-extraction stage for every eligible, explicitly authorized original screenshot. The active sequence is original image -> OCR.Space Engine 2 -> searchable PDF -> validated/downloaded PDF -> bounded local PDF-page raster -> Tesseract.js/native Tesseract/optional PaddleOCR/OpenCV local readers -> existing parser/consensus/exact nine-field validators. No local reader may return to the original screenshot after PDF-first processing begins. Engine 2 is the PDF-producing first pass; Engine 3 is not the active PDF-first engine. Preserve provider/local evidence separation; OCR.Space text cannot independently accept or overwrite mandatory fields. Keep credentials local and never commit them.
- Eligible original-image intake requires OCRSPACE_ENABLED=1, OCRSPACE_NETWORK_ALLOWLIST=1 and a valid local Free OCRSPACE_API_KEY. OCRSPACE_ENABLED=0 is reserved for isolated offline mocks that do not submit an original image or for downstream local readers invoked after a successful PDF-first pass has already produced the PDF-derived raster; it is never a local-original-image fallback. The network guard must permit HTTPS to api.ocr.space and ocr.space. OCR_NON_OCR_NETWORK_RESTRICTED=1 restricts unrelated outbound destinations only; it does not block OCR.Space. Use Engine 2 first, one searchable PDF per eligible original image, hidden-but-searchable text layer, bounded download and local rasterization. Preserve PDF/raster artifacts under OCRSPACE_ARTIFACT_DIR for acceptance. Fail closed on any PDF-first failure; no retries, paid usage, key leakage or unauthorized uploads. Only the user's authorized 4-, 16- and 64-image inventories are in scope. Provider text and the PDF text layer remain separate diagnostic evidence; local exact validation and all nine mandatory fields remain authoritative.
- Tesseract.js remains the local baseline and must continue to work when the API is unavailable, unconfigured, rate-limited, or over budget. OpenCV proposes geometry/ROI only. PaddleOCR remains an optional local comparison/fallback engine.
- Record whether API use was configured, attempted, succeeded, failed, or skipped. Mock tests are not live-provider verification; never claim a live request or accuracy benefit without measured evidence.
- Preserve original archives and prior test reports. New reports must be tied to the actual source/runtime tested.

- Continue cross-project review across the shared OCR pipeline, Discord and desktop surfaces, configuration, quota/restart behavior, provenance, reports, diagnostics, scripts, tests, workflows, docs, runbooks and package manifests. Keep all remote evidence separate and diagnostic only. Never promise perfect OCR accuracy; require zero wrongly accepted mandatory values.

## Security and browser-interface boundary

- Never include Discord bot tokens, webhook URLs, OAuth secrets, or other privileged credentials in HTML, JavaScript, example data, logs or downloadable packages.
- The user-supplied Image Text Reader sample includes a hard-coded Discord webhook. Treat it as exposed; never reuse or reproduce it. Its owner should revoke/regenerate it.
- A static `file://` HTML file cannot securely read private bot state, authenticate an arbitrary participant, or post as the bot without a trusted bridge. LocalStorage/JSON files are snapshots, not live data.
- Prefer no-backend local actions where they actually satisfy the requirements. A static workflow may produce image/JSON artifacts for manual attachment to Discord, but this is not automatic delivery or real-time refresh.
- If full shared-state retrieval, direct upload, verified participant identity or privileged Admin actions are mandatory, use a trusted server-side integration in the existing Node.js architecture. Do not expose it publicly until authentication, role enforcement, origin/CSRF, request limits, audit logging and deployment/network exposure are addressed.

## User-supplied HTML design baselines

Use the complete HTML examples supplied in the conversation as the primary design baselines:
1. Image Text Reader: desktop file picker, drag/drop, clipboard image, preview, browser Tesseract OCR, progress, editable text, copy/download/reset and status/error handling. Its webhook posting implementation is prohibited.
2. YOLO Tourney workbook calculator: four scoring events, seven games per player, overview, roster, standings, totals, multipliers/pools, localStorage, JSON backup import/export, responsive layout and print.

The exact `implementation.zip` and specifically named historical HTML files were not located. The available project calculator/image-reader references and workbook are supporting sources; the user-pasted code is not silently attributed to those missing files. Remove demo seed data and destructive/admin-only controls from the Player interface. Create Admin as a copy of the reviewed Player interface and enforce Admin privileges on the trusted side.

## Phase order

Keep all existing implementation phases and their order. Phase 9 is the evidence-led Discord live integration test phase. Phase 10 remains the final Player/Admin HTML interface, bot integration, testing, packaging, distribution and PDF user-manual phase. Do not insert Phase 10 into earlier phases or reorder its prescribed substeps. Record genuine blockers and keep independent work moving.

## Canonical living plan

The current checked-in plan is docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt. Read it first in every next chat. The File Library's prior dated/updated plan copies are historical until synchronized with this exact content; no old copy should be treated as current.

## Packaging and completion

At meaningful milestones create a complete candidate archive with source, scripts, tests, reports, docs, manifest, SHA-256 sidecar, ZIP integrity and clean-extraction checks. Exclude `.env`, credentials, `node_modules`, active databases, runtime state, caches and private data. Production remains NO-GO until mandatory OCR, Windows/native, live Discord, security, recovery, UI integration, manual, and package gates have verified evidence.


## Current real-environment release gates - 2026-11-04

The following remain OPEN and cannot be represented as passed based on Linux CI or mocks:

1. Current-source complete screenshot OCR acceptance on Windows using the governing and acceptable Node.js 22.16.0 baseline, including native Tesseract 5.x and paired Tesseract.js baseline. Node 24+ is not mandatory; run a separate Node 24+ variant only if a concrete test/tool requirement is shown to need it.
2. Real local Discord OAuth, browser visual QA, Player/Admin authorization checks and synthetic screenshot upload through the running bot.
3. Isolated development-guild Discord smoke: READY, effective channel permissions, command policy, synthetic attachment processing, restart/recovery and natural rate-limit observations.
4. Windows persistence/recovery: separate-process JSON/SQLite reopen, full private archive restore, physical SQLite copy/restore, WAL checkpoint and database integrity.
5. PDF user manual, final package SHA-256, ZIP integrity and clean extraction followed by verification from that extracted copy.

Exact OCR rules remain unchanged: nine mandatory fields in the established order, XP ninth; no fuzzy or expected-value repairs. Release remains NO-GO until all gates have actual evidence.
