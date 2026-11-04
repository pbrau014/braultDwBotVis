# World of Warships Discord Bot — DWBOT

This is the primary repository for the World of Warships (WoWS) tournament Discord bot and screenshot OCR pipeline.

## Project

The bot ingests WoWS battle-result screenshots, extracts structured battle evidence, validates it, and supports tournament operations. OCR and event scoring are separate: damage, kills, race/time, and Grand YOLO event rules must remain distinct and explicitly configured.

## Current architecture

- Node.js Discord bot with persistent local tournament state.
- Tesseract.js remains the primary OCR engine.
- OpenCV-assisted field localization is opt-in; it proposes image geometry/crops and is not an authority for recognized values.
- PaddleOCR is an optional locally benchmarked secondary candidate, disabled by default.
- OCR.space is implemented as an optional localized-crop evidence stage (`src/ocrspace-client.js`, `src/ocrspace-quota-ledger.js`, `src/ocrspace-field-evidence.js`) and is wired into the bot. It remains disabled by default; evidence is kept separate from exact-value candidates and cannot accept or rewrite mandatory fields. Current CI: 15/15 mocked OCR.space contract/quota tests pass; no real provider request or image transmission has been made.
- Nine required battle fields remain strict and exact. The parser must abstain on conflicts or uncertainty rather than fuzzy-correcting player names, IDs, ships, or numbers.

## Runtime and tests

- Preferred reproducible runtime: Node.js 22.16.0 (`.nvmrc`).
- Install with `npm ci`.
- Run offline tests with `npm test`.
- Run the combined Discord channel-preflight and command-policy unit tests with `npm run test:discord-preflight`.
- Run `npm run test:ocrspace` for the offline mocked provider/crop/quota contract tests. The optional provider remains disabled by default; no live OCR.space POST has been performed.

The current captured verification status is documented in `GITHUB_TRANSFER_STATUS.md`, `docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md`, and `docs/continuation/NEXT_CHAT_HANDOFF_2026-11-04.md`. The 2026-11-04 GitHub Actions run passed clean install, syntax, OCR.space (15/15) and Discord preflight (21/21), but the full suite failed 29/65 due missing source modules/fixtures and incorrect test placement. Production remains NO-GO.

## Release status

The project is not marked release-ready. The latest Phase 9 report records a historical offline full-suite result of 214 passed / 0 failed on Node 22.16.0; it has not been rerun after the latest Gateway preflight changes. The six new channel-preflight unit tests passed separately on Node 22.16.0. No live Discord login, real permission check, Windows/native-Tesseract test, or OCR.space request has been performed.

## Sensitive data

Never commit a real Discord bot token, OCR provider key, `.env`, database, local runtime state, or private user data. Use `.env.discord-test.example` for safe test placeholders and keep real values in a local `.env` file excluded by Git.

## Complete source package

The current branch contains application source, scripts, tests, documentation, model assets, fixtures, expanded corpus inputs, and provenance records. Exact byte-for-byte equivalence with every historical working-copy package has not been established; consult `GITHUB_TRANSFER_STATUS.md` before treating a package as a complete transfer. The only authorized delivery branch is `dwbotVis`. Historical scripts targeting `pop1` are not authorized for current use. `main` is read-only.


## Current DWBOT project rules and continuation status

- Canonical repository: [pbrau014/braultDwBotVis](https://github.com/pbrau014/braultDwBotVis).
- Authorized delivery branch: `dwbotVis` only. Keep `main` read-only; do not substitute `pop1` or another repository.
- The authoritative continuation rule and security boundaries are in `docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md`; the append-only roadmap is `plan1.txt`.
- Phase 9 offline/simulated suite currently passes 214/214 on Node 22.16.0, but live Discord and Windows gates are not yet verified. See `docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md` and `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md`.
- Phase 10 remains the final phase for Player/Admin HTML interfaces, bot integration, distribution and the one-PDF user manual. The user-pasted Image Text Reader and workbook calculator are the design baselines. The hard-coded webhook in the Image Text Reader example must never be reused.
- Production remains **NO-GO** until all mandatory OCR, Windows/native, live Discord, security, recovery, interface and packaging gates have verified evidence.


## Discord readiness hardening

The bot now records discord.js shard READY/disconnect/reconnect/resume/error events and validates the configured guild text channel after the client reaches ClientReady. The read-only preflight checks View Channel, Send Messages (or Send Messages in Threads for a thread), and Attach Files before reporting the bot as fully online. discord.js remains responsible for Gateway heartbeat and session recovery.

The focused check is `npm run test:discord-preflight`. Its six isolated unit tests passed on Node.js v22.16.0; this is not a live Discord test. See the Phase 9 quickstart for the isolated test guild procedure.


The Discord REST manager's `rateLimited` event is logged without credentials or request bodies; discord.js retains responsibility for dynamic REST bucket scheduling and retry timing.


## Credential exposure remediation

A hard-coded Discord webhook was found in the historical Image Text Reader HTML sample at `dwbotStuff/scoreReport_dark_clipboard (1).html`. The current branch version has had the webhook URL and direct-posting implementation removed; OCR text now remains in the browser for review, copy or download and manual submission. Because the old URL was committed previously, editing the current file does not revoke it or erase it from Git history. The webhook owner must revoke/delete that webhook in Discord and create a new one only if separately needed. Never reuse the exposed URL.


**Important:** the sanitized OCR reader is committed on `dwbotVis`, but the current read-only `main` copy still contains the exposed webhook. The owner must revoke/delete that webhook in Discord immediately; removing it from a non-default branch does not invalidate it.


The isolated live-test configuration can be checked without contacting Discord using `npm run preflight:discord-test`. This validates local settings only; it cannot validate the token, Developer Portal intent toggles or live channel permissions.
