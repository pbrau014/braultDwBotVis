---
title: "DWBOT User Manual"
subtitle: "Player and tournament administrator guide"
lang: en
---

```{=typst}
#pagebreak()
```

## Summary

DWBOT supports a World of Warships YOLO tournament through a designated Discord channel and a local browser workspace. Players can view their own tournament totals and standings, submit original battle-result screenshots, and correct uncertain OCR fields; tournament administrators manage the roster, Discord account links, scoring, record review, and private recovery exports. Every accepted battle record must contain the same nine exact fields—result, player, map, mode, battle start, credits, Free XP, damage, and XP—and the bot does not guess missing or conflicting values. The browser interface uses the running local bot service and Discord sign-in; opening the HTML files directly with `file://` is not supported.

```{=typst}
#pagebreak()
```

# General Overview — HTML and Discord Usage and Purpose

## What DWBOT is for

DWBOT keeps the tournament roster, event results, standings, OCR review and recovery state in the existing Node.js bot. The Discord bot and local Player/Admin browser workspace use the same tournament state. The four event categories are Damage, Kills, Race and Grand Yolo. The roster supports up to 50 participants, with seven game slots per event.

## Roles and access

- **Players:** sign in with their linked Discord account, view their own totals and submissions, submit original screenshots, answer exact correction prompts and view public standings.
- **Tournament administrators:** maintain the roster and account links, review OCR submissions, correct/map records, enter results, adjust scoring settings and download the full private recovery archive.
- **Discord members:** use public help, panel, standings and totals commands in the configured tournament channel.

The browser Admin page requires the signed-in account to be in the local `TOURNAMENT_ADMIN_IDS` allowlist. Discord command administration accepts either an ID in that allowlist or the Discord Manage Server permission. These are separate access checks.

## Nine mandatory battle fields

Every accepted OCR record must contain these fields, in this order:

| Field | Meaning |
|---|---|
| `result` | Battle result |
| `player` | Player identity read from the battle screenshot |
| `map` | Battle map |
| `mode` | Battle mode |
| `battleStart` | Battle start date/time |
| `credits` | Credits earned |
| `freeXp` | Free XP earned |
| `damage` | Damage dealt |
| `xp` | XP earned; mandatory ninth field |

A record with a missing, invalid, uncertain or conflicting mandatory field is not ready for tournament mapping. Correct only what the screenshot actually shows. Never change a value to make it match an expected score.

## Before you begin

- Use the designated tournament Discord server and channel; the bot ignores other channels.
- The local browser workspace normally runs at `http://127.0.0.1:8787`.
- Sign in through Discord. Do not open the HTML files directly from the filesystem with `file://`.
- An administrator must link a player account to a roster entry before the Player workspace can show tournament data.
- Submit one original screenshot at a time. Do not submit the same battle twice while its first record is being reviewed.

## Privacy and recovery

Public Discord snapshots and `!yolo export` omit private account links and per-user pending correction associations. The full private recovery JSON is available through the authenticated Admin browser page only. Treat it as sensitive data and never post it in Discord.

# How-to Instructions — Admin Use of the HTML Interface

## Sign in and open Admin

1. Ask the bot operator to start DWBOT with the local desktop bridge enabled and Discord OAuth configured.
2. Open the local address supplied by the operator, normally `http://127.0.0.1:8787`.
3. Select **Continue with Discord** and sign in.
4. Open **Admin**. Access requires your Discord user ID in `TOURNAMENT_ADMIN_IDS`.
5. If access is denied, ask the operator to verify the allowlist. Never share your Discord password, OAuth secret or bot token.

## Manage the roster and account links

- Use **Add player** to create a roster entry with the exact participant name.
- Use **Link account** to connect a roster player to that participant's Discord user ID.
- Use **Unlink** only when an account link must be removed or corrected.
- Check for duplicates before creating an entry. The roster supports up to 50 participants.
- An unlinked participant cannot view tournament data in the Player workspace.

## Enter a result manually

Select the player, event and game number (1–7), then enter ship class and tier. Supply the required metric fields:

- **Damage:** damage.
- **Kills:** kills.
- **Race:** time in seconds.
- **Grand Yolo:** damage, kills and time in seconds.

Use the form only when the source result is known. Review the player, event and game slot before saving.

## Review OCR submissions

1. Open **OCR submissions and approvals**.
2. Review the nine required fields and any missing/conflicting values.
3. Correct a field only from the original screenshot or another authoritative record.
4. Map a fully confirmed record to the correct roster player, event and game slot.
5. If OCR identity does not match the linked participant, leave it in Admin review; do not force a mapping.

## Scoring and private recovery

- Use **Event settings** only when an authorized tournament rule change requires it. The current Grand Yolo default `tierWeight` is 0.9.
- **Download full private recovery JSON** includes Discord account links and pending per-user workflow associations. Store it securely and do not share it publicly.
- Public Discord snapshots intentionally omit those private associations and are not a substitute for the full Admin backup.

# How-to Instructions — Player Participant Use of the HTML Interface

## Sign in and view your tournament

1. Open the local browser address supplied by the tournament operator.
2. Select **Continue with Discord** and sign in with the Discord account linked to your roster entry.
3. The Player page shows your total, estimated value, roster position, event totals, public standings and your own screenshot submissions.
4. If the page says **Account not linked**, ask an administrator to link your account to the correct roster entry.

## Submit a battle screenshot

1. Open **Submit screenshot**.
2. Choose one original PNG, JPEG, WEBP, BMP or TIFF results screenshot, or drop it into the upload area. The maximum size is 25 MB.
3. Check the filename and preview.
4. Select **Submit screenshot for OCR** and wait for the upload/processing response.
5. Open the Player page to review the submission and correction prompts.

Tesseract.js remains the local OCR baseline. If a valid Free OCR.Space key is configured locally, a restricted safe-crop prepass is default-on unless the operator sets `OCRSPACE_ENABLED=0`. Full screenshots, player identity and Discord identifiers are excluded from remote OCR; remote text is diagnostic and does not decide accepted field values.

## Correct and map a submission

- Review each field exactly as shown in the screenshot.
- If a value is missing or uncertain, enter the exact visible value; do not estimate or trim digits.
- A record cannot be mapped until all nine mandatory fields are complete and valid.
- If screenshot identity does not match your linked roster entry, an administrator must review it.
- Do not upload the same screenshot again while its existing record is pending.

## Common issues

- **Account not linked:** ask an administrator to link your account.
- **Upload rejected:** confirm the file type is accepted and the image is no larger than 25 MB.
- **Missing/conflicting field:** use the correction controls and original screenshot.
- **Identity mismatch:** wait for Admin review.
- **Session expired:** refresh the page and sign in again.

# How-to Instructions — Admin Use of Discord

## Use the designated channel

The bot handles tournament commands only in the configured channel. Replies and public-safe snapshots are visible to everyone who can view that channel. If the bot does not respond, ask the operator to check its READY status and channel permissions.

## Read-only and reporting commands

| Command | Purpose |
|---|---|
| `!yolo help` | Show current command help |
| `!yolo panel` | Show the interactive totals, standings, roster and event leaderboard panel |
| `!yolo players` | List roster players and IDs |
| `!yolo player <name or ID>` | Show one player's scores and 28 game slots |
| `!yolo standings [damage|kills|race|grand]` | Show overall or event standings |
| `!yolo totals` | Show aggregate doubloon and estimated dollar totals |
| `!yolo status` | Show filled game slots per player and event |
| `!yolo missing [event] [| player or ID]` | List unfilled game slots |
| `!yolo workbook` or `!yolo download-workbook` | Download the Excel source workbook |
| `!yolo records` | List OCR records waiting for mapping |

## Administrator commands

These require either a Discord ID in `TOURNAMENT_ADMIN_IDS` or Manage Server permission:

| Command | Purpose and caution |
|---|---|
| `!yolo add-player <name>` | Add a roster player |
| `!yolo rename-player <name or ID> | <new name>` | Rename a player without losing scores |
| `!yolo remove-player <name or ID>` | Remove a player from the active roster; historical OCR records remain archived |
| `!yolo result <player> | <event> | <game 1-7> | <DD|CA|BB> | <tier> | <metric>` | Enter an event result; Grand Yolo requires damage, kills and time as the final three values |
| `!yolo settings` | View scoring settings (Admin only) |
| `!yolo setting <event> <field> <number>` | Change a scoring setting |
| `!yolo clear-slot <player> | <event> | <game 1-7>` | Clear one game slot |
| `!yolo clear-event <event> | <player or ALL>` | Clear one event for one player or all players |
| `!yolo clear-results CONFIRM` | Clear all event scores; roster, settings and archived records remain |
| `!yolo map <record ID>` | Restart mapping for an archived OCR record |
| `!yolo snapshot` | Attach a public-safe recovery snapshot; private links and per-user pending associations are omitted |
| `!yolo export` | Attach a public-safe archive; private account links and per-user associations are omitted |
| `!yolo export-workbook` | Export workbook-compatible JSON |
| `!yolo finalize` | Attach a final public-safe snapshot with completion counts; this does not lock the tournament |
| `!yolo import` with a JSON attachment | Restore a backup and replace current tournament state |

**Destructive operations:** `remove-player`, `clear-slot`, `clear-event`, `clear-results CONFIRM` and `import` change or replace tournament data. Verify the target and a current backup before use. Discord backup import accepts JSON up to 10 MB; the 25 MB screenshot limit does not apply to backups.

## Recovery and privacy

Discord snapshot/export commands are public-safe and omit private account links and pending per-user associations. The full private recovery archive is available only from the authenticated Admin browser page. Never attach that private backup to a public Discord message.

# How-to Instructions — Player Participant Use of Discord

## Public tournament information

In the designated channel, players can use:

- `!yolo help` for command help.
- `!yolo panel` for the interactive public panel.
- `!yolo players` to see the roster.
- `!yolo player <name or ID>` for player scores and game slots.
- `!yolo standings` or `!yolo standings damage`, `kills`, `race` or `grand` for standings.
- `!yolo totals` for aggregate totals.
- `!yolo status` and `!yolo missing` for game-slot progress.
- `!yolo workbook` to download the source workbook.

The bot only responds in the configured tournament channel. Public replies and panels are visible to everyone who can view that channel.

## Submit a screenshot in Discord

1. Attach one original battle-result screenshot to a message in the configured channel.
2. Wait for the bot acknowledgement and OCR queue response.
3. If the bot asks for a correction, respond with the exact value visible in the screenshot.
4. Follow mapping prompts for event and game slot after all nine OCR fields are confirmed.
5. Check `!yolo records` if you need to see records awaiting mapping; do not resubmit while processing is in progress.

Unsupported image types and images over the configured size limit are rejected. The default image limit is 25 MB; the operator may lower it but cannot raise it above 25 MB.

## Common issues

- **No response:** confirm you are in the designated channel and that the bot is online.
- **No roster match:** ask an administrator to verify your roster name and account link.
- **Correction pending:** finish the current correction flow before starting another mapping.
- **Wrong or uncertain OCR value:** do not guess; provide the exact screenshot value or ask an administrator to review it.
- **Duplicate warning:** check the existing OCR record before uploading again.
