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

Repository history was not rewritten. This preserves existing commits and avoids a force-push to the authorized delivery branch. This remediation only removes the credential from the current branch file; it does not purge previous commits, cached clones, forks, mirrors or external copies. The owner should revoke the webhook promptly and review Discord channel activity for unexpected posts.
