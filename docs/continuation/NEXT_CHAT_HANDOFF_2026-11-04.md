# DWBOT — Next-chat continuation handoff

**Snapshot date:** 2026-11-04  
**Project:** World of Warships YOLO Tournament Discord bot (DWBOT), OCR pipeline, and newly authorized Player/Admin desktop HTML interface.  
**Canonical repository:** https://github.com/pbrau014/braultDwBotVis.git  
**Authorized branch:** `dwbotVis` only.  
**Read-only branch:** `main`.

## 1. Exact GitHub state and how to resume

- Repository: `pbrau014/braultDwBotVis`.
- Current working/delivery branch at report creation: `dwbotVis`.
- Head immediately before this handoff commit: `572f95b27cfa0b769f56cecd0cc82ff59ab6ce52`.
- Current main SHA, checked read-only: `9981355e6895a6c24c3b59a78be57865fbecafbb`.
- Main must remain untouched. No merge, force-push, history rewrite, or default-branch edit is authorized.
- GitHub connector is working for repository metadata/tree/file fetches and branch-scoped blob/tree/commit/ref updates. Do not expose or request tokens/PATs in chat. No GitHub credential value is stored in this handoff.
- Before each write: fetch `dwbotVis` head, compare expected SHA, create a tree from the current tree, create a commit with the current head as parent, update only `dwbotVis` with expected-head protection, then fetch the branch and verify exact resulting SHA/tree. Stop and reconcile if the head moved.
- Recent commit history before this report: `9c8b7050a1907ab98bf7c5738581238972f4c999` added OCR.space; `572f95b27cfa0b769f56cecd0cc82ff59ab6ce52` added CI workflow. Earlier plan/status commits are in GitHub history.
- Branch: https://github.com/pbrau014/braultDwBotVis/tree/dwbotVis
- Latest prior commit: https://github.com/pbrau014/braultDwBotVis/commit/572f95b27cfa0b769f56cecd0cc82ff59ab6ce52
- Main: https://github.com/pbrau014/braultDwBotVis/tree/main

### CI workflow and actual run

- Workflow file: `.github/workflows/dwbot-verification.yml`.
- Workflow uses Node.js 22.16.0 and immutable action SHAs; no secrets required.
- Run: https://github.com/pbrau014/braultDwBotVis/actions/runs/41800956774
- Job log: https://github.com/pbrau014/braultDwBotVis/actions/runs/41800956774/job/126476288243
- Result: **workflow failed at full npm test**, but earlier gates passed.
  - `npm ci --no-audit --no-fund`: PASS (39 packages installed).
  - `node --check src/bot.js` and OCR.space/Discord modules: PASS.
  - `npm run test:ocrspace`: **15/15 PASS** (mocked; no real API call).
  - `npm run test:discord-preflight`: **21/21 PASS** (offline; no Discord login).
  - `npm test`: **36 passed / 29 failed / 65 total**.
- Full-suite failures are genuine. The branch has 32 test files at repository root and no `tests/` directory. Many tests import `../src` or `../scripts`, indicating the original intended location is likely `tests/`. Several referenced modules and fixtures are absent from the current branch. Examples: `src/battle-record.js`, `src/damage-consensus.js`, `src/image-processor.js`, `src/number-parser.js`, `src/ocr-worker.js`, `src/ocr-process-supervisor.js`, `src/ocr-report-metadata.js`, `src/ocr-watchdog.js`, `src/opencv-field-isolation.js`, `src/paddleocr-field-fallback.js`, `src/reward-geometry.js`, `src/ribbon-parser.js`, `src/serial-task-queue.js`, `src/acceptance-checks.js`. Fixtures such as `testdata/additional-screenshot-ground-truth.json` and `testdata/reference-corpus.json` are missing. The helper `scripts/preflight-discord-test.js` is auto-discovered as a test by `node --test` due its filename. Do not remove tests, weaken them, or invent substitute modules/ground truth to get green. Recover original files first.

## 2. Project work already present in the branch

### Discord runtime / permissions

- `src/discord-gateway-diagnostics.js`: validates configured target channel and effective bot permissions; requires ViewChannel, SendMessages (or SendMessagesInThreads for a thread), AttachFiles; fails closed for unresolved channel/member/permissions.
- `src/bot.js`: logs Gateway READY/shard lifecycle and REST rate-limit events; discord.js owns heartbeat/reconnect/resume; no custom competing Gateway loop.
- READY startup preflight fetches configured target channel, resolves `targetChannel.guild.members.me`, checks permissions, and aborts/cleans up on failure.
- Message Content intent is required in Developer Portal for prefix commands and message attachment/content visibility. No GuildMembers or Presence intents are requested.
- `src/tournament-command-policy.js`: both `setting` and `settings` are admin-only; integration assertions added.
- `src/discord-test-preflight.js` and `scripts/preflight-discord-test.js`: offline config validation. Does not validate token validity, Developer Portal settings or live permissions.
- `.env.discord-test.example` is placeholders only. Never paste secrets into chat or commit `.env`.
- Quickstart: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md

### OCR.space implementation — corrected status

The current `dwbotVis` branch **does contain** OCR.space integration. Earlier documentation saying it was absent is stale and was corrected in this handoff update.

- `src/ocrspace-client.js`: HTTPS multipart client, API-key header, Engines 2/3, bounded image size/MIME, timeout and response/error classification, 429 classification without automatic retry.
- `src/ocrspace-quota-ledger.js`: atomic JSON ledger, exclusive cross-process lock, stale-lock handling, fail-closed corrupt-state handling; conservative daily/monthly/Engine 3 caps below provider ceilings.
- `src/ocrspace-field-evidence.js`: bounded sequential localized crops, opt-in only, quota reservation before request; OCR.space text/overlay remains separate evidence and cannot enter accepted Tesseract/Paddle candidate arrays or rewrite exact values.
- Bot integration is in `src/bot.js`; `ocrspace.test.js` and `npm run test:ocrspace` exist.
- Provider is disabled by default; no API key or live provider request was used. No screenshot/crop has been transmitted.
- Current CI contract/quota suite: 15/15 PASS. Historical working-copy report had 19/19 client/crop/quota tests and 4/4 checkpoint tests, but those are historical and distinct from current CI.
- Keep the service disabled until a key is configured locally and explicit permission to transmit screenshot crops is in place. Never log the key.

### Important scoring correction

A previous conversational analysis incorrectly claimed the current workbook/HTML uses Grand Yolo `tierWeight=1` and H12 $12.56. That was a mistaken reading. The current full-system source audit and expected HTML formula contract assert `tierWeight=0.9` and H12 **$12.49**. No scoring changes were made on the basis of the erroneous statement. Preserve the 0.9/$12.49 baseline unless a newer verified workbook source proves a change is required.

## 3. Historical source and artifact recovery — do this before rework

The Library contains historical reports/manifests:

- `OCR_RUNTIME_IMPLEMENTATION_UPDATE_2026-11-04.md`: detailed OCR.space, atomic sequence checkpoint, test and provenance report.
- `DWBOT_NODE22PLUS_CHECKPOINT_003_MANIFEST.json`: manifest for the historical source package.
- `DWBOT_COMPLETE_DOWNLOAD_KIT_2026-11-03.zip`: historical archive reported as SHA-256 `7f5984ecbcd8009110b98f283e20b7d5fc5b840e2a5c08a5ad4f436959387c25`; 472 files / 108,083,848 bytes verified 472/472 by size and SHA-256 in the historical report.
- `DWBOT_OCRSPACE_PROGRESS_CHECKPOINT_2026-11-04.zip` checksum sidecar is in Library: SHA-256 `7edb635b1e84bbf68a0d20936952ce70be63336cbcce49180fe9d3c24db359ed`. The exact ZIP itself was not returned by the exact Library search; look for it in user's local Downloads/OneDrive/project folders or other accessible Library sources before rebuilding.
- Historical OCR-space runtime report is stored in Library as `OCR_RUNTIME_IMPLEMENTATION_UPDATE_2026-11-04.md`; use it as provenance, not proof of current branch tests.

Required recovery procedure:
1. Search Library and local project/Downloads/OneDrive for the exact complete ZIP and progress checkpoint ZIP. Do not ask user to re-upload until these avenues are exhausted.
2. Verify ZIP integrity and SHA-256 against the reported values; inspect embedded manifest; compare file paths, sizes and hashes to current branch.
3. Inventory ZIP members and inspect nested archives/source/test/config/docs; record what was inspected and what remains uninspected.
4. Restore missing source modules, fixtures and test layout from the verified archive. Preserve current newer changes in Discord/OCR.space; reconcile conflicts explicitly. Do not replace newer files with older archive versions without review.
5. Only after restoration, fix npm script paths and test discovery. Run CI again and fix real failures.

## 4. New major workstream: Player/Admin desktop HTML interface

User explicitly authorized a major addition: develop the desktop user interface alongside remaining DWBOT work, preview it during development, and aim to have it ready before live Discord testing so all functions can be tested together.

### User-provided design baselines

- Main desktop interface HTML (Library share): https://chatgpt.com/library/share/libfile_9c3fb4096ea48191a22dc83a34181b2e?account_id=personal
- Companion image upload HTML (Library share): https://chatgpt.com/library/share/libfile_d9655d5dc8d708191ab23b01184d970ab?account_id=personal
- Existing repo HTML references include `dwbotStuff/backupWkbkBrowser.html`, `dwbotStuff/scoreReport_dark_clipboard (1).html`, `dwbotStuff/yolo_tourney_complete_instruction_set.html`, `dwbotStuff/yolo_tournament_scoreCalculator.html`, and other `dwbotStuff/*.html` files. Inspect current branch copies before deriving new pages.
- Inspect the complete user-linked files first; preserve their design/behavior and source provenance. Do not silently replace them with a guessed mockup.

### Intended UI scope

- Player interface: desktop-first UI for tournament participant workflows, player status, event/game entry as permitted, score/standings/totals, screenshot upload, OCR result/review/correction, progress/errors, and state refresh.
- Admin interface: derived from reviewed Player interface, with admin-only settings, roster/configuration, corrections/approvals, exports/backups and operational controls. Enforce permissions in trusted Node service, not by hiding buttons only.
- Companion upload page: image file picker, drag/drop, preview, file validation, progress, upload status, and response/result display. No webhook posting.
- Provide local preview/build instructions and screenshots or visual QA artifacts. Keep interfaces accessible, responsive and safe for local Windows desktop use.
- Build a local Node.js bridge/server using the existing bot/service layer. The browser must not contain bot token, webhook, OCR key or other privileged secret.
- A static HTML page cannot securely authenticate a Discord user, read private bot state, or inject a slash-command interaction into Discord. Discord slash commands are application commands registered with Discord and invoked by a Discord client. The desktop UI should call authenticated local service methods through the Node bridge; those methods can reuse the same command/service logic and send permitted bot messages/attachments to the configured channel. For actual slash-command UI, use Discord's native command picker/client. Do not fake an Interaction payload or claim a browser button sent a slash command.
- Add session/authentication, loopback binding, CSRF/origin validation, request-size/type limits, audit logs, role checks, and safe shutdown. Bind only to localhost for local desktop use; no public network exposure without a separately reviewed deployment model.
- Prepare guild-scoped slash command definitions/registration behind a disabled flag; test handlers and permission policy offline first. Current first live smoke quickstart has `ENABLE_SLASH_COMMANDS=0`; keep disabled until explicitly ready to test in the isolated guild.

### Revised integrated order

1. Continue OCR and Discord code restoration/hardening in parallel with reading the two HTML baselines.
2. Finish source recovery/full offline suite and keep production disabled.
3. Implement Player interface and companion upload page; preview and exercise local bridge with synthetic data/images.
4. Derive Admin interface; test role boundaries and same shared service API.
5. Prepare slash commands and UI service bridge; test all commands locally/guild-scoped without enabling production commands.
6. Integrate UI/upload with Discord bot and OCR workflow; ensure image upload reaches same queue/persistence/evidence path as Discord attachments.
7. Conduct isolated Discord smoke test with test bot/guild/channel, admin and participant, including UI-originated image upload and bot-originated response/attachment.
8. Complete Windows/native Tesseract, OCR acceptance, persistence/recovery, security, packaging and user manual.

## 5. Detailed next-step plan

1. **Recover exact historical source.** Find the complete archive and OCR progress archive; verify hash/manifest; inspect and reconcile against current GitHub branch. Restore missing source/tests/fixtures; don't reimplement.
2. **Repair full test baseline.** Put tests in intended location or correct paths based on original archive; exclude operator scripts from test discovery; restore missing modules/fixtures. Preserve test coverage and exact-value validation. Run `npm ci`, `npm test`, focused OCR, Discord, SQLite, full-system and acceptance suites. Repeat CI until clean.
3. **OCR.space robustness.** Review API contract against current official OCR.space docs; maintain disabled-by-default and secret-free config; verify quota caps, concurrent locking, corruption behavior, retries (no blind retries), timeout and image-size. Test Windows atomic file/lock semantics. No live POST or image transmission without explicit permission.
4. **OCR acceptance.** Tesseract.js remains baseline. OpenCV localizes geometry only. OCR.space and PaddleOCR remain secondary evidence, never sole authority. Maintain exact nine fields and order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP mandatory. Do not fuzzy-correct names/numbers or weaken exact-value validation. Resume full four-/16-image and additional/holdout suites after source recovery; retain failed cases and exact ground truth.
5. **Discord application commands.** Confirm existing message-command workflows and permissions; design command schema/handlers through shared service functions; add registration tooling for test guild only; leave global registration disabled. Test participant/admin restrictions, error responses, idempotency, attachments, state updates and audit logs. Message Content intent must remain enabled for existing prefix-command workflow.
6. **Desktop UI.** Retrieve and inspect both linked HTML baselines. Build main Player UI and companion upload page, then Admin derivative. Use local Node bridge; no client secrets/webhook. Provide preview and UI tests; ensure desktop interface and Discord channel share same service/state path.
7. **Pre-live integration.** Before live Discord smoke, run the UI locally with synthetic data, test image upload/OCR queue and bot responses through a development bridge; validate permissions and no secret leakage. Enable slash commands only for isolated guild when ready.
8. **Live Discord smoke.** Follow the quickstart; verify READY, channel permissions, participant/admin denial/allow, wrong-channel ignore, synthetic screenshot receipt, nine-field output, attachments, persistence, restart/recovery, and naturally observed rate-limit handling. No production guild.
9. **Windows/native gate.** Restore dependencies on user's Windows host using Node 22.16.0; run native Tesseract and cancellation/process tests; verify PaddleOCR environment if relevant; preserve exact npm lockfile.
10. **Security/recovery/packaging.** Secret scan, revoke any exposed webhook in Discord if still active (never reuse it), test backup/restore, package source/scripts/tests/docs/UI/manual/fixtures/provenance; exclude secrets, node_modules and live state; produce manifest/SHA-256 and clean-extraction verification.
11. **Release decision.** Production remains NO-GO until full acceptance, Windows/native, Discord, UI, security, restore, documentation and package gates pass with current evidence.

## 6. Standing rules for the next chat

1. **Correct repository/branch:** use only `pbrau014/braultDwBotVis`, delivery branch `dwbotVis`; `main` read-only.
2. **Expected-head Git discipline:** re-fetch branch head before every write; use parent/expected SHA; verify resulting commit and tree; never force-push.
3. **Continue to completion:** carry authorized project work through implementation, tests, correction, retest, packaging and reporting; do not stop merely because a detail is missing.
4. **Reuse before rework:** search historical reports, Library, archives, manifests, source, tests and prior working copies; try restore/adapt/run/repair existing work first; exhaust these options before rebuilding.
5. **Assume correct unless proven wrong:** treat user requirements, supplied code and selected baselines as correct by default. Correct only with concrete contrary evidence from current source, authoritative documentation or reproducible tests; state the evidence and preserve provenance.
6. **THINK → REASON → ACT:** inspect context, reason through options/risks, then take scoped actions.
7. **Provenance discipline:** distinguish original, derivative, historical, current branch, test evidence and assumptions. Never silently reconcile conflicts or invent missing data.
8. **Truthful verification:** distinguish attempted, implemented, tested, verified, accepted, live, simulated, blocked and not-run. Never report an unrun test as passed.
9. **Exact OCR contract:** nine fields and order above; XP mandatory; exact values only; no fuzzy repair or ground-truth weakening.
10. **Engine hierarchy:** Tesseract.js baseline; OpenCV geometry only; OCR.space/PaddleOCR secondary evidence only unless separately benchmarked and explicitly approved.
11. **No external OCR calls by default:** keep OCR.space disabled and never send images/crops without local key and explicit user permission.
12. **No client secrets:** never embed bot tokens, webhook URLs, OCR keys or privileged credentials in HTML/JS/logs/packages.
13. **UI security:** static HTML is not a trusted auth boundary; use local Node bridge, loopback-only, server-side roles, CSRF/origin validation, request limits and audit logs.
14. **Discord platform correctness:** actual slash commands are Discord application commands invoked by a Discord client; do not claim a browser can directly inject a slash interaction. Use shared service methods behind trusted bridge.
15. **Discord least privilege:** isolated test bot/guild/channel, Message Content intent enabled, no unnecessary Guild Members/Presence intents, channel preflight and safe permissions.
16. **No production testing:** use synthetic/non-sensitive test images and a development guild until all gates pass.
17. **Security finding handling:** never reuse the exposed webhook found in historical HTML; current branch sanitization does not revoke the old credential or erase history. Keep main read-only.
18. **Plan maintenance:** update `plan1.txt`, README, transfer status and relevant phase docs after material findings/changes.
19. **Parallel work:** continue independent OCR, Discord, HTML UI, documentation and packaging work where dependencies permit; do not let one external setup blocker stall unrelated work.
20. **No Python:** the user has disabled Python tools for this project; use Node/PowerShell or other authorized means.
21. **Production gate:** no release-ready claim until full test, OCR acceptance, Windows/native, Discord live, UI, security, recovery, manual and clean-package verification all pass.

## 7. Essential files and links

- Authority/rules: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md
- Main plan: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/plan1.txt
- Transfer status: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/GITHUB_TRANSFER_STATUS.md
- Phase 9 Discord status: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/docs/iteration23/PHASE9_DISCORD_INTEGRATION_STATUS_2026-11-04.md
- Discord quickstart: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/docs/iteration23/DISCORD_LIVE_TEST_QUICKSTART.md
- CI workflow: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/.github/workflows/dwbot-verification.yml
- OCR.space client: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/src/ocrspace-client.js
- OCR.space quota ledger: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/src/ocrspace-quota-ledger.js
- OCR.space field evidence: https://github.com/pbrau014/braultDwBotVis/blob/dwbotVis/src/ocrspace-field-evidence.js
- Discord live quickstart and current source files are in the repository; inspect before changes.
- Main user-provided HTML: https://chatgpt.com/library/share/libfile_9c3fb4096ea48191a22dc83a34181b2e?account_id=personal
- Companion upload HTML: https://chatgpt.com/library/share/libfile_d9655d5dc8d708191ab23b01184d970ab?account_id=personal
- CI run: https://github.com/pbrau014/braultDwBotVis/actions/runs/41800956774

## 8. Start command for the next chat

Continue the DWBOT project from the current `dwbotVis` branch and this handoff. First verify the branch head and read the authority/rules, plan1, transfer status, Phase 9 status and this report. Then search the Library and local/accessible project artifacts for the verified 472-file historical source archive and OCR progress checkpoint. Reuse/restore existing source before rework. Reconcile missing modules/fixtures and the intended test layout, rerun CI until full tests pass, then continue OCR.space/Discord work while building and previewing the Player/Admin desktop HTML interface and companion image upload page from the two linked baselines. Prepare safe local Node bridge and guild-scoped slash-command integration; integrate the UI before live Discord smoke where practicable. Preserve all exact OCR rules and security boundaries. Commit only to `dwbotVis` with expected-head checks and verify every push. Continue through testing, correction, retesting, packaging and final release gates; do not claim completion until a fully tested working version is verified.
