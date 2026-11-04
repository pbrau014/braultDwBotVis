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

The latest implementation adds Gateway shard lifecycle logging, a read-only target-channel permission preflight, six isolated unit tests, and an updated live-test quickstart. It does not perform a live login or send a test message.

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
