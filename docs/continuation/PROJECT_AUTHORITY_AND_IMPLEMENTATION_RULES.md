# DWBOT project authority and implementation rules

**Canonical GitHub repository:** https://github.com/pbrau014/braultDwBotVis.git  
**Repository:** `pbrau014/braultDwBotVis`  
**Only authorized delivery branch:** `dwbotVis`  
**Read-only source branch:** `main`

The `dwbotVis` branch was created from verified `main` commit `9981355e6895a6c24c3b59a78be57865fbecafbb` on 2026-11-04. Before every remote change, re-read the `dwbotVis` head and use an expected-head/lease check. Verify each resulting commit/tree. Never commit, push, merge, force-push, or otherwise change `main`, regardless of GitHub's protection metadata. Do not substitute `pop1`, `pbrau014/dwbot`, or another remote.

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
