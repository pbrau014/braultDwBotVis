# World of Warships Discord Bot — DWBOT

This is the primary repository for the World of Warships (WoWS) tournament Discord bot and screenshot OCR pipeline.

## Project

The bot ingests WoWS battle-result screenshots, extracts structured battle evidence, validates it, and supports tournament operations. OCR and event scoring are separate: damage, kills, race/time, and Grand YOLO event rules must remain distinct and explicitly configured.

## Current architecture

- Node.js Discord bot with persistent local tournament state.
- Tesseract.js remains the primary OCR engine.
- OpenCV-assisted field localization is opt-in; it proposes image geometry/crops and is not an authority for recognized values.
- PaddleOCR is an optional locally benchmarked secondary candidate, disabled by default.
- OCR.space is implemented as an optional external crop recognizer. It receives localized crops only; its candidates still pass the existing exact parsers and consensus logic.
- Nine required battle fields remain strict and exact. The parser must abstain on conflicts or uncertainty rather than fuzzy-correcting player names, IDs, ships, or numbers.

## Runtime and tests

- Preferred reproducible runtime: Node.js 22.16.0 (`.nvmrc`).
- Install with `npm ci`.
- Run offline tests with `npm test`.
- Run the explicit provider dry-run with `npm run test:ocrspace-live:dry`.
- Run live OCR.space smoke test with `npm run test:ocrspace-live` after configuring a free API key locally.

The current captured verification status is documented in `GITHUB_TRANSFER_STATUS.md` and `OCRSPACE_LIVE_PROVIDER_GATE_STATUS_2026-11-04.md`.

## Release status

The project is not marked release-ready. The OCR.space adapter contract suite passed 17/17 on Node 22.16.0 and its local crop dry-run passed. The full project test suite last reported 215 passed / 1 failed because the extracted test environment lacked the declared `dotenv` package. A real OCR.space POST was not verified: the current execution environment cannot resolve `api.ocr.space` and no project API key is configured. Windows/native-Tesseract and Discord smoke-test gates also remain separate.

## Sensitive data

Never commit a real Discord bot token, OCR provider key, `.env`, database, local runtime state, or private user data. Use `.env.example` for placeholders and keep real values in a local `.env` file excluded by Git.

## Complete source package

The current full checkpoint contains application source, scripts, tests, documentation, model assets, fixtures, expanded corpus inputs, and provenance records. The repository upload helper is `PUSH_COMPLETE_DWBOT_POP1.ps1`; it pushes only to branch `pop1` of this repository, using Git Credential Manager and a force-with-lease check against the verified initial branch head. It does not modify `main`.


## Current DWBOT project rules and continuation status

- Canonical repository: [pbrau014/braultDwBotVis](https://github.com/pbrau014/braultDwBotVis).
- Authorized delivery branch: `dwbotVis` only. Keep `main` read-only; do not substitute `pop1` or another repository.
- The authoritative continuation rule and security boundaries are in `docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md`; the append-only roadmap is `plan1.txt`.
- Phase 9 offline/simulated suite currently passes 214/214 on Node 22.16.0, but live Discord and Windows gates are not yet verified. See `docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md` and `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md`.
- Phase 10 remains the final phase for Player/Admin HTML interfaces, bot integration, distribution and the one-PDF user manual. The user-pasted Image Text Reader and workbook calculator are the design baselines. The hard-coded webhook in the Image Text Reader example must never be reused.
- Production remains **NO-GO** until all mandatory OCR, Windows/native, live Discord, security, recovery, interface and packaging gates have verified evidence.
