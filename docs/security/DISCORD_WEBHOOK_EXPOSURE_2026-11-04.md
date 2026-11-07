# Discord webhook exposure and remediation — 2026-11-04

## Finding

A hard-coded Discord webhook URL was present in the public repository file:

`dwbotStuff/scoreReport_dark_clipboard (1).html`

The URL is treated as an exposed credential. It is intentionally not reproduced in this report, logs, code, or follow-up messages.

## Remediation committed to dwbotVis

- Removed the embedded webhook URL assignment from the current version of the HTML file.
- Removed the direct webhook POST function and all references to it.
- Changed OCR completion behavior to keep extracted text local for review, copy and download.
- Preserved the browser OCR and manual export workflow.
- Confirmed the sanitized file no longer contains a Discord webhook URL, `DISCORD_WEBHOOK_URL`, or `postTextToDiscord` reference.
- No request was made to the exposed webhook.

## Required owner action

The webhook owner must revoke/delete the exposed webhook in the Discord channel's Integrations settings. Editing a public file does not invalidate a webhook, and the old value remains in prior Git history. Do not reuse it. If automated delivery is later required, use the DWBOT server-side bot integration with a locally protected bot token—not a webhook URL embedded in browser HTML.

## History and limitations

Repository history was not rewritten. The exposed value may remain in prior Git commits, cached clones, forks, mirrors, and external copies. Current working-tree content is not sufficient to invalidate an exposed webhook. The owner must revoke/delete the webhook in Discord's channel Integrations settings and review channel activity. No webhook request was made by this remediation.

## Verified current-file status — 2026-11-07

The current `main` copy and the current `ocr-multiprovider` copy of `dwbotStuff/scoreReport_dark_clipboard (1).html` were both fetched and found to have the same Git blob SHA-1 (`4e930f9b072fd85568f74779e611ef91f924f334`). The current file contains no webhook URL, `DISCORD_WEBHOOK_URL`, or `postTextToDiscord` reference. A scan of all eight tracked HTML files on `ocr-multiprovider` found no Discord webhook URL, webhook symbol, or bot-token pattern.

This verifies current-file cleanup only; it does not prove the webhook was revoked in Discord or purge historical copies. No changes to `main` were made in this continuation.
