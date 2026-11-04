# Isolated DWBOT live Discord test quickstart

Run only with a separate development bot, isolated test guild and one designated test channel. Do not use a production tournament.

## Prepare Discord

Create/designate a development bot. Enable the **Message Content Intent**. Invite it to the test guild and grant the one test channel only: View Channel, Send Messages and Attach Files. Record the test guild/channel IDs, one authorized test-admin ID, and one ordinary participant ID. The participant must not have Manage Server and must not be on the bot's admin allowlist.

## Configure locally

From the project directory on the Windows test host:

```powershell
Copy-Item .env.discord-test.example .env
notepad .env
```

Fill the placeholders locally. Put the test admin's ID in `TOURNAMENT_ADMIN_IDS`. Keep storage isolated:

```dotenv
NODE_ENV=development
TOURNAMENT_STORAGE=json
TOURNAMENT_STATE_PATH=./testdata/live-discord-state/tournament-state.json
TOURNAMENT_SQLITE_PATH=./testdata/live-discord-state/tournament-state.sqlite
ENABLE_SLASH_COMMANDS=0
OCRSPACE_ENABLED=0
PADDLEOCR_FIELD_FALLBACK=0
OCR_CV_ASSIST=0
```

Do not paste the token into chat or commit `.env`. It is excluded by the repository ignore rules.

## Restore and test

First run the credential-free Discord channel-preflight unit tests:

```powershell
npm run test:discord-preflight
```

After dependencies are restored and the local `.env` is configured, run the offline configuration check:

```powershell
npm run preflight:discord-test
```

It checks development/test mode, non-placeholder token presence without printing it, channel/admin snowflake syntax, JSON storage, state-path containment under `testdata/live-discord-state`, distinct state paths, and disabled slash/experimental provider flags. It makes no network request and cannot verify token validity, Developer Portal intent toggles, or actual Discord permissions.

Use Node v22.16.0, pinned by `.nvmrc`:

```powershell
node --version
npm --version
npm ci
npm ls --depth=0
npm test
```

Do not start the live bot until dependency installation and the test suite complete successfully. Capture full logs and exit codes.

## Verify login

```powershell
npm start
```

Observe `[Discord Gateway] READY as ...` with the expected bot user ID, then `[Discord preflight] PASS` with the expected test guild/channel and permissions, followed by the storage selection and online-success line. Confirm the bot identity in the test guild. A configured token or a resolved `client.login()` alone is not evidence of a READY pass. If the channel preflight fails, startup closes storage and the Discord client and exits with a non-zero status; correct the channel/permissions before retrying.

## Verify permissions

In the one configured test channel:
1. As the participant, run `!yolo help`, `!yolo standings`, and `!yolo totals`; they should respond.
2. As the test admin, run the harmless read-only admin command `!yolo settings`.
3. As the participant, try both `!yolo settings` and `!yolo add-player Live Test Must Be Denied`; both must be rejected and must not change settings or the roster.
4. In another channel, run `!yolo totals`; the bot must ignore it.

Record actor role, channel, command, response and an isolated before/after state export. Avoid destructive tests.

## Verify attachment and processing

As the test participant, upload one harmless synthetic/non-sensitive PNG or JPG in the configured channel. Save the original file hash, message URL/ID from the test guild, acknowledgement, queue status, report and structured battle-record JSON. Confirm all nine required fields remain exact and unresolved fields are corrected one at a time. Test an unsupported file type; it must be rejected without changing scores. Do not submit the same record twice.

## Verify restart

Run a harmless query and export the isolated state. Stop with Ctrl+C and save the shutdown log/exit code. Run `npm start` again, verify Ready, repeat `!yolo standings` or `!yolo totals`, and compare the state/export. Record any duplicate messages, lost records or recovery prompts.

## Rate limits

Never flood Discord or deliberately trigger a global limit. A mocked 429 test is simulated, not live. A live PASS requires a naturally observed or approved controlled 429/retry event, observed backoff and recovery, and no duplicate state update. No live 429 has been observed in the current checkpoint.

## Return for review

Provide redacted `npm ci`/`npm test` logs and exit codes; runtime version; bot Ready/start/stop logs; screenshots or transcripts of admin/participant and wrong-channel behavior; synthetic attachment metadata/hash and resulting report JSON; before/after state exports; and any error/retry/recovery logs. Do not provide `.env`, tokens, webhook URLs, private screenshots or real tournament databases.

## Gateway lifecycle evidence (required)

The bot uses discord.js to own the Gateway heartbeat, reconnect and session-resume protocol. Do not add a second raw WebSocket heartbeat/reconnect loop beside discord.js.

A live connection PASS requires all of the following evidence from the same test run:

1. A `[Discord Gateway] READY` line showing the expected bot tag and bot user ID. `client.login()` resolving or a token being configured is not a READY pass.
2. A `[Discord preflight] PASS` line showing the expected test guild ID, target channel name/ID, and required channel permissions. The preflight is read-only and sends no test message.
3. If a disconnect occurs during the test, preserve the shard disconnect code/reason and subsequent reconnect/resume or fresh READY log. A resume is not a fresh READY event; record the actual event.
4. A clean Ctrl+C shutdown and subsequent fresh READY after restart, followed by an unchanged state/export check.

The runtime preflight checks a sendable guild text channel and the bot's `ViewChannel`, `SendMessages` (or `SendMessagesInThreads` for a thread), and `AttachFiles` permissions. Read Message History is not required by the current bot's configured-channel workflow and should not be granted unless a separately reviewed feature needs it. The bot does not request Guild Members or Presence intents. It requests Guilds, Guild Messages, and Message Content; Message Content must be enabled in the Developer Portal for prefix commands and attachment metadata/content to be available.

Gateway event limits and HTTP REST rate limits are distinct. Do not flood either surface. Capture naturally occurring retry/backoff logs; a mocked 429 remains simulated evidence only.


## Discord reference material reviewed

- Gateway lifecycle, READY, intents, resume and Gateway rate limits: https://docs.discord.com/developers/events/gateway
- Message Content privileged intent: https://docs.discord.com/developers/events/gateway#message-content-intent
- Message object behavior when Message Content is unavailable: https://docs.discord.com/developers/resources/message
- discord.js 14.27 Client events and shard lifecycle events: https://discordjs.dev/docs/packages/discord.js/14.27.0/Client%3AClass
- Application commands and guild-scoped testing: https://docs.discord.com/developers/interactions/application-commands
- HTTP REST rate limits and 429 handling: https://docs.discord.com/developers/topics/rate-limits

The bot requests Guilds, Guild Messages and Message Content. Message Content is privileged and must be enabled in the Developer Portal. The bot does not request Guild Members or Guild Presences. Gateway event limits are not the same as REST API limits; do not intentionally flood either. Discord also documents a global IDENTIFY limit, so avoid repeated restart loops.


## REST API rate-limit handling

Discord HTTP REST limits are separate from Gateway event limits. The bot now observes discord.js REST `rateLimited` events and logs only the HTTP method, normalized route, scope, global flag and retry delay in milliseconds. It does not log authorization headers, bot tokens, request bodies or full URLs.

Do not hard-code Discord route limits. Discord recommends following dynamic response headers and the `Retry-After` header or `retry_after` response field for 429 responses. The existing discord.js REST manager owns request scheduling; DWBOT does not add a second retry loop. A live 429 is not required to run this test, and must not be deliberately induced against a real bot.


The current Discord documentation lists up to 120 Gateway events per connection per 60 seconds and a global 1,000 IDENTIFY calls per 24 hours across shards. Do not create restart loops or attempt to test these limits. For HTTP REST requests, Discord publishes a 50 requests/second global bot limit plus dynamic per-route/shared buckets; do not hard-code route limits. On 429, use the documented `Retry-After` header or `retry_after` field. discord.js REST is responsible for its own queue/backoff.


---

## Desktop interface pre-live setup

The bridge is integrated into the bot process and disabled by default. Use a separate development bot/guild/channel. Add variables from .env.desktop.example to the existing .env; do not overwrite bot settings:

ENABLE_DESKTOP_UI=1
DESKTOP_UI_PORT=8787
DISCORD_OAUTH_CLIENT_ID
DISCORD_OAUTH_CLIENT_SECRET
DISCORD_OAUTH_REDIRECT_URI=http://127.0.0.1:8787/auth/discord/callback
TOURNAMENT_ADMIN_IDS (comma-separated explicit admin IDs)
ENABLE_SLASH_COMMANDS=0

Configure the exact redirect in Discord OAuth2. Scope identify only. Never commit or paste the OAuth secret or bot token.

Run from project root:
node --version
npm ci
npm run preflight:desktop-test
npm run test:prelive
npm test

Run npm start. The bridge starts only after Discord READY and channel preflight, and listens on http://127.0.0.1:8787. Admin links participant Discord IDs to roster entries. Players see only their own submissions and may map only an exact OCR identity match.

Use synthetic/non-sensitive images. One image per upload; PNG/JPEG/WEBP/BMP/TIFF; max 10 MB. Desktop upload uses the same OCR queue as Discord attachments. No real OAuth or browser upload has been performed in this session.

For complete private recovery use the authenticated local Admin download. Public channel exports intentionally omit private account links and per-user pending workflow identifiers.


## Current release-gate status - explicit

This guide is a test procedure, not evidence that live testing has occurred. Isolated development-guild verification remains OPEN until READY, effective channel permissions, participant/admin allow-deny, wrong-channel ignore, synthetic attachment, exact nine-field correction/mapping, stop/start and state recovery are captured from the same real run. Windows runtime/persistence and native-Tesseract acceptance are separate gates. Do not test on a production tournament or deliberately flood Discord.