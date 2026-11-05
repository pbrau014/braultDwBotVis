# DWBOT Local Operations and Release Verification Manual

**Version:** 1.0 | **Prepared:** 4 November 2026
**Release status:** Production NO-GO until all mandatory gates have current evidence.

## 1. Safety and acceptance rules

- Use a separate development Discord application, bot, guild, channel and test accounts. Use synthetic screenshots and participant data only.
- Never commit or share bot tokens, OAuth secrets, webhook URLs, .env files, private databases, or real participant screenshots.
- Keep the desktop bridge bound to 127.0.0.1; do not expose it through LAN, tunnel, reverse proxy or port forwarding.
- Keep slash commands, OCR.space, PaddleOCR fallback and OpenCV assist disabled unless a separately approved isolated test requires them.
- Preserve the nine mandatory OCR fields in order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Missing, ambiguous, invalid, conflicting or incorrect values fail exact acceptance. Never fuzzy-correct or weaken validation.
- Record source commit, runtime, lockfile hash, fixture hashes, engine versions, command, exit code, logs, report and checksum.
- Hosted Windows CI is not the user's local Windows verification. Offline mocks and preflights do not prove real OAuth, browser or Discord behavior.

## 2. Windows host preparation

Use the active main checkout and confirm a clean working tree:

    git status --short
    git rev-parse HEAD
    node --version
    npm --version
    npm ci
    npm ls --depth=0

Current Windows acceptance uses the governing Node.js 22.16.0 baseline, native Tesseract 5.x with English traineddata, and ImageMagick. Run any separately identified test that genuinely requires Node.js 24 or later with the installed Node 24+ runtime and record it as a distinct version-specific result. Verify tesseract.exe --version, tesseract.exe --list-langs and magick.exe -version. Set TESSERACT_BIN and IMAGEMAGICK_BIN to exact executable paths if PATH is ambiguous.

## 3. Full OCR screenshot acceptance

Run: npm run test:windows-native-ocr

The runner executes the current-source Tesseract.js acceptance launcher, then native Tesseract reported-screenshot, four-image and additional-image suites. Network is blocked and optional OCR engines are disabled. Reports and logs must include runtime, source identity, engine versions and SHA-256.

PASS requires every Tesseract.js stage to pass, including local assets, known-good baseline, deliberately wrong expected-value negative control, sequential corpus and lifecycle checks. Native runs must complete all fixtures and match every approved mandatory value exactly. No missing required field, especially XP, and no blocked network attempts are allowed. Any mismatch or nonzero exit is FAIL. Preserve diagnostics; do not change ground truth to make a pass.

Tesseract.js remains the baseline. Native Tesseract is a measured comparator, not an automatic replacement.

## 4. Windows persistence and full recovery

Run: npm run test:persistence-recovery

The process-separated test seeds 50 synthetic players and all four event families, account links, private record ownership, pending submissions and pending OCR corrections. It verifies JSON close/reopen, full private backup import/export, public snapshot redaction, SQLite close/reopen, integrity_check, physical database copy/restore and JSON recovery from the copied private backup.

PASS requires every stage. The synthetic test does not replace an authorized local backup rehearsal and must never use production state.

## 5. Local Discord OAuth and browser test

Use a dedicated development Discord application. Register the exact redirect URI:

    http://127.0.0.1:8787/auth/discord/callback

Request identify only. Keep the OAuth secret in local .env only. Add these settings without overwriting the existing bot configuration:

    ENABLE_DESKTOP_UI=1
    DESKTOP_UI_PORT=8787
    DISCORD_OAUTH_CLIENT_ID=YOUR_DEVELOPMENT_APPLICATION_ID
    DISCORD_OAUTH_CLIENT_SECRET=YOUR_LOCAL_CLIENT_SECRET
    DISCORD_OAUTH_REDIRECT_URI=http://127.0.0.1:8787/auth/discord/callback
    TOURNAMENT_ADMIN_IDS=YOUR_TEST_ADMIN_DISCORD_ID
    ENABLE_SLASH_COMMANDS=0
    OCRSPACE_ENABLED=0
    PADDLEOCR_FIELD_FALLBACK=0
    OCR_CV_ASSIST=0

Use isolated JSON/SQLite paths. Run npm run preflight:desktop-test, npm run test:prelive, npm test, then npm start. The bridge starts only after Discord READY and channel preflight. Browse to http://127.0.0.1:8787.

Verify participant OAuth and own-data-only access; direct Admin-page/API denial for non-admins; Admin allowlist access; Manage Server alone does not grant Admin; CSRF/origin/state failures reject; desktop and narrow responsive layouts render correctly; synthetic image upload previews and processes; invalid, oversized and false-signature files reject; OCR review/correction/mapping is exact; duplicate mapping rejects; and the same record appears through Discord and desktop.

Record browser/version, viewport, role, synthetic image SHA-256, result ID, API status and redacted logs. Server start and contract tests are not browser visual QA.

## 6. Isolated development-guild Discord smoke

Use a separate development bot, test guild and one channel. Enable Message Content intent. Grant only View Channel, Send Messages (or Send Messages in Threads), and Attach Files. Keep test storage under testdata/live-discord-state and experimental providers disabled.

Capture evidence for: actual READY identity; effective configured-channel permissions; participant read-only command success; participant settings/mutation denial; Admin allowlist success; wrong-channel ignore; one synthetic screenshot through OCR and correction; nine exact required fields; shared Discord/desktop record identity; clean Ctrl+C shutdown; fresh READY after restart; and unchanged recovered state.

Do not deliberately flood Gateway or REST endpoints. Record only naturally occurring retry/backoff. Mocked 429 tests are not live evidence.

## 7. PDF manual and final package

The source manual is this file. The CI workflow renders it to PDF and uploads it with the package verification evidence. Inspect every PDF page for clipping, missing glyphs, broken layout and page numbering.

The release package must be created from the exact tested clean main commit and tracked source. Exclude .env, credentials, node_modules, runtime databases/state, private backups, caches and local untracked files. Include source, tests, fixtures, scripts, reports, docs, PDF and a path/size/SHA-256 manifest.

PASS requires archive SHA-256, ZIP integrity, clean extraction, independent manifest verification, npm ci, npm test and relevant offline preflights from the extracted copy. Retain the verification report.

## 8. Evidence and disposition

Retain one dated evidence directory per run. Include source commit and Git status; Windows/Node/npm details; OCR engine versions; fixture hashes; per-image JSON; blocked-network logs; report checksums; persistence stages and database hashes; redacted OAuth/browser screenshots and role matrix; Discord READY/permission/attachment/restart logs; PDF inspection checklist; package checksum and extraction verification.

Mark each gate PASS only after its acceptance criteria ran and evidence was reviewed. Otherwise mark OPEN, FAIL, BLOCKED or NOT RUN. Production remains NO-GO until all mandatory gates are independently verified.