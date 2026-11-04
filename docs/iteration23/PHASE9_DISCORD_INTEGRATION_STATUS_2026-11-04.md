# Phase 9 Discord integration verification — 2026-11-04

**Canonical repository:** `pbrau014/braultDwBotVis`  
**Branch:** `dwbotVis` only (`main` remains read-only)  
**Runtime:** Node v22.16.0 / npm 10.9.2 / Linux x64  
**Disposition:** Phase 9 partially implemented; production NO-GO.

## Verified locally

- Full `npm test`: **214 passed / 0 failed / 0 skipped** after the preflight and OCR metadata corrections.
- Synthetic Discord system suite: **7/7**. It covers a synthetic command tour, admin-only command checks, one-channel routing, public panel controls, state persistence/recovery, synthetic attachment/OCR paths, and 50-player scoring. It is not a live Discord test.
- SQLite persistence: **5/5**.
- OCR watchdog/process cancellation/damage consensus: **21/21**.
- OCR.space client/quota/crop contracts: **19/19**, mocked only; no external provider call.
- OCR sequence checkpoints: **4/4**.
- Secret-safe Discord preflight tests: **5/5**.
- Native utilities present in this host: Tesseract 5.5.0, ImageMagick 7.1.2, Chromium 144. Node child-process execution and local file writes work.
- Changed JavaScript syntax checks pass.

The preflight checks Discord snowflake syntax, development admin allowlisting, test-scoped JSON/SQLite paths and public read-only DNS/HTTPS reachability. It records credential presence only; it never logs token or ID values.

## Live/Windows blockers

- No local `.env`, Discord bot token, target channel, test guild, test-admin identity or participant identity is configured.
- Discord DNS failed with `EAI_AGAIN`; the public gateway HTTPS probe is unreachable.
- npm registry DNS/HTTPS is unavailable. `discord.js`, `dotenv`, `tesseract.js` and `tesseract.js-core` are absent. The prior offline npm restore failed because `zlibjs@0.3.1` was not cached.
- This is Linux, not Windows; PowerShell is unavailable. Windows dependency, launch, native-Tesseract, Desktop-browser and PaddleOCR PowerShell gates were not run.
- No live gateway login, real Discord command, live role test, Discord attachment receipt, live 429, live bot restart, screenshot OCR acceptance or provider transmission was performed.

## Required next evidence

Create an isolated development bot/guild/channel and keep credentials only in a local `.env` based on `.env.discord-test.example`. Restore the exact dependencies with `npm ci` on a host with registry access. Follow the step-by-step matrix in `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md`. Capture full logs and exit codes, Ready identity, admin/participant allowed/denied outcomes, one synthetic attachment result, exact nine-field report, before/after isolated state and stop/restart logs. Never send credentials or private player data into chat.

Status details and the repeatable Windows procedure are in the local working package at `docs/iteration23/PHASE9_DISCORD_INTEGRATION_TEST_REPORT_2026-11-04.md` and `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md`.

**No live result is claimed.** Production remains NO-GO until the required live Discord, Windows/native, current-source exact OCR, security, recovery and package gates pass.

## Gateway readiness hardening added on 2026-11-04

The authorized `dwbotVis` branch now records discord.js shard lifecycle events (`shardReady`, `shardDisconnect`, `shardReconnecting`, `shardResume`, `shardError`) and client error/warning events. This is observability only; discord.js remains responsible for heartbeats, reconnects and session resume.

After `ClientReady`, startup now fetches the configured target channel and performs a read-only preflight for a sendable guild text channel and the bot's required `ViewChannel`, `SendMessages` (or `SendMessagesInThreads` for a thread), and `AttachFiles` permissions. A failed preflight is logged as a failure and the bot does not print its normal online-success message or register slash commands. The bot identity and READY state are logged separately from channel readiness.

Added pure unit coverage for missing channels, unsupported channels, unresolved permissions, successful permission checks, missing permissions, and undefined permission flags. These tests are isolated from Discord credentials and do not contact Discord.

This implementation does not prove a live login, live permissions, Gateway resume, live REST rate-limit behavior, or Windows execution. Those remain open live-test gates. Message Content remains a privileged intent that must be enabled for the development application in the Developer Portal.
