# World of Warships Discord Bot — DWBOT

This is the primary repository for the World of Warships (WoWS) tournament Discord bot and screenshot OCR pipeline.

## Project

The bot ingests WoWS battle-result screenshots, extracts structured battle evidence, validates it, and supports tournament operations. OCR and event scoring are separate: damage, kills, race/time, and Grand YOLO event rules must remain distinct and explicitly configured.

## Current architecture

- Node.js Discord bot with persistent local tournament state.
- Tesseract.js remains the primary OCR engine.
- OpenCV-assisted field localization is opt-in; it proposes image geometry/crops and is not an authority for recognized values.
- PaddleOCR is an optional locally benchmarked secondary candidate, disabled by default.
- OCR.space is documented as a possible optional crop-evidence provider, but the current `dwbotVis` source tree does not contain its adapter module, orchestration call site, or adapter test file. Do not enable or describe it as integrated until those files are restored and verified.
- Nine required battle fields remain strict and exact. The parser must abstain on conflicts or uncertainty rather than fuzzy-correcting player names, IDs, ships, or numbers.

## Runtime and tests

- Preferred reproducible runtime: Node.js 22.16.0 (`.nvmrc`).
- Install with `npm ci`.
- Run offline tests with `npm test`.
- Run the Discord channel-preflight unit tests with `npm run test:discord-gateway-diagnostics`.
- OCR.space live/dry-run commands are not present in this branch's `package.json`; the provider is not currently integrated here.

The current captured verification status is documented in `GITHUB_TRANSFER_STATUS.md` and `docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md`.

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

The focused check is `npm run test:discord-gateway-diagnostics`. Its six isolated unit tests passed on Node.js v22.16.0; this is not a live Discord test. See the Phase 9 quickstart for the isolated test guild procedure.


The Discord REST manager's `rateLimited` event is logged without credentials or request bodies; discord.js retains responsibility for dynamic REST bucket scheduling and retry timing.
