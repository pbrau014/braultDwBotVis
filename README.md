## OCR pipeline — current governing sequence

OCR.Space is the explicitly enabled primary text-extraction stage for every eligible, authorized image. Set `OCRSPACE_ENABLED=1`, `OCRSPACE_NETWORK_ALLOWLIST=1`, and provide `OCRSPACE_API_KEY`. OCR.Space Engine 2 receives each original image first and creates a searchable PDF. The PDF is downloaded, validated and rasterized locally; Tesseract.js, native Tesseract, PaddleOCR (when enabled), and OpenCV geometry then operate only on the PDF-derived raster. No local reader falls back to the original screenshot after PDF-first processing begins. Acceptance runners set `OCRSPACE_ARTIFACT_DIR` and retain the PDF/raster artifacts. The network guard explicitly permits the OCR.Space HTTPS API/PDF hosts; any restriction applies only to unrelated outbound destinations. `OCRSPACE_ENABLED=0` is reserved for isolated mocks or local readers after a PDF has already been produced, never for eligible original-image intake. See docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md and docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt.

## Node.js runtime baseline

The accepted DWBOT runtime baseline is Node.js **22.16.0** (`>=22.16.0`). This
version is acceptable for installation, project tests, OCR acceptance and
candidate verification; Node.js 24+ is not a prerequisite. The repository pins
22.16.0 in `.nvmrc`, package manifests and GitHub Actions. Use Node 24 only for
a specific dependency/tool requirement that is independently demonstrated.
Windows-specific checks still run on Windows, regardless of Node version.

## Historical tested-source checkpoint — 2026-11-05 (superseded by 2026-11-06 OCR.Space authority)

- Last source-code checkpoint: 5a12a9c218cebe61d277999318b7ceef5a8dc3b1 (run 42111470540).
- Documentation-only reconciliations after that source checkpoint: 846c125c039358b7b4d8e30f2a882409b5b6e526 and 88b81acec448d1c7307f36ba91ac0b276d5710b9. Re-fetch main before further writes; 5a12 is not the current branch head.
- Run 42111470540 remains in progress on Windows screenshot acceptance; Linux and clean-package/PDF jobs passed, as did Windows persistence/recovery and the full Node 22 suite.
- Exact-head runs 42115213448 and 42115501194 for the documentation-only sync commits are pending. Do not transfer test results across SHAs.
- The linked File Library crosswalk was updated. The living-plan Library upload failed because the Files tool reported no active container session; the original Library plan remains unchanged. The updated plan is committed in GitHub and available as a separate download.

## Source and documentation checkpoint clarification — 2026-11-05

- Last source-code checkpoint: 5a12a9c218cebe61d277999318b7ceef5a8dc3b1 (run 42111470540).
- Documentation sync commit: 846c125c039358b7b4d8e30f2a882409b5b6e526; exact-head run 42115213448 is pending. Main includes subsequent documentation-only reconciliation; re-fetch the branch before further writes.
- Run 42111470540 remains in progress on the source checkpoint: Linux and clean-package/PDF jobs PASS; Windows persistence/recovery and full Node 22 suite PASS; Windows screenshot acceptance still running.

## Current execution checkpoint — 2026-11-05

- Canonical main is 5a12a9c218cebe61d277999318b7ceef5a8dc3b1. The two test-only corrections are committed and verified: 78558e68c414ec4ed5164fc0d7dbdbcb8e8d9d59 and 5a12a9c218cebe61d277999318b7ceef5a8dc3b1.
- Exact-head Actions run 42111470540 on 5a12a9c218cebe61d277999318b7ceef5a8dc3b1: Linux offline PASS (284 total, 282 pass, 0 fail, 2 optional skips; OCR.Space mocked 35/35; Discord preflight 21/21; desktop preflight 31/31); clean-package/PDF job PASS; Windows persistence/recovery and full Node 22 suite PASS. Windows screenshot acceptance is still running and is not a pass yet.
- Clean package: 543 source files, 543 manifest entries, 545 ZIP entries; manifest, clean extraction, npm ci, npm test and prelive PASS. Source ZIP SHA-256: 1048a374d6d2a304d7a19f7f401eac9849c217bd8bfd87d8b202ef3607411646.
- The 8-page user manual and 4-page operations manual were visually inspected page-by-page. The user manual's page-1 TOC internal destinations were verified. Production remains NO-GO.
- OCR.Space is default-on only when a local Free API key is configured; explicit OCRSPACE_ENABLED=0 disables it, invalid non-empty values fail closed, and a local key remains mandatory. No live request or production screenshot transmission occurred.
- See docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt for the full queue and evidence. Historical branches remain read-only; no PRs were merged.

# World of Warships YOLO Tournament Discord Bot (DWBOT)

DWBOT is a local-first Node.js Discord tournament bot, strict screenshot OCR pipeline, and desktop Player/Admin workspace.

## Current verification — 2026-11-05

Repository: https://github.com/pbrau014/braultDwBotVis  
Active delivery/current working branch: `main`.  
Current main HEAD: `cb204feb30f7a2eadb2ffadd97addfb548dc24f4`. Exact-head run
`42108218338` is pending; do not transfer results from earlier commits.

Preceding run `42104276952` on ancestor `5a6ad4044b1aa67f3d02a5ab02f676607fa265d6`:
- Linux offline suite and PDF/clean-package job completed successfully.
- Windows process-level persistence/recovery and full Windows test suite
  completed successfully; current-source screenshot acceptance remained in
  progress at the last check.
- Clean-package artifact verified 536 source files, 536 manifest entries,
  538 ZIP entries, clean extraction, `npm ci`, `npm test` and prelive.
  ZIP SHA-256: `551711a72f32e8896e056fb5e0706ea7b96455b8111194cf30359c66b985372c`.
  Workflow artifact digest:
  `sha256:4d1e12aa2d01efc444557be63778cf8573b0ba013266d6279f131740ef698748`.
  The four-page operations PDF was visually inspected; its layout rendered,
  but stale OCR.Space activation wording was found and is being corrected.
- This is ancestor evidence only, not a pass for the current main head.

Commit `cb204feb30f7a2eadb2ffadd97addfb548dc24f4` adds bounded streaming
Discord image downloads, a 25 MiB hard maximum, bounded desktop upload
concurrency/timeouts, matching browser/server limits and regression tests. It
also clarifies public-safe Discord snapshots versus the full private Admin
recovery export. This implementation is committed but awaits exact-head CI.

Production remains **NO-GO** pending current-source Windows screenshot
acceptance, Gate A/B, live provider and Discord gates, user manual PDF
render/inspection, desktop/OAuth/browser/upload, security and release gates.

## Current handoff

The current dated continuation/runbook is `docs/continuation/NEXT_CHAT_HANDOFF_2026-11-05.md`. The canonical living running plan is `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`. Read the living plan first in every next chat. All work remains in this ChatGPT conversation; no interim progress narration is emitted.

## Architecture

- src/bot.js: Discord runtime, command routing, channel preflight and shared OCR entry point.
- src/tournament.js: authoritative 50-player tournament state/scoring, four events and seven games/event, JSON/SQLite persistence.
- src/battle-record.js: strict nine-field validation and exact corrections.
- OCR.Space is the explicitly enabled, highest-priority text-extraction stage for every eligible, authorized source image. Production and acceptance intake require `OCRSPACE_ENABLED=1`, `OCRSPACE_NETWORK_ALLOWLIST=1`, and a valid local `OCRSPACE_API_KEY`. Engine 2 processes the original image first and produces the searchable PDF; the PDF is downloaded, validated and rasterized locally. Tesseract.js, native Tesseract, optional PaddleOCR, and OpenCV geometry operate only on the PDF-derived raster. A missing PDF, failed download, invalid PDF or rasterization failure fails closed; no original-image fallback is permitted. Preserve the provider/local evidence separation and exact nine-field validation; OCR.Space text alone cannot accept or overwrite a field. The network guard permits HTTPS to `api.ocr.space` and `ocr.space`; any unrelated-egress restriction does not block OCR.Space. Only the explicitly authorized 4-, 16- and 64-image inventories may be transmitted under this chat's scope. See docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md.
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


## User and developer documentation

- [DWBOT User Manual](docs/user/DWBOT_USER_MANUAL.md) — five-chapter Player/Admin guide; rendered PDF is generated and packaged by the verification workflow.
- [Local Operations and Release Verification Manual](docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.md) — developer/operator verification runbook.
- [Requirements, Architecture and Schema Crosswalk](docs/continuation/REQUIREMENTS_ARCHITECTURE_SCHEMA_CROSSWALK_2026-11-05.md) — evidence-based component and acceptance mapping.
- [GrandYoloInstruct Deliverable Crosswalk](docs/continuation/GRANDYOLOINSTRUCT_DELIVERABLE_CROSSWALK.md) — identity remains unresolved; no four outputs are guessed.
