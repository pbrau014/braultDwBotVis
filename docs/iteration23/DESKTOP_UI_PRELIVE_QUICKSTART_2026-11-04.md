# DWBOT Desktop UI — pre-live quickstart

Status: implemented in the Node.js application; disabled by default. CI does not verify a live OAuth login or visual browser operation.

## Included
Player: linked roster entry, public standings, totals, event scores and owned screenshot submissions.
Admin: roster/account linking, manual results, event settings, all submissions, mapping review and full private backup.
Upload: one image picker/drop, preview, validation, progress and result.
Shared service: image bytes enter the same serialized OCR queue and tournament state as Discord attachments.
Security: loopback-only listener; Discord OAuth identify only; server-side roles; CSRF/origin checks; request limits; image magic-byte validation; audit logging. No secrets in browser code.

## Requirements
Use a separate development bot, guild and channel. Configure the normal bot .env first. Enable Message Content intent for existing prefix commands/attachments. Target channel must allow View Channel, Send Messages and Attach Files. Keep ENABLE_SLASH_COMMANDS=0.

## OAuth2
Register this exact Discord OAuth2 redirect:
http://127.0.0.1:8787/auth/discord/callback
Scope: identify only.

## Local .env additions
Add these to the existing .env; do not overwrite the bot's token/channel/storage settings:

ENABLE_DESKTOP_UI=1
DESKTOP_UI_PORT=8787
DISCORD_OAUTH_CLIENT_ID=YOUR_DISCORD_APPLICATION_ID
DISCORD_OAUTH_CLIENT_SECRET=YOUR_LOCAL_OAUTH_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URI=http://127.0.0.1:8787/auth/discord/callback
TOURNAMENT_ADMIN_IDS=YOUR_ADMIN_DISCORD_USER_ID
ENABLE_SLASH_COMMANDS=0
OCRSPACE_ENABLED=0
PADDLEOCR_FIELD_FALLBACK=0
OCR_CV_ASSIST=0

TOURNAMENT_ADMIN_IDS is a comma-separated explicit allowlist. Manage Server alone does not grant desktop Admin.

## Offline verification
From project root run:
- node --version
- npm ci
- npm run preflight:desktop-test
- npm run test:discord-preflight
- npm run test:desktop
- npm run test:ocr
- npm test

npm run test:prelive combines Discord preflight, desktop config preflight, desktop tests and OCR focused tests.

## Start
Run npm start. Bridge starts only after Discord READY and target-channel preflight. Address: http://127.0.0.1:8787. If OAuth settings are absent, desktop stays disabled.
Sign in with a test Discord account. An administrator in TOURNAMENT_ADMIN_IDS receives Admin access. Admin links each participant's Discord ID to a roster entry. Unlinked accounts see no tournament data. Players can map only when OCR player identity matches their linked roster identity.

## Synthetic upload
Use one non-sensitive PNG/JPEG/WEBP/BMP/TIFF image under 10 MB. Verify preview, accepted/rejected result, progress, record ID, all nine field values, exact correction and mapping to one slot. Verify the same record is visible from Discord and desktop. Confirm duplicate and wrong-player mapping attempts do not create another result.

Nine mandatory fields remain result, player, map, mode, battleStart, credits, freeXp, damage and xp. XP is ninth and mandatory. No fuzzy correction.

## Backup distinction
Public channel snapshots and public !yolo export / !yolo finalize omit account links, per-record desktop owner IDs and pending per-user workflows. Use authenticated local Admin "Download full recovery JSON" for complete private recovery.

## Shutdown / not verified
Ctrl+C stops the bot, closes the local bridge and terminates the OCR worker. Do not expose the bridge via LAN/tunnel/reverse proxy.
No real OAuth, browser visual QA, browser image upload, live Discord login or Windows/native Tesseract run has been performed.


## Real browser/OAuth acceptance - still open

Offline desktop tests/config preflight do not close this gate. On the Windows host, use an isolated development Discord application/account; complete OAuth identify sign-in for a participant and an explicitly allowlisted Admin; capture redacted browser screenshots at desktop and narrow viewport sizes. Test Player-only data visibility, direct API denial for non-admins, Admin roster/link/settings/backup operations, synthetic PNG/JPEG upload, OCR review, exact corrections/mapping and shared record visibility through Discord and desktop. Record image SHA-256 and redacted logs. Never share secrets, private screenshots or production state.