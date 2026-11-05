# World of Warships YOLO Tournament Discord Bot (DWBOT)

DWBOT is a local-first Node.js Discord tournament bot, strict screenshot OCR pipeline, and desktop Player/Admin workspace.

## Current verification — 2026-11-05

Repository: https://github.com/pbrau014/braultDwBotVis  
Active delivery branch: main. The only active implementation branch is main.  
Current application-source baseline: 126a8d505bd1319cff770168c21fb57412286bfb; later commits update project authority and cleanup documentation.  
The current implementation head has been updated through the OCR.Space-first sequence and request-profile hardening. Exact-head CI is being run on the latest commit; Linux verification on the preceding code commit passed 267/267 with 2 environment-specific skips, while Windows native OCR and PDF/package gates remain pending. Do not infer a complete workflow pass from the Linux job alone.

Node.js 22.16.0 Linux offline job: PASS.
- OCR.space mocked contract/crop/quota: 15/15 PASS.
- Discord offline preflight/command policy: 21/21 PASS.
- Desktop offline preflight: PASS.
- Desktop service/bridge/UI contract: 28/28 PASS.
- Full npm test: 259 total / 257 passed / 0 failed / 2 skipped. Skips: ImageMagick-dependent red-channel crop and optional OpenCV helper because the Linux runner lacked ImageMagick/Python cv2.

Windows Node.js 22.16.0 job: persistence/recovery PASS; full npm test PASS; current-source Tesseract.js/native Tesseract screenshot-acceptance step was still IN PROGRESS at the last status check. Do not call the overall workflow or screenshot acceptance PASS until that step finishes and its artifact/report is inspected.

PDF/manual/clean-package job: SUCCESS. The release-package-verification.json tied to this commit reports 854 source files, 854 manifest entries, verified manifest, clean extraction, npm ci PASS, npm test PASS and prelive PASS. The generated release ZIP SHA-256 is 87dafabc3e3f7475aa36c195be03b37cc7c58a66f21f837142cea895c7dc6ca7; ZIP CRC and embedded checksum were independently verified. PDF was rendered; page-by-page visual inspection remains distinct.

Production remains NO-GO pending current screenshot OCR acceptance, actual local desktop/OAuth/browser/upload, isolated live Discord smoke and any remaining user-local recovery/security checks.

## Current handoff

The current dated continuation/runbook is docs/continuation/NEXT_CHAT_HANDOFF_2026-11-05.md. The complete living running plan is docs/continuation/DWBOT_LIVING_RUNNING_PLAN_2026-11-05_CURRENT.txt. All work stays in the current ChatGPT conversation; every development step and plan update reconciles the complete current/historical project context. No interim progress text is emitted; provide one consolidated summary after operations and verification.

## Architecture

- src/bot.js: Discord runtime, command routing, channel preflight and shared OCR entry point.
- src/tournament.js: authoritative 50-player tournament state/scoring, four events and seven games/event, JSON/SQLite persistence.
- src/battle-record.js: strict nine-field validation and exact corrections.
- When OCR.Space is explicitly enabled, a geometry-only OpenCV prepass runs first and proposes privacy-safe crops; OCR.Space Engine 3 then produces the first remote text evidence using orientation detection, auto-scaling, table mode on the tabular reward/stat band, and a visible searchable-PDF request. Tesseract.js then processes the original screenshot and its existing local crops. Remote/local evidence remains separate and is compared under the strict nine-field validators; OCR.Space cannot independently accept or overwrite any field. Remote use remains default-off and requires both OCRSPACE_ENABLED=1 and a locally configured Free key. Player identity, Discord identifiers, credentials, private account data and full screenshots are prohibited. Engine 2 is used only as a PDF-generation fallback if Engine 3 returns no searchable-PDF URL; its OCR text is discarded. See docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md.
- src/ocr-sequence-checkpoint.js and scripts/run-ocr-sequence.js persist atomic per-image progress.
- desktop/ contains Player, Admin, Upload and shared style/script assets.
- src/desktop-bridge.js provides authenticated loopback-only Node HTTP/OAuth/CSRF transport.
- src/desktop-service.js reuses existing bot state, scoring and OCR queue.

## Exact OCR contract

Nine mandatory fields in exact order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Missing, invalid, ambiguous or conflicting values remain unresolved. Fuzzy name/numeric repair is prohibited.

Grand Yolo tierWeight remains 0.9. Workbook Totals!H12 remains =0.54*G12/100; known default output $12.49.

License text is preserved at docs/legal/LICENSE after the authorized root-only cleanup.

## Commands

Use Node >=22.16.0. From the project root run:
- npm ci
- npm run test:discord-preflight
- npm run preflight:desktop-test
- npm run test:desktop
- npm run test:ocr
- npm test
- npm run test:prelive

Additional current-source OCR acceptance commands include test:reported-screenshot, test:four-images, test:additional-images, test:tesseractjs and the Windows/Paddle integrated gate. They must be executed on the exact current source/runtime before being claimed as passes.

## Desktop setup

See .env.desktop.example and docs/iteration23/DESKTOP_UI_PRELIVE_QUICKSTART_2026-11-04.md. Add OAuth variables to existing local .env. Register exact Discord OAuth2 redirect:
http://127.0.0.1:8787/auth/discord/callback
Scope identify only. Configure explicit TOURNAMENT_ADMIN_IDS. Keep ENABLE_SLASH_COMMANDS=0. Set ENABLE_DESKTOP_UI=1 only for a local isolated pre-live run. The bridge starts after Discord READY/channel preflight and binds only to 127.0.0.1.

Public channel snapshots omit private Discord account links and per-user pending workflow identifiers. Complete private recovery is available only through authenticated local Admin backup.

## Handoff, archive and plan

- plan1.txt: full append-only roadmap and historical implementation detail.
- DWBOT_PROJECT_COMPLETE_HANDOFF_2026-11-04.txt: end-to-end history and evidence; historical statuses should be read using the current handoff's addendum.
- docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md: authority/security/phase-order rules.
- docs/continuation/NEXT_CHAT_HANDOFF_2026-11-05.md: exact current branch/CI state, stepwise continuation and all active rules.
- docs/continuation/DWBOT_CURRENT_AUTHORITY_2026-11-05.md: canonical repository and active OCR/security rules.
- docs/continuation/DWBOT_LIVING_RUNNING_PLAN_2026-11-05_CURRENT.txt: complete current living plan with authoritative chat/GitHub/OCR.Space addendum and preserved historical context.
- docs/history/GITHUB_TRANSFER_STATUS_2026-11-05_HISTORICAL.md: preserved historical transfer evidence; not an active repository/branch instruction.
- docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md: Discord readiness.
- docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md: isolated live smoke.
- docs/iteration23/DESKTOP_UI_PRELIVE_QUICKSTART_2026-11-04.md: local OAuth/desktop procedure.
- docs/inventory/DWBOT_GIT_TREE_INVENTORY_2026-11-04.json: historical path/Git-object inventory; refresh against current tree before relying on it.

## Source archive/package

Historical DWBOT_COMPLETE_DOWNLOAD_KIT_2026-11-03.zip remains in the user's File Library: 175,126,438 bytes; SHA-256 7f5984ecbcd8009110b98f283e20b7d5fc5b840e2a5c08a5ad4f436959387c25; 472 manifest files / 108,083,848 uncompressed bytes. The ZIP was rehashed and passed unzip integrity. It is not committed as one GitHub blob because it exceeds the 100 MB per-file limit; its checksum sidecar and manifest are preserved in the Library.

The current exact-main CI release artifact is linked from run 41942650363. Its embedded DWBOT-050b3a12aa64.zip has SHA-256 87dafabc3e3f7475aa36c195be03b37cc7c58a66f21f837142cea895c7dc6ca7.

Current branch source ZIP:
https://github.com/pbrau014/braultDwBotVis/archive/refs/heads/main.zip

Production remains NO-GO until all mandatory screenshot OCR, Windows/native, local UI/OAuth/browser, isolated live Discord, security/recovery, manual and final package gates pass with current evidence.
