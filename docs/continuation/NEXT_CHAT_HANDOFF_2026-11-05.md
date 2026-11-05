# CURRENT CHAT AUTHORITY OVERRIDE — 2026-11-05 (RECONCILED)

This block is the current operational authority. The detailed handoff body below
is retained as historical provenance; where its status, branch, runtime or
configuration statements conflict with this block or the canonical living
plan, use the canonical living plan.

- Sole canonical repository: https://github.com/pbrau014/braultDwBotVis.git
  (`pbrau014/braultDwBotVis`), branch `main`. Other repositories and branches
  are historical only; do not mutate them.
- All DWBOT work stays in this ChatGPT conversation. No Work-mode handoff.
  Do not emit interim progress narration; report after operations finish or a
  concrete blocker remains.
- Read `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt` first in every next chat. It is the
  checked-in current plan and governs the open work queue. The File Library
  review found ten saved plan entries representing five distinct content
  snapshots; duplicate copies were compared. The user intends to delete older
  Library copies after downloading and confirming the new canonical plan.
  No older Library entry has been deleted.
- Last verified `main` HEAD before this consolidated documentation/workflow
  update: `e49b6f64a68212cca84598d541a266cdf1232f1e`. Re-fetch `main` after
  this commit. Run `42091979664` was queued on the earlier `fb09f528...`
  commit; run `42091840336` was queued on `cdb872c...`. Neither validates
  the new head.
- Run `42088538702`: Linux Node.js 22.16.0 job PASS (269 total, 267 passed,
  0 failed, 2 skipped); PDF/manual/clean-package job PASS; Windows
  process-level persistence/recovery and full Windows Node 22 suite PASS.
  The separate Windows Tesseract.js/native-Tesseract screenshot-acceptance
  step remained IN PROGRESS at the latest poll. Its evidence-upload step had
  not run; no screenshot-acceptance artifact/report was available. Log
  download while still running returned BlobNotFound (404). Do not claim
  Windows screenshot acceptance passed.
- The PDF/package artifact from run `42088538702` is artifact ID
  `13443014385`, digest
  `sha256:339a1d2afa776899dd26ef0bf2c8d0b5a337e5d9f8deffb37b7d77083ddcecd6`.
  Clean extraction, manifest, npm ci, npm test and prelive checks passed;
  page-by-page PDF visual inspection remains open.
- The Actions queue contains older queued/in-progress per-commit runs. Do not
  infer a platform cause. The updated workflow limits future main verification
  to one running and one pending run without cancelling an in-progress run.
  The Windows OCR acceptance script now streams each command's output to the
  Actions log while retaining full per-command logs.
- OCR.Space is the highest-priority DWBOT development workstream until its
  project-wide integration, tests, review and verification are complete. It
  is not quarantined. Tesseract.js remains the local baseline and final
  acceptance authority; OpenCV provides geometry only; PaddleOCR is optional
  local comparison/fallback. When remote OCR is explicitly enabled, the
  sequence is local OpenCV geometry/safe-crop planning, OCR.Space Engine 3 as
  the first remote text-evidence pass, then independent Tesseract.js/local
  recognition. OCR.Space is secondary/last-resort evidence relative to local
  acceptance and cannot independently accept or overwrite any field.
- Runtime activation is strictly default-off and requires BOTH
  `OCRSPACE_ENABLED=1` and a locally stored key. A key alone never enables
  network access. This is verified in `src/bot.js` and
  `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`; any older handoff statement
  saying key-only auto-activation is superseded and incorrect.
- When enabled, use `detectOrientation=true`, `OCREngine=3`,
  `scale=true` by default (false only for verified 200–300 DPI input),
  `isTable=true` only for tabular reward/stat crops,
  `isCreateSearchablePdf=true` and
  `isSearchablePdfHideTextLayer=false`. If Engine 3 supplies no safe PDF URL,
  Engine 2 may be used only for a separately quota-reserved PDF-generation
  fallback; discard its OCR text. No paid tier/usage.
- Never transmit full screenshots, player identity/name, Discord identifiers,
  credentials, private account data or unrelated UI. Only minimum-necessary,
  geometry-proven non-identifying crops are eligible. No live provider request,
  API key, production screenshot transmission or accuracy gain is claimed.
- Preserve exactly nine mandatory fields, in order:
  `result`, `player`, `map`, `mode`, `battleStart`, `credits`,
  `freeXp`, `damage`, `xp`. XP is ninth and mandatory. The image3 XP
  regression must return 6646 or abstain; accepting 66465 is a false acceptance.
- Node.js 22.16.0 is explicitly authorized for DWBOT. Do not reinstate a
  Node 24+ requirement without new evidence.
- The exact 332-name root-cleanup list had zero matches in canonical main's
  42-entry root. No deletion commit was needed; nested copies and unrelated
  files were preserved.
- Production remains NO-GO. Gate A/B, current Windows screenshot acceptance,
  live synthetic OCR.Space smoke, PDF visual approval, desktop/OAuth/browser,
  isolated Discord, user-local recovery and final package/release checks remain
  open unless separately verified by current evidence.



---
# DWBOT current continuation handoff — 2026-11-05

**Historical body snapshot:** 2026-11-05. The authority block above contains the latest operational status; the detailed body below is retained for provenance.  
**Project:** World of Warships YOLO Tournament Discord Bot (DWBOT), strict screenshot OCR, computer-vision-assisted OCR, Discord integration, local Player/Admin desktop workspace, persistence and release hardening.  
**Canonical repository:** https://github.com/pbrau014/braultDwBotVis  
**Active implementation/delivery branch:** main  
**Historical integration/testing snapshot:** dwbotVis  
**Production disposition:** NO-GO. Current offline CI and package verification are not equivalent to full screenshot OCR acceptance, local browser/OAuth acceptance, or live Discord verification.

This document supersedes the branch, merge, runtime, CI, and release-package status statements in older handoffs. Preserve older reports as history; do not rewrite their source/runtime/results.

## 1. Exact remote source state — verified

| Item | Observed value |
|---|---|
| Repository | pbrau014/braultDwBotVis |
| Active branch | main |
| main HEAD | 050b3a12aa64985d9a0a439ab84db8c116851a51 |
| main tree | 784644fbda57d6b29e499a846a336c98ad78d780 |
| Current recursive tree | 939 entries: 855 files, 84 directories; GitHub reported not truncated |
| Historical dwbotVis HEAD | 9c26d69a8e2383eb32c78f12017eadfa0577f452 |
| Compare dwbotVis...main | main ahead by 4 commits, 0 behind |
| Current latest commit | Keep OCR negative control on one verified fixture |
| Current latest commit URL | https://github.com/pbrau014/braultDwBotVis/commit/050b3a12aa64985d9a0a439ab84db8c116851a51 |

The user explicitly authorized merging the current project work into main. The remote history now contains a normal two-parent merge commit, e3b8562e27b2bceecbbaf6c11667f9bdedcdc010, with dwbotVis commit 9c26d69... as one parent and main's independent workflow change as the other. No force-push or history rewrite was used. Subsequent commits 321f4d3... and 050b3a1... corrected the OCR negative-control fixture. The current main includes the dwbotVis work; do not re-merge the old snapshot over main.

Relevant commits:
1. 2e9847c3821cb4265c35c70bc89dd9b644d3b2eb — configure verification to run on the active main branch.
2. e3b8562e27b2bceecbbaf6c11667f9bdedcdc010 — merge current OCR/API/Windows verification work into main.
3. 9c26d69a8e2383eb32c78f12017eadfa0577f452 — align Windows acceptance and release documentation to Node.js 22.16.0.
4. 321f4d3ee02c66c78eeb4a44e4cd0bc903969d29 — move the negative control to a known-good exact fixture candidate.
5. 050b3a12aa64985d9a0a439ab84db8c116851a51 — make baseline, deliberate wrong-value test, and report lookup use the same image.png fixture.

Before every future remote write:
1. Fetch main head and tree immediately before the write.
2. Compare the observed parent with the planned expected SHA. If it moved, stop and reconcile.
3. Create the file blobs and a tree based on the exact current tree.
4. Create a commit with the exact current main head as parent.
5. Update main with force=false and expected_sha equal to the observed head.
6. Fetch main again and verify the commit, tree, file contents and ancestry.
7. Run required tests against the exact resulting commit. A successful write response alone proves no test result.

No force push, history rewrite, reset, or destructive cleanup. Do not continue committing to dwbotVis unless a later explicit instruction changes the branch plan. Do not substitute pbrau014/dwbot or any other repository.

## 2. Latest CI on the exact current main head

Workflow run 41942650363:
https://github.com/pbrau014/braultDwBotVis/actions/runs/41942650363

Head: 050b3a12aa64985d9a0a439ab84db8c116851a51.

At the latest status observation, the overall workflow remained IN PROGRESS because the long current-source Windows Tesseract.js/native Tesseract screenshot-acceptance step was still running. Do not label that step or the overall run PASS yet.

### Completed jobs/steps on run 41942650363

**Node.js 22.16.0 Linux offline verification — SUCCESS**
- npm ci and syntax checks completed successfully.
- OCR.space mocked contract/crop/quota suite: 15/15 PASS.
- Discord offline preflight and command policy: 21/21 PASS.
- Desktop offline configuration preflight: PASS.
- Desktop service/bridge/UI contract tests: 28/28 PASS.
- Process-level persistence/recovery stage: completed successfully in the Linux job.
- Full npm test: 259 total, 257 passed, 0 failed, 2 skipped.
- Skip 1: low-contrast red-channel crop test skipped because ImageMagick was unavailable on this Linux runner.
- Skip 2: optional OpenCV geometry helper skipped because Python cv2 was unavailable on this Linux runner.
- Exact job log can be retrieved from workflow job 126967037238.

**Windows Node.js 22.16.0 — PARTIAL / STILL RUNNING**
- Checkout of exact current commit: PASS.
- Node.js 22.16.0 setup: PASS.
- Native OCR prerequisites: Tesseract 5.x and ImageMagick installation/inspection step completed successfully.
- Isolated OpenCV geometry runtime installation/import: PASS.
- Locked dependency install: PASS.
- Windows process-level persistence and recovery step: PASS.
- Full Windows Node.js 22 test suite: PASS.
- Current-source Tesseract.js and native Tesseract screenshot acceptance: IN PROGRESS at last check.
- This screenshot step gates the remaining Windows result. The uploaded artifact is expected only after the job reaches its final upload step.

**PDF/manual/clean-package job — SUCCESS**
- Pandoc/Typst setup: PASS.
- PDF manual rendering: PASS.
- Tracked source package and clean-extraction verification: PASS.
- Artifact uploaded: dwbot-pdf-manual-and-clean-package, artifact ID 13377660214.
- Downloaded artifact file: dwbot-current-main-050b3a12-PDF-package.zip.
- Downloaded artifact ZIP CRC: PASS.
- Outer artifact SHA-256: be08d0af5a6cddf1a7b971139eada11e85d6dcb12e849947dd116e7a1724e044.

The downloaded outer artifact contains:
- DWBOT-050b3a12aa64.zip
- DWBOT-050b3a12aa64.zip.sha256
- DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf
- release-package-verification.json

The embedded release package report is tied to sourceCommit 050b3a12aa64985d9a0a439ab84db8c116851a51 and says:
- sourceFiles: 854
- manifestEntries: 854
- zipEntries: 856
- manifestVerified: true
- cleanExtraction: true
- npmCi: PASS
- npmTest: PASS
- prelive: PASS
- passed: true

The release archive SHA-256 sidecar is 87dafabc3e3f7475aa36c195be03b37cc7c58a66f21f837142cea895c7dc6ca7. I extracted the embedded release ZIP, independently matched its SHA-256 to the sidecar, and ran ZIP CRC verification successfully. Release ZIP size: 117,836,730 bytes. This verifies the archive's byte integrity and the workflow-generated manifest/extraction/test report; it does not by itself constitute independent page-by-page visual inspection of the PDF or prove the screenshot OCR acceptance gate.

### Current acceptance interpretation

PASS: Node 22 Linux offline verification, Windows Node 22 process-level persistence/recovery, Windows Node 22 full npm test, PDF rendering, release-package manifest verification, clean extraction and package checks as recorded by the current workflow.

OPEN: current-source Windows screenshot OCR acceptance until the running step finishes and the full report/artifact is inspected.

NOT PROVEN by these checks: OCR.space live HTTP operation or accuracy benefit; actual local Windows desktop/browser visual QA; actual Discord OAuth; real development-guild READY and permissions; live Discord attachment flow; real-world rate-limit behavior; user-local backup/restore rehearsal; user acceptance or production release.

## 3. Source and OCR status that must be preserved

### Canonical nine-field acceptance contract

Exactly nine mandatory fields, exact order:
1. result
2. player
3. map
4. mode
5. battleStart
6. credits
7. freeXp
8. damage
9. xp

XP is mandatory and ninth. Any missing, invalid, ambiguous, conflicting or incorrect mandatory value fails exact acceptance. Never weaken validators, amend approved ground truth to fit output, fuzzy-correct names/numbers, or silently inject expected values.

### OCR architecture and engine roles

- Tesseract.js remains the preserved local baseline.
- OpenCV localizes geometry/regions and proposes image crops; OpenCV output alone is not accepted text.
- PaddleOCR remains an optional local comparison/fallback candidate. It must be benchmarked against the same labeled images and cannot silently replace Tesseract.js.
- OCR.space Free API is the selected preferred remote evidence provider for unresolved, pre-localized crops when suitably configured and authorized.
- OCR.space output is kept separate as diagnostic evidence. It may not independently accept, rewrite, normalize, fuzzy-correct or bypass mandatory field validation.
- Free external services may be used where justified; no paid tier, surprise billing, unrelated service substitution or unnecessary new OCR framework.
- Local operation must remain viable when the API is not configured, unavailable, over budget or rate-limited.
- Formal full OCR screenshot acceptance remains deterministic and network-blocked. Mocked provider tests are not live-provider tests.

### Current OCR.space configuration semantics

The current code requires both OCRSPACE_ENABLED=1 and a locally configured OCRSPACE_API_KEY. A key alone never enables network access; absent either setting, the provider remains default-off. Never commit a real key or include it in chat, HTML, logs, fixtures or archives.

Current conservative local quotas documented in the integration note/configuration:
- 450/day
- 22,000/month
- 900 Engine 3/month
Requests are sequential, pre-localized, size/time/crop bounded, and usage is reserved in the local quota ledger before provider requests. No automatic retry is performed after 429. Before real user/player data is transmitted, verify current provider terms/privacy/retention and the exact scope of user authorization. Prefer synthetic data for initial live-provider validation. Do not infer live use or accuracy benefit from mocks.

### Additional field expansion

The user authorized identifying additional screenshot text fields where the label/identifier/title/heading and value meaning can be reliably interpreted and verified. Implement only as additive, versioned, backward-compatible optional or conditional fields. Define stable field ID, display label, type, source region/layout, extraction method, validation, status and tests. Preserve the original nine required fields unchanged. Keep raw OCR, parsed, accepted and human-corrected values separate. Mark unclear values unsupported/ambiguous and abstain.

### Image/Excel/JSON corpus requirements

The reviewed image inventory includes 64 records: 56 eligible and 8 explicitly excluded. The nested reviewed ZIP has 56 image files. Preserve the eight exclusions. Preserve original files and checksums. Keep the four established baseline images as well as the 56 eligible candidate images. The 56 images are not automatically 56 exact ground-truth fixtures: field-level expected values must be independently verified before using them as strict acceptance gold data. The Excel workbook contains candidate transcription/field suggestions and must not be treated as approved ground truth without independent review. The JSON must be schema-checked against current project code before integration. Do not claim the images/workbook/JSON are incorporated into the current repository unless the actual main tree proves it.

## 4. Exact next actions

### Step 1 — Refresh source and workflow state
1. Fetch current main branch ref, HEAD commit and tree. It may have advanced since this snapshot.
2. Fetch dwbotVis and compare it to main. It should be an ancestor/historical snapshot, not the active base.
3. Fetch workflow run 41942650363, its jobs and all step conclusions. Check whether the Windows screenshot acceptance step completed.
4. If a newer main commit or CI run exists, update this handoff from current evidence before acting.
5. Download the current Windows artifact after it is uploaded. Verify archive SHA/CRC, inspect the acceptance report, all baseline and CV/native per-image JSON files, engine/runtime/source identity, blocked-network logs, per-field failure rows and report checksum.
6. Do not report the Windows OCR gate as PASS merely because the earlier Windows persistence and npm test stages passed.

### Step 2 — Diagnose current screenshot acceptance
1. If the screenshot gate passed on exact current main, record every stage/image count and verify the final report's source commit/runtime/checksum. Still record the user-local Windows status separately.
2. If it failed, isolate exact failures by fixture and field. Preserve ground truth and all failure diagnostics.
3. Compare Tesseract.js baseline, OpenCV-assisted candidate and native Tesseract outputs as distinct evidence sources. Do not claim CV improved accuracy unless paired results actually demonstrate improvement.
4. Check the negative control: all three actions must use image.png; baseline must first match all nine fields exactly; the only overridden expected field is damage from 255359 to 255360; actual OCR values must remain identical; the expected nonzero exit must be attributable solely to the deliberate one-field mismatch.
5. Use a failing regression case before code changes, identify root cause, make one minimal correction, rerun focused tests, then rerun the complete affected suite and current-source acceptance.
6. Never remove failed fixtures, reduce the acceptance corpus, weaken exact value checks, change expected values to match OCR, or report aggregate counts without per-image detail.

### Step 3 — OCR.space and engine verification
1. Keep the API key local only. Require both OCRSPACE_ENABLED=1 and a local key for activation; otherwise remain default-off.
2. Review current provider policy/privacy and verify quotas, timeout, crop bounds, MIME/size limits, error handling and ledger concurrency/corruption behavior.
3. Begin with synthetic crops. Only perform real screenshot/crop requests where the user has authorized that data transmission.
4. Record provider, endpoint, purpose, crop field, input hash, configuration/engine, quota reservation, request/response/error, time, and whether evidence was used only diagnostically.
5. Keep real network calls outside network-blocked formal acceptance. Use paired labeled benchmarks for any accuracy claim.
6. Keep Tesseract.js baseline and local fallback viable; PaddleOCR is a separate local candidate.

### Step 4 — Complete desktop/OAuth and Discord gates
1. Inspect the existing Player/Admin/Upload pages and shared service/bridge code before changes.
2. Use an isolated development Discord application, bot, guild, channel and synthetic data only.
3. Keep Message Content intent only for existing prefix-command/image visibility requirements; do not add GuildMembers or Presence intents without justified need.
4. Keep ENABLE_SLASH_COMMANDS=0 and global command registration disabled. Use guild-scoped/test-only registration when separately ready.
5. Use the exact redirect URI http://127.0.0.1:8787/auth/discord/callback and scope identify only.
6. Keep bridge bound to 127.0.0.1; never expose it via LAN, tunnel, reverse proxy or port forwarding.
7. Prove server-side participant ownership and Admin allowlist enforcement; Manage Server alone is not Admin. Test CSRF/state/origin rejection, request/file size/signature validation, duplicate mapping prevention, safe uploads and audit/redaction.
8. Verify local browser visual/responsive QA and a synthetic screenshot upload through the actual shared OCR queue/state, not a mocked contract only.
9. Perform live development-guild smoke: actual READY identity, effective channel permissions, participant/admin access boundaries, wrong-channel ignore, synthetic screenshot attachment OCR, exact nine-field result/review, same Discord/desktop record identity, clean shutdown, fresh READY on restart and recovered state. Do not flood Gateway/REST.

### Step 5 — Persistence, recovery, security
1. Current CI's process-level persistence/recovery stage passed; preserve its exact source/runtime result.
2. Complete a user-local rehearsal with synthetic state if authorized: separate process close/reopen, JSON and SQLite, integrity_check, physical DB copy/restore, full private backup export/import and JSON recovery.
3. Public snapshots must exclude private Discord account links, desktop ownership IDs and pending per-user workflow identifiers. Only authenticated local Admin backup is complete private recovery.
4. Never include .env, API keys, bot tokens, OAuth secrets, webhook URLs, databases, private backup or real participant screenshots in Git/package.
5. One historical HTML source contains a hard-coded Discord webhook. Never display or reproduce it. The owner must revoke/regenerate it; code redaction does not revoke a live credential.
6. Bound upload size/pixels, memory, CPU, queue depth, concurrency, timeouts, temp files, retries and quota; test interruption, malformed files, duplicates, resource exhaustion and recovery.

### Step 6 — Final package and release decision
1. Current main CI package job passed. It produced DWBOT-050b3a12aa64.zip, sidecar, PDF and release-package-verification.json.
2. Keep the exact tested clean main commit as source. If any source changes occur, create and verify a new package from that new exact SHA.
3. Exclude secrets, node_modules, private state, user databases, live files, caches and unreviewed local working files.
4. Independently verify package SHA-256, ZIP CRC, manifest/path/size checks, clean extraction, npm ci, npm test and relevant offline preflights from the extracted copy.
5. Inspect every PDF page visually for layout/clipping/glyph/page number issues; the workflow currently proves render/file generation, not independent page-by-page visual QA.
6. Mark each gate PASS, FAIL, OPEN, BLOCKED or NOT RUN. Production remains NO-GO until OCR, Windows/native, local browser/OAuth, isolated live Discord, recovery, security, manual and final package gates all have current evidence and the user has not withheld release acceptance.

## 5. Standing user rules — complete operational summary

### 5.1 Standing IMPLEMENT Rule (verbatim)

THE STANDING IMPLEMENT RULE is my default framework across all chats, projects, and task types, wherever available. Apply it automatically and proportionately; “implement” is not required to activate it. Follow higher-priority instructions and safety/tool limits; never claim unverified access or completion. Preserve source/derivative distinctions and provenance. Apply THINK → REASON → ACT under Mode 4. IMPLEMENT-family wording signals comprehensive consideration of options and risks; it does not authorize execution. Distinguish facts, assumptions, inferences, recommendations, and uncertainty; research when useful and cite sources. Never invent evidence, fill gaps, alter source content, or silently reconcile conflicts. Research and planning may proceed; consequential actions require explicit, scoped authorization. Silence is not authorization. Pause when ambiguity or conflict affects action. Continue authorized work through testing, verification, correction, and reporting; distinguish attempted, completed, tested, verified, and accepted. Apply ADD-047 automatically only on Section 14 triggers: inventory/read the accessible File Library, including nested folders/inspectable archives; analyze/reconcile; report coverage/limits; pause. This review is read-only, not permission to change/share. Isolated/minor tasks and quoted source text are not triggers. After review, change only what I approve, verify, then resume. Never claim exhaustive review if material content was uninspected.

### 5.2 Thinking, evidence, and authorization
1. THINK → REASON → ACT. Mode 4 means comprehensive consideration proportionate to the task.
2. IMPLEMENT-family wording asks for complete consideration; it is not blanket authority for unrelated consequential actions.
3. Separate facts, assumptions, inferences, options, recommendations and uncertainty.
4. Preserve source vs derivative, historical vs current, original vs modified, model output vs human correction, and mocked vs live evidence.
5. Never invent file content, test evidence, credentials, permissions, approvals, runtime state, or access.
6. Distinguish attempted, implemented, committed, pushed, tested, verified, accepted, live, simulated, blocked and not-run.
7. Research niche/current facts where helpful. Cite factual external sources in user-facing reports.
8. Continue authorized work through test, root-cause diagnosis, correction, retest, packaging and report. Do not stop for ordinary missing filenames if the answer can be found from adjacent files/code/tests/manifests.
9. Pause when a material ambiguity/conflict changes the action or its consequences. Silence is not permission.
10. Use explicit scope and current-head protection for remote writes. No force push or history rewrite.

### 5.3 ADD-047 and Library
1. ADD-047 is conditional. Apply only when the Section 14 trigger is met.
2. When triggered: inventory/read accessible relevant File Library material, nested folders and inspectable archives; reconcile; report coverage and limits; pause before consequential changes requiring approval.
3. Library review is read-only and is not permission to delete, move, rename, share or alter Library contents.
4. Do not claim exhaustive inspection if any material content was unreadable/uninspected.
5. For this handoff, the user explicitly requested a Library export. The package contains 114 accessible Library files and one nested folder; it preserves duplicates. A per-file SHA-256 manifest is included. This export does not authorize modifying Library originals.
6. Keep unrelated Grand Tournament/reference documents distinguishable from active DWBOT runtime source.

### 5.4 Runtime and Windows
1. Node.js 22.16.0 is an acceptable general DWBOT runtime.
2. Tests that actually passed under Node.js 22.16.0 are acceptable for that runtime.
3. Use installed Node.js 24+ only for a concrete test/tool that genuinely requires Node 24+; record that as a separate version-specific result. Do not silently upgrade dependencies or relabel runtime evidence.
4. A generic Windows compatibility test was waived because established Windows compatibility knowledge is sufficient for that redundant test. Treat the waiver as a waiver, not a test pass. It does not establish native Tesseract function, screenshot accuracy, browser/OAuth, or Discord function.
5. Use exact runtime versions, lockfiles and dependency manifests. Do not silently upgrade dependencies.
6. Do not use the ChatGPT Python tool for project work. Use Node.js, PowerShell, shell and approved project tooling; the application may still invoke its intended Python/OpenCV/PaddleOCR runtime as part of its own tested architecture.

### 5.5 OCR design and validation
1. The governing OCR direction is a computer-vision-assisted WoWS screenshot pipeline.
2. Retain the existing Node.js bot architecture; do not replace it with an unrelated Python-only stack, generic monolith, or unneeded FastAPI/Celery/Redis infrastructure.
3. Use image validation/classification, screen/layout profiling, field localization, geometry, preprocessing, independent recognition, field parsing, strict validation, evidence/provenance and human review.
4. Tesseract.js stays baseline; OpenCV localizes geometry/ROI; PaddleOCR is optional local comparison/fallback; OCR.space Free API is preferred remote evidence provider when configured and justified.
5. Do not replace Tesseract.js without paired evidence on the same labeled fixtures showing better accuracy and reliability.
6. Free external network/API calls may and should be used where necessary/appropriate. No paid service, surprise billing or unrelated provider substitution. Prefer local-first operation and controlled remote fallback.
7. Check provider privacy/retention, data handling, rate limits, quotas, reliability, security and technical fit before sending any user/player data. Use synthetic data for initial tests.
8. Remote OCR gets localized crops by default, not full screenshots. Keep remote output diagnostic and separate from accepted candidate lists.
9. Mock contract tests are not live HTTP requests; never claim live API use or accuracy improvements without recorded real request/response and paired exact benchmark.
10. Formal screenshot acceptance should be deterministic and network-blocked.

### 5.6 Nine fields, extra fields, and ground truth
1. Preserve exact required field order: result, player, map, mode, battleStart, credits, freeXp, damage, xp.
2. XP is mandatory and ninth. Any required missing/invalid/ambiguous/conflicting/wrong value fails exact acceptance.
3. Do not fuzzy-correct player/ship names, dates, XP, Free XP, damage, credits or other exact-value fields.
4. Never alter approved ground truth, inject expected values, accept a plausible guess, or weaken the validator to manufacture a pass.
5. Preserve raw OCR, candidate values, geometry, confidence/engine metadata, parsed value, accepted value and human correction as separate evidence.
6. Add more fields only if label/identifier/title/heading and meaning are reliable. Define stable ID, display label, type, source ROI/layout, method, validator, status and version. Test success, wrong, missing, ambiguous and conditional cases.
7. Mark extra fields optional/conditional until proven. Uncertain or unsupported content must remain unresolved.
8. Do not presume the 56 eligible images are approved exact ground-truth fixtures; independently verify each field before promoting to gold data.

### 5.7 Assets, spreadsheets, and archives
1. Preserve the four original baseline images and include 56 eligible images from the reviewed corpus as candidate regression coverage.
2. Keep the 8 explicitly excluded inventory images excluded.
3. Preserve original files, hashes and provenance. Never edit source images/workbooks just to pass.
4. Inspect Excel formulas, cells, data and use before integrating. Treat candidate values as suggestions until independently reconciled.
5. Validate JSON schemas against current code and contracts before integration.
6. Inventory/extract nested archives where possible; record archive names, hashes, member counts, excluded/unreadable/encrypted files and coverage.
7. Preserve originals/derivatives and distinguish active code from historical checkpoints and release candidates.

### 5.8 Discord, desktop, and security
1. Use isolated development Discord app/bot/guild/channel and synthetic participant data until all gates pass.
2. Keep slash-command registration disabled globally and keep ENABLE_SLASH_COMMANDS=0 unless the isolated guild workflow is explicitly ready.
3. Discord slash commands are application commands invoked through a Discord client; do not fake slash interaction payloads from browser code.
4. Keep the local desktop bridge on 127.0.0.1 only. No LAN bind, tunnel, reverse proxy or port forwarding.
5. OAuth should request identify only and use exact redirect http://127.0.0.1:8787/auth/discord/callback.
6. The trusted Node service enforces Admin allowlists, participant ownership, CSRF/origin/state and upload limits. Manage Server alone does not grant DWBOT Admin.
7. Keep bot tokens, OAuth secrets, OCR keys and webhooks out of browser assets, logs, chat, archives and Git.
8. A historical HTML artifact contains an exposed Discord webhook pattern. Never reveal or reuse it; owner revocation/regeneration is required. Removing it from one source copy does not revoke it.
9. Public backup snapshots must omit private account links, ownership IDs and pending per-user workflow identifiers. Full recovery is restricted to authenticated local Admin private backup.
10. Use least privilege: View Channel, Send Messages (or Send Messages in Threads), Attach Files; Message Content only where existing prefix/attachment workflows require it. Avoid unnecessary GuildMembers/Presence intents.

### 5.9 Engineering and reporting
1. Preserve established interfaces/working behavior. Diagnose root causes, not symptoms.
2. For bugs: reproduce, inspect recent changes, trace data flow, compare working patterns, form one hypothesis, write/verify failing regression test first, implement minimally, rerun focused and full suites.
3. Do not remove tests, hide failures, invent fixtures, use fake production code, leave TODO placeholders, or change ground truth to fit OCR.
4. Bound resources: memory, CPU/GPU, files/pixels, queues, concurrency, staging, retries, timeout, DB pool and quotas.
5. Test normal, malformed, missing, ambiguous, conflicting, duplicate, interrupted, exhausted and recovery cases.
6. Maintain append-only plan/change history and stable IDs. Update README, plan, phase docs, CI evidence and handoff when material changes occur.
7. Maintain requirement→code→test→result traceability.
8. Do not import other projects' specific governance/mandatory document processes into DWBOT.
9. Production remains NO-GO until current exact-source OCR, Windows/native, local browser/OAuth, isolated live Discord, persistence/recovery, security, PDF/manual and clean-package gates all pass with reviewed evidence.
10. Report exact source SHA, branch/tree, runtime, files inspected/changed, commands, logs, failure counts, per-image outcomes, API/network status, Windows/browser/Discord/recovery gates, checksums, risks and next tasks.

## 6. Handoff archive and external files

The attached handoff archive contains:
- 114 accessible File Library files totaling 505,374,183 bytes, with duplicates preserved and one nested folder.
- Per-file SHA-256 manifest for those Library files.
- The current-main CI artifact for commit 050b3a12..., including the 854-file release package, SHA-256 sidecar, generated PDF manual and release-package-verification.json.
- Prior handoff instructions, the comprehensive user-rule/resumption prompt, file-library reconciliation, recursive archive inventory, historical Windows OCR diagnostic material and checksums.

The archive does not contain the user's local private .env, live bot token, OAuth/API keys, private production database, private backups, actual live runtime state or uncommitted Windows checkout. Do not ask for secrets. Clone/fetch current main and reconcile with the local user's working tree carefully; never overwrite uncommitted user changes. Do not assume the Library's old checkpoint ZIP is the latest source when current main is newer.

## 7. First message the next chat should act on

Continue DWBOT from canonical main. First read docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt, then re-fetch main HEAD/tree and latest workflow status. Use this handoff, docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md, plan1.txt, current OCR/Windows reports and package artifact as supporting context. Do not start over or use dwbotVis as the current source. Inspect the Windows native screenshot-acceptance job/artifact for the exact current main SHA; diagnose and repair only evidence-backed failures without weakening the nine-field contract. Then complete the local Player/Admin/OAuth/browser, synthetic upload, isolated Discord smoke, security/recovery and final release gates. Keep production NO-GO until every gate has current evidence.

**END OF CURRENT HANDOFF.**