# World of Warships YOLO Tournament Discord Bot (DWBOT)

DWBOT is a local-first Node.js Discord tournament bot, strict screenshot OCR pipeline, and desktop Player/Admin workspace.

## Current verification

Repository: https://github.com/pbrau014/braultDwBotVis  
Delivery branch: dwbotVis only; main is read-only.  
Implementation checkpoint before the current docs package: 8494c05687494b5afd8cb18aeab96faceeb56620.  
CI: https://github.com/pbrau014/braultDwBotVis/actions/runs/41813315107

Node.js 22.16.0 Linux CI:
- clean npm ci and syntax: PASS.
- OCR.space mocked contract/crop/quota: 15/15 PASS.
- Discord offline preflight/command policy: 21/21 PASS.
- desktop bridge/service/UI contract: 28/28 PASS.
- full npm test: 254 total / 253 passed / 0 failed / 1 skipped.
- sole skip: optional local OpenCV helper because cv2 is not installed in the Linux runner.

This is offline CI evidence only, not live Discord, Windows/native Tesseract, current screenshot accuracy or browser visual acceptance.

## Architecture

- src/bot.js: Discord runtime, command routing, channel preflight and shared OCR entry point.
- src/tournament.js: authoritative 50-player tournament state/scoring, four events and seven games/event, JSON/SQLite persistence.
- src/battle-record.js: strict nine-field validation and exact corrections.
- Tesseract.js remains baseline. OpenCV geometry only. PaddleOCR/OCR.space optional secondary evidence, disabled by default.
- src/ocr-sequence-checkpoint.js and scripts/run-ocr-sequence.js persist atomic per-image progress.
- desktop/ contains Player, Admin, Upload and shared style/script assets.
- src/desktop-bridge.js provides authenticated loopback-only Node HTTP/OAuth/CSRF transport.
- src/desktop-service.js reuses existing bot state, scoring and OCR queue.

## Exact OCR contract

Nine mandatory fields in exact order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Missing, invalid or ambiguous values remain unresolved. Fuzzy name/numeric repair is prohibited.

Grand Yolo tierWeight remains 0.9. Workbook Totals!H12 remains =0.54*G12/100; known default output $12.49.

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

## Handoff and inventory

- plan1.txt: full append-only roadmap and historical implementation detail.
- DWBOT_PROJECT_COMPLETE_HANDOFF_2026-11-04.txt: end-to-end instructions, history, evidence and release gates.
- docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md: authority/security/phase-order rules.
- GITHUB_TRANSFER_STATUS.md: transfer and provenance.
- docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md: Discord readiness.
- docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md: isolated live smoke.
- docs/iteration23/DESKTOP_UI_PRELIVE_QUICKSTART_2026-11-04.md: local OAuth/desktop procedure.
- docs/inventory/DWBOT_GIT_TREE_INVENTORY_2026-11-04.json: exact Git tree path/SHA/size inventory.
- reports/ci/2026-11-04-41813315107-node22-linux-full-log.txt: decoded full CI job log.

## Source archive/package

Historical DWBOT_COMPLETE_DOWNLOAD_KIT_2026-11-03.zip remains in the user's File Library: 175,126,438 bytes; SHA-256 7f5984ecbcd8009110b98f283e20b7d5fc5b840e2a5c08a5ad4f436959387c25; 472 manifest files / 108,083,848 uncompressed bytes. The ZIP was rehashed and passed unzip integrity. It is not committed as one GitHub blob because it exceeds the 100 MB per-file limit; the checksum sidecar and manifest are preserved in the repository.

Current branch source ZIP:
https://github.com/pbrau014/braultDwBotVis/archive/refs/heads/dwbotVis.zip

Production remains NO-GO until current-source OCR acceptance, Windows/native OCR, local UI/OAuth/browser upload, isolated live Discord, security/recovery, PDF manual and final clean extraction pass.


## Final handoff package verification

Final package commit: f6b60d45f647d09b60355c6460bb0554d20939ed. Exact-commit CI succeeded: https://github.com/pbrau014/braultDwBotVis/actions/runs/41814316145. Full CI log is committed at reports/ci/2026-11-04-41814316145-final-branch-log.txt. Complete plan-to-release handoff is DWBOT_PROJECT_COMPLETE_HANDOFF_2026-11-04.txt. Production remains NO-GO pending the Windows/native, current OCR acceptance, actual local browser/OAuth, live Discord and final user-manual/package gates.
