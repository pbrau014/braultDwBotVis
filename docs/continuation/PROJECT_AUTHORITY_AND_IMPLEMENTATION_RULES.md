# DWBOT project authority and implementation rules

**Canonical GitHub repository:** https://github.com/pbrau014/braultDwBotVis.git  
**Repository:** `pbrau014/braultDwBotVis`  
**Active implementation/delivery branch:** `main`  
**Historical integration snapshot:** `dwbotVis`

The user explicitly authorized synchronizing main to the verified 850-file dwbotVis tree and making main the active implementation branch. Synchronization commit 6270f6e56c9064fb98df9976098ddf77ad74b837 preserves the former main head as its parent and uses the exact dwbotVis tree; no force-push or history rewrite occurred. dwbotVis remains a historical snapshot. Before every remote write, re-read main, use an expected-head lease, then fetch and verify the resulting commit and tree. Do not substitute another repository.

## Persistent implementation rule

Continue authorized project work through implementation, testing, defect correction, retest, packaging and verification. A missing exact filename is not a reason to stop. Search surrounding plan sections, caller/callee code, tests, README/docs, archive inventories, manifests, similar artifacts, and operational records until the best-supported answer or implementation path is established. Preserve provenance, state substitutions, and never claim an uninspected file was reviewed. Complete independent work despite an isolated blocker.

Distinguish facts, assumptions, inferred design, and uncertainty. Never invent a test result, credential, approval, file, permission or live operation. A test is PASS only when its actual acceptance criteria were executed and verified. Clearly label local, simulated, live, blocked and not-run results.

## Source and acceptance rules

- The existing Node.js Discord bot, its persistence, permissions, tournament rules and scoring functions remain authoritative.
- Preserve exactly nine mandatory OCR fields in order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP is mandatory and ninth/final.
- Missing, invalid, ambiguous, conflicting or incorrect mandatory values block acceptance. Do not fuzzy-correct values or modify approved ground truth to create a pass.
- Tesseract.js remains the baseline. OpenCV proposes geometry only. PaddleOCR and OCR.space remain optional evidence sources and may not independently accept fields.
- Preserve original archives and prior test reports. New reports must be tied to the actual source/runtime tested.

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

## Packaging and completion

At meaningful milestones create a complete candidate archive with source, scripts, tests, reports, docs, manifest, SHA-256 sidecar, ZIP integrity and clean-extraction checks. Exclude `.env`, credentials, `node_modules`, active databases, runtime state, caches and private data. Production remains NO-GO until mandatory OCR, Windows/native, live Discord, security, recovery, UI integration, manual, and package gates have verified evidence.


## Current real-environment release gates - 2026-11-04

The following remain OPEN and cannot be represented as passed based on Linux CI or mocks:

1. Current-source complete screenshot OCR acceptance on Windows Node 24.22.1, including native Tesseract 5.x and paired Tesseract.js baseline.
2. Real local Discord OAuth, browser visual QA, Player/Admin authorization checks and synthetic screenshot upload through the running bot.
3. Isolated development-guild Discord smoke: READY, effective channel permissions, command policy, synthetic attachment processing, restart/recovery and natural rate-limit observations.
4. Windows persistence/recovery: separate-process JSON/SQLite reopen, full private archive restore, physical SQLite copy/restore, WAL checkpoint and database integrity.
5. PDF user manual, final package SHA-256, ZIP integrity and clean extraction followed by verification from that extracted copy.

Exact OCR rules remain unchanged: nine mandatory fields in the established order, XP ninth; no fuzzy or expected-value repairs. Release remains NO-GO until all gates have actual evidence.
