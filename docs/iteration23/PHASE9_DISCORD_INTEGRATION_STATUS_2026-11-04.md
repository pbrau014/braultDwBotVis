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
- Historical working-copy report: OCR.space client/quota/crop contracts **19/19**, mocked only; the current `dwbotVis` tree does not contain those adapter/quota source files or tests, so this result is not reproducible from the current branch.
- Historical working-copy report: OCR sequence checkpoints **4/4**; the checkpoint module and sequence-runner changes are not present in the current branch tree, so this result is not reproducible from the current branch.
- Historical working-copy report: secret-safe Discord preflight tests **5/5**; no matching standalone test file was found in the current branch tree. Do not count this as current-branch verification.
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


## Focused Gateway preflight verification — 2026-11-04

- New test file: `discord-gateway-diagnostics.test.js`.
- Command executed in an isolated Node.js v22.16.0 runtime: `node --check src/discord-gateway-diagnostics.js`, `node --check discord-gateway-diagnostics.test.js`, and `node --test discord-gateway-diagnostics.test.js`.
- Result: **6 passed / 0 failed / 0 skipped**.
- Scope: pure permission-preflight helper tests only. These do not import discord.js, use credentials, connect to Discord, or validate the modified `src/bot.js` in a complete installed project.
- The full project suite has not been rerun after this change. The previously recorded 214/214 result remains historical baseline evidence, not a current post-change result.


## REST rate-limit observability added — 2026-11-04

The bot now subscribes to discord.js REST `rateLimited` events and records method, normalized route, scope, global flag and retry delay. It intentionally omits full request URLs, tokens, headers and request bodies. The discord.js REST manager remains responsible for dynamic bucket scheduling; no custom retry loop or hard-coded Discord limits were introduced. No live 429 has been observed.


## Current-branch test and setup verification

- The six pure Gateway/channel-preflight tests were run from the exact helper and test source committed to this branch: **6/6 passed** on Node.js v22.16.0.
- The package script name and command were exercised in an isolated temporary npm package with the same script definition; the full project dependency tree was not installed in this environment.
- The committed `.gitignore` behavior was checked with Git: `.env`, `node_modules/`, local SQLite files and `testdata/live-discord-state/` are ignored; `.env.discord-test.example` is not ignored.
- The modified `src/bot.js` has been reviewed at the changed import, client setup, REST rate-limit listener and READY/preflight sections, but a full-project `node --check src/bot.js` and full `npm test` have not been run from a complete local checkout in this environment.


## Fail-closed startup behavior

The channel permission preflight now aborts startup if the configured channel cannot be fetched, is not a sendable guild text channel, or lacks any required permission. It closes tournament storage, destroys the Discord client and sets a non-zero process exit status. This prevents the bot from remaining connected in a degraded state that could generate repeated permission failures. The behavior is code-reviewed but has not yet been exercised in a complete installed application or live Discord test.


## Admin command authorization correction — 2026-11-04

Code review found that the read-only `!yolo settings` command was handled under the plural name but the admin-only allowlist contained only the singular `setting` mutation command. The plural settings command could therefore be reached by an ordinary participant. This is corrected by centralizing the admin-only command policy in `src/tournament-command-policy.js`; both `setting` and `settings` are now restricted. Added pure regression tests for all admin-only and public command families. The live quickstart now explicitly verifies that a participant is denied both `!yolo settings` and `!yolo add-player`.

This is a code-level authorization fix. The new policy unit tests are run separately; the complete synthetic Discord integration suite and live role/permission test still need to be rerun.
