# Isolated DWBOT live Discord test quickstart

Run only with a separate development bot, isolated test guild and one designated test channel. Do not use a production tournament.

## Prepare Discord

Create/designate a development bot. Enable the **Message Content Intent**. Invite it to the test guild and grant the one test channel only: View Channel, Read Message History, Send Messages and Attach Files. Record the test guild/channel IDs, one authorized test-admin ID, and one ordinary participant ID. The participant must not have Manage Server and must not be on the bot's admin allowlist.

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

Observe `Logged in as ...`, the expected test channel, storage selection, and `The bot is online.` Confirm the bot identity in the test guild. A configured token alone is not evidence of a login pass.

## Verify permissions

In the one configured test channel:
1. As the participant, run `!yolo help`, `!yolo standings`, and `!yolo totals`; they should respond.
2. As the test admin, run a harmless read-only admin command such as `!yolo settings`.
3. As the participant, try `!yolo add-player Live Test Must Be Denied`; it must be rejected and must not change the roster.
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

The runtime preflight checks a sendable guild text channel and the bot's `ViewChannel`, `SendMessages` (or `SendMessagesInThreads` for a thread), and `AttachFiles` permissions. The bot does not request Guild Members or Presence intents. It requests Guilds, Guild Messages, and Message Content; Message Content must be enabled in the Developer Portal for prefix commands and attachment metadata/content to be available.

Gateway event limits and HTTP REST rate limits are distinct. Do not flood either surface. Capture naturally occurring retry/backoff logs; a mocked 429 remains simulated evidence only.
