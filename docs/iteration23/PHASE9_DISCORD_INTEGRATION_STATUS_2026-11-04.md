# Phase 9 Discord integration verification — 2026-11-04

**Canonical repository:** `pbrau014/braultDwBotVis`  
**Branch:** `dwbotVis` only (`main` remains read-only)  
**Runtime:** Node v22.16.0 / npm 10.9.2 / Linux x64  
**Disposition:** Phase 9 partially implemented; production NO-GO.

## Historical working-copy verification (not current-branch results)

The following results were recorded in a prior local working copy. They are preserved as provenance only; the corresponding complete workspace is not available in this execution environment, and these results have not been reproduced from the current `dwbotVis` branch.

- Historical full `npm test`: **214 passed / 0 failed / 0 skipped** after the preflight and OCR metadata corrections.
- Historical synthetic Discord system suite: **7/7**. It covers a synthetic command tour, admin-only command checks, one-channel routing, public panel controls, state persistence/recovery, synthetic attachment/OCR paths, and 50-player scoring. It is not a live Discord test.
- Historical SQLite persistence: **5/5**.
- Historical OCR watchdog/process cancellation/damage consensus: **21/21**.
- Historical working-copy report: OCR.space client/quota/crop contracts **19/19**, mocked only; the current `dwbotVis` tree does not contain those adapter/quota source files or tests, so this result is not reproducible from the current branch.
- Historical working-copy report: OCR sequence checkpoints **4/4**; the checkpoint module and sequence-runner changes are not present in the current branch tree, so this result is not reproducible from the current branch.
- Historical working-copy report: secret-safe Discord preflight tests **5/5**; no matching standalone test file was found in the current branch tree. Do not count this as current-branch verification.
- Historical host utilities: Tesseract 5.5.0, ImageMagick 7.1.2 and Chromium 144 were present in that prior host. This is not a current-host verification.
- Historical changed-JavaScript syntax checks passed in that working copy.

The prior working-copy preflight script is not present in the current branch. The replacement offline preflight and its limits are documented below.

## Live/Windows blockers

- No local `.env`, Discord bot token, target channel, test guild, test-admin identity or participant identity is configured.
- In the prior working-copy environment, Discord DNS failed with `EAI_AGAIN`, the public gateway HTTPS probe was unreachable, npm registry DNS/HTTPS was unavailable, and the offline restore failed because `zlibjs@0.3.1` was not cached. These are historical environment observations, not a new live probe in this turn.
- This execution has no configured local `.env` or Discord credentials. Windows dependency, launch, native-Tesseract, Desktop-browser and PaddleOCR PowerShell gates remain unverified here.
- No live gateway login, real Discord command, live role test, Discord attachment receipt, live 429, live bot restart, screenshot OCR acceptance or provider transmission was performed.

## Required next evidence

Create an isolated development bot/guild/channel and keep credentials only in a local `.env` based on `.env.discord-test.example`. Restore the exact dependencies with `npm ci` on a host with registry access. Follow the step-by-step matrix in `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md`. Capture full logs and exit codes, Ready identity, admin/participant allowed/denied outcomes, one synthetic attachment result, exact nine-field report, before/after isolated state and stop/restart logs. Never send credentials or private player data into chat.

The current branch contains `docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md` and this status file. The previously referenced `PHASE9_DISCORD_INTEGRATION_TEST_REPORT_2026-11-04.md` is not present in the current branch and must not be treated as an available artifact.

**No live result is claimed.** Production remains NO-GO until the required live Discord, Windows/native, current-source exact OCR, security, recovery and package gates pass.

## Gateway readiness hardening added on 2026-11-04

The authorized `dwbotVis` branch now records discord.js shard lifecycle events (`shardReady`, `shardDisconnect`, `shardReconnecting`, `shardResume`, `shardError`) and client error/warning events. This is observability only; discord.js remains responsible for heartbeats, reconnects and session resume.

After `ClientReady`, startup now fetches the configured target channel and performs a read-only preflight for a sendable guild text channel and the bot's required `ViewChannel`, `SendMessages` (or `SendMessagesInThreads` for a thread), and `AttachFiles` permissions. A failed preflight aborts startup, closes tournament storage, destroys the Discord client and sets a non-zero exit status; slash commands are not registered. The bot identity and READY state are logged separately from channel readiness.

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

- The seven pure Gateway/channel-preflight tests passed in an isolated Node.js v22.16.0 runtime: **7/7**. The full project checkout was not available for a full test run.
- The package script name and command were exercised in an isolated temporary npm package with the same script definition; the full project dependency tree was not installed in this environment.
- The committed `.gitignore` behavior was checked with Git: `.env`, `node_modules/`, local SQLite files and `testdata/live-discord-state/` are ignored; `.env.discord-test.example` is not ignored.
- The modified `src/bot.js` has been reviewed at the changed import, client setup, REST rate-limit listener and READY/preflight sections, but a full-project `node --check src/bot.js` and full `npm test` have not been run from a complete local checkout in this environment.


## Fail-closed startup behavior

The channel permission preflight now aborts startup if the configured channel cannot be fetched, is not a sendable guild text channel, or lacks any required permission. It closes tournament storage, destroys the Discord client and sets a non-zero process exit status. This prevents the bot from remaining connected in a degraded state that could generate repeated permission failures. The behavior is code-reviewed but has not yet been exercised in a complete installed application or live Discord test.


## Admin command authorization correction — 2026-11-04

Code review found that the read-only `!yolo settings` command was handled under the plural name but the admin-only allowlist contained only the singular `setting` mutation command. The plural settings command could therefore be reached by an ordinary participant. This is corrected by centralizing the admin-only command policy in `src/tournament-command-policy.js`; both `setting` and `settings` are now restricted. Added pure regression tests for all admin-only and public command families. The live quickstart now explicitly verifies that a participant is denied both `!yolo settings` and `!yolo add-player`.

This is a code-level authorization fix. The new policy unit tests are run separately; the complete synthetic Discord integration suite and live role/permission test still need to be rerun.


The synthetic full-system test now also asserts that a non-admin is denied both the read-only `!yolo settings` command and the `!yolo setting` mutation command. These two integration assertions are committed but have not been executed in the current environment because the complete dependency-backed test checkout is unavailable.


## Static HTML webhook exposure remediation — 2026-11-04

A hard-coded Discord webhook URL was detected in `dwbotStuff/scoreReport_dark_clipboard (1).html`. The current branch version removes the credential assignment and the direct HTTP POST function. The OCR page now keeps results local for review, copy and download; manual submission through DWBOT is required. No request was made to the webhook. The URL remains in prior Git history, so the webhook owner must revoke/delete it in Discord; a source edit alone does not revoke a webhook. History rewriting was not performed, preserving repository history and avoiding a force-push.


## Combined focused Discord test run — 2026-11-04

- Command: `npm run test:discord-preflight` (executed in an isolated temporary package using the committed script definition).
- Result: **10 passed / 0 failed / 0 skipped**.
- Breakdown: six channel/permission preflight cases and four admin-command policy cases.
- The run uses no Discord token, makes no network request, and does not import the full bot. It does not replace the unrun `full-system.test.js` integration suite or a live Discord role test.


## Permission preflight API correction

The preflight now resolves the bot's cached `GuildMember` from `targetChannel.guild.members.me` before calling discord.js `GuildChannel.permissionsFor`. The discord.js 14.27 API documents that method as accepting a `GuildMember` or `Role`, not a generic client user. The helper now fails closed if the bot guild member cannot be resolved, and a regression test covers that case. This avoids relying on an ambiguous User-to-member cache resolution.


## Updated focused Discord test run — 2026-11-04

After correcting the permission helper to require the cached bot `GuildMember`, the combined isolated suite was rerun: **11 passed / 0 failed / 0 skipped**. The seven channel-preflight cases include a null/unresolved bot-member test; the four command-policy cases cover restricted and public commands. This is still a focused offline test run, not the full synthetic bot suite or a live Discord test.


## Offline local configuration preflight added

Added `src/discord-test-preflight.js`, `scripts/preflight-discord-test.js`, and ten unit tests. The pure validator checks Node version, development/test environment, token presence without returning or printing its value, channel/admin snowflake syntax, JSON storage, test-directory containment for JSON/SQLite state paths, distinct state paths, and disabled slash/experimental provider flags. The script loads the local `.env` and reports only pass/fail names and credential presence. It makes no network requests and explicitly does not claim to validate the token, Developer Portal intent settings, or live Discord permissions.

The current repository did not contain the previously described standalone preflight script or the referenced `PHASE9_DISCORD_INTEGRATION_TEST_REPORT_2026-11-04.md`; those prior references were historical working-copy notes and are not current-branch artifacts. The new offline preflight replaces only the local configuration-validation portion. DNS/HTTPS and actual Discord checks remain separate and are not run by this script.


## Combined 21-test offline preflight suite

After adding the local configuration validator, the combined `npm run test:discord-preflight` command was executed in an isolated Node.js v22.16.0 environment using the committed script definition and corresponding pure helper/test logic. Result: **21 passed / 0 failed / 0 skipped**: seven channel-permission tests, four command-policy tests, and ten local-configuration tests. No Discord credentials or network calls were used. The script wrapper itself and the full application dependencies have not been exercised in the complete project checkout.


## Default-branch webhook exposure remains outstanding

The sanitized HTML reader is committed on dwbotVis, but a read-only check confirmed that the current main branch still contains the exposed webhook in its current HTML file. The owner must revoke/delete it in Discord immediately. No main-branch modification or history rewrite was performed.


## Verified GitHub Actions run — 2026-11-04 (current branch)

The new `.github/workflows/dwbot-verification.yml` workflow ran against commit `572f95b27cfa0b769f56cecd0cc82ff59ab6ce52` on Node.js 22.16.0. Run: https://github.com/pbrau014/braultDwBotVis/actions/runs/41800956774

- `npm ci --no-audit --no-fund`: PASS (39 packages installed).
- Syntax checks for `src/bot.js`, the three OCR.space modules, and `src/discord-test-preflight.js`: PASS.
- `npm run test:ocrspace`: **15/15 PASS**. Mocked provider/crop/quota tests only; no OCR.space network request or image transmission.
- `npm run test:discord-preflight`: **21/21 PASS**. Offline unit tests only; no Discord login or message.
- `npm test`: **36 PASS / 29 FAIL / 65 total**. Failures are real repository completeness/path defects, not dependency-install failures. The test files are currently flattened into the repository root although many use `../src` and `../scripts` imports; the expected `tests/` directory is absent. Multiple referenced source modules and test fixtures are also absent from the current branch, including `src/battle-record.js`, `src/damage-consensus.js`, `src/image-processor.js`, `src/number-parser.js`, `src/ocr-worker.js`, `src/ocr-process-supervisor.js`, `src/ocr-report-metadata.js`, `src/ocr-watchdog.js`, `src/opencv-field-isolation.js`, `src/paddleocr-field-fallback.js`, `src/reward-geometry.js`, `src/ribbon-parser.js`, `src/serial-task-queue.js`, `src/acceptance-checks.js`, and several testdata JSON fixtures. The helper `scripts/preflight-discord-test.js` is also auto-discovered as a test by `node --test` due its filename. Do not weaken or delete these tests to manufacture a green run; recover the missing original modules/fixtures and correct the intended test layout first.

This CI result supersedes any older claim that the current branch has no OCR.space source. The current branch contains `src/ocrspace-client.js`, `src/ocrspace-quota-ledger.js`, `src/ocrspace-field-evidence.js`, bot wiring, `ocrspace.test.js`, and `test:ocrspace`. The integration is optional and disabled unless explicitly enabled with a server-side key. No real OCR.space request has been made.

Workbook correction: a prior conversational assessment incorrectly claimed the current scoring baseline used Grand Yolo `tierWeight=1` and H12 $12.56. The current source-of-truth audit/test instead specifies `tierWeight=0.9` and H12 $12.49. That earlier claim was wrong; no scoring code or workbook formula should be changed on its basis. Preserve the existing 0.9/$12.49 contract unless a newer verified workbook artifact proves otherwise.

Production remains NO-GO.
