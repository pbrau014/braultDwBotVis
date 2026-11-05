# World of Warships YOLO Tournament Discord Bot (DWBOT)

DWBOT is a local-first Node.js Discord tournament bot, strict screenshot OCR pipeline, and desktop Player/Admin workspace.

## Current verification — 2026-11-05

Repository: https://github.com/pbrau014/braultDwBotVis  
Active delivery/current working branch: `main`.  
Last verified main HEAD before this consolidated documentation/workflow update: `e49b6f64a68212cca84598d541a266cdf1232f1e`. Re-fetch `main` after this commit for the exact new head and its own Actions run; earlier queued runs do not validate later commits.

Run `42088538702` Linux offline job: **PASS** on Node.js 22.16.0. The full project suite reported 269 tests, 267 passed, 0 failed and 2 skipped. OCR.Space mocked contract/prepass tests, reconciliation/report metadata, Discord policy, desktop service/bridge, persistence and recovery steps passed on that run.

Run `42088538702` PDF/manual/clean-package job: **PASS**. The release-package verification reports 534 source files, 534 manifest entries, 536 ZIP entries, verified manifest, clean extraction, `npm ci`, `npm test` and prelive checks passing. Release ZIP SHA-256: `ae7e16dc932f59cdb7c91d0d4ef448551c837426eb08220f5d8390f96c63d7a9`. Workflow artifact digest: `sha256:339a1d2afa776899dd26ef0bf2c8d0b5a337e5d9f8deffb37b7d77083ddcecd6`. The PDF rendered; page-by-page visual inspection remains open.

Run `42088538702` Windows Node.js 22.16.0 job: process-level persistence/recovery and the full Windows test suite **PASS**. The separate current-source Tesseract.js/native-Tesseract screenshot-acceptance step was still **IN PROGRESS** at the latest check. Its artifact-upload step had not run, no Windows screenshot-acceptance report was available, and a live log-download attempt returned GitHub BlobNotFound (404) while the job remained active. Do not claim the Windows screenshot gate passed.

Run `42088032492` had a clean-package failure because `eng.traineddata` was absent. The pinned native Tesseract 5.5.3.20260724/model provisioning correction was verified by the later successful package job on `42088538702`; preserve the earlier failure as history.

Exact-head runs `42091979664` and `42091840336` were queued on earlier main commits at the last check. They are not passes and do not validate this later documentation/workflow update. Re-fetch Actions for the new exact main head.

Production remains **NO-GO** pending current-source Windows screenshot acceptance, Gate A/B, page-by-page PDF inspection, desktop/OAuth/browser/upload, isolated live Discord, recovery/security and remaining release gates.

## Current handoff

The current dated continuation/runbook is `docs/continuation/NEXT_CHAT_HANDOFF_2026-11-05.md`. The canonical living running plan is `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`. Read the living plan first in every next chat. All work remains in this ChatGPT conversation; no interim progress narration is emitted.

## Architecture

- src/bot.js: Discord runtime, command routing, channel preflight and shared OCR entry point.
- src/tournament.js: authoritative 50-player tournament state/scoring, four events and seven games/event, JSON/SQLite persistence.
- src/battle-record.js: strict nine-field validation and exact corrections.
- OCR.Space is the active development workstream until project-wide integration is complete. At runtime, when explicitly enabled, a geometry-only OpenCV prepass runs first and proposes privacy-safe crops; OCR.Space Engine 3 then produces the first remote text evidence using orientation detection, auto-scaling, table mode on the tabular reward/stat band, and a visible searchable-PDF request. Tesseract.js then processes the original screenshot and its existing local crops. Remote/local evidence remains separate; src/ocrspace-reconciliation.js emits exact diagnostic agreement/disagreement/remote-only/conflict states without merging remote candidates into the local record. OCR.Space cannot independently accept or overwrite any field. Remote use remains default-off and requires both OCRSPACE_ENABLED=1 and a locally configured Free key; a key alone never enables it. Player identity, Discord identifiers, credentials, private account data and full screenshots are prohibited. Engine 2 is used only as a PDF-generation fallback if Engine 3 returns no searchable-PDF URL; its OCR text is discarded. See docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md.
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
- docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt: complete current living plan with authoritative chat/GitHub/OCR.Space addendum and preserved historical context.
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
