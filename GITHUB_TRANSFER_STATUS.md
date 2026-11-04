# DWBOT GitHub transfer status — current branch verification 2026-11-04

## Superseding current status

This section supersedes the historical `pop1` target and older transfer instructions below.

- Canonical repository: https://github.com/pbrau014/braultDwBotVis
- Authorized delivery branch: `dwbotVis` only.
- Read-only branch: `main`; no changes to main were made.
- Current branch at the prior verified checkpoint: `83ae324ce9b6a28453f5ed4dc886abf89d2ad3e8` (Gateway readiness/channel preflight implementation). Subsequent documentation/setup corrections are committed only to `dwbotVis`.
- Read-only tree inventory before those setup corrections: 877 entries (802 files and 75 directories), including 17 files under `src/`, 29 `*.test.js` files, and `package-lock.json`.
- The branch contains the Node.js application source, test corpus, supporting docs and release evidence. This count does not establish byte-for-byte equivalence with every historical local working-copy package; do not claim a complete archive transfer without comparing its manifest.
- At the time of inventory, the branch lacked both `.gitignore` and `.env.discord-test.example`; both are added by the current setup-hardening change.
- Historical references below to `pop1` and `PUSH_COMPLETE_DWBOT_POP1.ps1` are retained only as provenance. Do not run that helper or target `pop1` for current work.

## Discord readiness implementation

The latest implementation adds Gateway shard lifecycle logging, a read-only target-channel permission preflight, four command-policy checks, seven channel-preflight checks, and ten offline local-configuration checks (21 focused tests total), and an updated live-test quickstart. It does not perform a live login or send a test message.

## OCR.space source discrepancy

The current branch contains OCR.space design/implementation notes, but the source tree does not contain `src/ocrspace-adapter.js`, an OCR.space orchestration module, an OCR.space test file, or the npm scripts named in older README text. The older adapter test report is not reproducible from this branch as currently checked out. Treat OCR.space as not integrated into this branch until code and tests are restored and verified.

## Live and platform status

No Discord bot token, target guild/channel, test admin, or participant identity is available in this environment. No live Gateway login, channel permission verification, attachment receipt, rate-limit event, or restart recovery has been observed. The live Discord and Windows/native-Tesseract gates remain OPEN. Production remains NO-GO.

---

## Historical transfer notes (superseded; retained for provenance)

## Primary repository

- Repository: https://github.com/pbrau014/braultDwBotVis
- Target branch: pop1
- Default branch main: unchanged by this transfer.
- GitHub connector permissions: admin=true, push=true.
- Branch pop1 existed at the original initial commit before this session. A project overview README has now been committed to pop1.
- The current working source tree has not yet been pushed as a complete Git commit.

## Package inventory

- Working project tree: 554 files, approximately 211 MiB unpacked.
- Transfer ZIP: DWBOT_OCRSPACE_FREE_API_INTEGRATION_CHECKPOINT_2026-11-04.zip, approximately 189 MiB.
- Archive inventory: 619 entries including folder records; 550+ payload files. It contains the bot source, OCR adapters, test suites, scripts, docs, model assets, screenshots, workbook/JSON/provenance records and historical source artifacts.
- No individual working-tree file is at or above GitHub's 100 MiB single-file rejection threshold.
- Exclusions: node_modules, live .env, private Discord/OCR keys, database/runtime data, transient caches.
- .env.example is included with placeholder values only.

## Why the full push is not yet completed

The current execution container cannot resolve github.com (DNS failure), and /mnt/data/DWBOT_WORKING is not a Git checkout. The authenticated GitHub connector can modify text files, but it does not expose a binary/tree upload path from the local filesystem for a 550-file, ~219 MB working tree.

A PowerShell uploader is included in the project package at PUSH_COMPLETE_DWBOT_POP1.ps1. On a Windows machine with Git for Windows, GitHub Credential Manager authenticated, and GitHub network access, it initializes/uses a local Git repository, verifies the exact expected pop1 head with ls-remote, checks the 500-file minimum and GitHub file-size limit, commits the complete tree, pushes only pop1 with --force-with-lease, then verifies the remote head and file count. It never targets main.

Because the branch head can change when additional connector commits are made, the script's ExpectedRemoteHead must equal the latest verified pop1 head when it is run. If not, it safely stops rather than overwriting unknown remote work.

## OCR provider and tests

- OCR.space Free API selected and integrated as an optional localized-crop recognizer.
- Engine 2 handles general crops; Engine 3 handles stylized player-identity crops.
- External output does not independently accept fields; existing exact parsers and consensus remain authoritative.
- Quota ledger uses conservative daily/monthly caps and cross-process locking.
- OCR.space focused contract tests: 17/17 passing on Node.js 22.16.0.
- Crop dry-run: passed; selected crop 22,083 bytes, below the provider's 1 MB request limit.
- Live OCR.space POST: not verified. The execution container could not resolve api.ocr.space, and no OCRSPACE_API_KEY is configured.
- Full npm test: last result 215 passed / 1 failed because this extracted node_modules was missing dotenv. A clean npm ci was not verified here.
- Native Windows/Tesseract and Discord smoke-test gates remain distinct and outstanding.

Do not report the project as release-ready based on the partial tests or a later successful Git upload alone.


## Credential exposure note

A static HTML file contained a hard-coded Discord webhook URL. Its current branch version has been sanitized and direct posting removed. The previous URL remains in Git history; the owner must revoke it in Discord. No live request was sent. No history rewrite was performed.


## Critical default-branch credential exposure

A read-only check of `main` confirmed that its current `dwbotStuff/scoreReport_dark_clipboard (1).html` still contains the hard-coded webhook. The `dwbotVis` copy is sanitized, but `main` remains unchanged by design. Revoke/delete the webhook in Discord immediately; the branch-only code change does not disable the credential. Do not reuse it. No history rewrite or main-branch change was performed.


## Current verified state — 2026-11-04 CI run (supersedes stale OCR-space paragraph above)

- Current verified `dwbotVis` head before this status update: `572f95b27cfa0b769f56cecd0cc82ff59ab6ce52`.
- Current tree inventory: 893 tree entries, 815 blobs/files, 78 directories, 22 `src/` files, 32 root-level `*.test.js` files. There is no `tests/` directory in this tree.
- OCR.space source IS present and integrated on this branch: `src/ocrspace-client.js`, `src/ocrspace-quota-ledger.js`, `src/ocrspace-field-evidence.js`, `src/bot.js` integration, `ocrspace.test.js`, and npm script `test:ocrspace`. Earlier sections claiming it is absent are superseded by this verified state.
- CI run: https://github.com/pbrau014/braultDwBotVis/actions/runs/41800956774 — `npm ci` PASS; syntax PASS; OCR.space mocked tests 15/15 PASS; Discord offline preflight 21/21 PASS; full `npm test` 36 PASS / 29 FAIL / 65 total.
- The full-suite failure is reproducible in GitHub Actions and must be fixed. The test files are flattened at repository root while many import `../src` or `../scripts`; the package already refers to `tests/full-system.test.js` and `tests/sqlite-store.test.js`, but `tests/` is absent. Several modules and fixtures referenced by those tests are also absent. Restore the exact source/tests/fixtures from the historical 472-file verified archive first; do not recreate them from guesses or weaken tests.
- Historical archive provenance: `DWBOT_COMPLETE_DOWNLOAD_KIT_2026-11-03.zip`, SHA-256 `7f5984ecbcd8009110b98f283e20b7d5fc5b840e2a5c08a5ad4f436959387c25`; embedded manifest verified 472/472 files. Library search surfaced the report `OCR_RUNTIME_IMPLEMENTATION_UPDATE_2026-11-04.md` and the SHA sidecar for `DWBOT_OCRSPACE_PROGRESS_CHECKPOINT_2026-11-04.zip` (SHA-256 `7edb635b1e84bbf68a0d20936952ce70be63336cbcce49180fe9d3c24db359ed`); the ZIP itself was not returned by the exact Library search. Recover it from the user's local files or another accessible source before rework.
- A previous assessment incorrectly claimed the workbook used Grand Yolo tierWeight 1 / H12 $12.56. The source audit and current test assert tierWeight 0.9 / H12 $12.49. Treat the former claim as withdrawn; do not alter scoring on that basis.
- The desktop HTML Player/Admin interface is a newly authorized parallel workstream; it is not yet implemented. The detailed continuation/handoff document records the user-provided Library links and safe architecture plan.
- `main` remains read-only at `9981355e6895a6c24c3b59a78be57865fbecafbb`; no main change or force push.
