# Discord webhook exposure — current-file verification addendum

**Date:** 2026-11-06  
**Repository:** `pbrau014/braultDwBotVis`  
**Reviewed ref:** `main` at `668335ace6a31121ac8640de09d7bbeea9dbbb85`

## Verified current-file state

The current `main` version of `dwbotStuff/scoreReport_dark_clipboard (1).html` was fetched directly from GitHub. Its blob SHA-1 is:

`4e930f9b072fd85568f74779e611ef91f924f334`

A case-sensitive marker scan of the retrieved file found:

| Marker | Present |
|---|---:|
| `discord.com/api/webhooks` | false |
| `discordapp.com/api/webhooks` | false |
| `DISCORD_WEBHOOK_URL` | false |
| `postTextToDiscord` | false |

The fetched current file therefore does not support the older incident report's assertion that the current `main` copy still contains the webhook URL or posting function. This is a correction to the current-state description only; the original report is retained unchanged as historical incident documentation.

## What this does not establish

- It does not prove that the exposed webhook was revoked or deleted in Discord.
- It does not remove the historical secret from prior Git commits, forks, cached clones, mirrors, or external copies.
- It does not establish that no other credential exposure exists elsewhere in the repository.
- The exposed webhook must remain treated as compromised until its owner confirms revocation/deletion in Discord Integrations. Review channel activity for unexpected posts.
- Do not reproduce the secret in reports, logs, comments, or source files.

## Status

Current HTML file: sanitized according to the marker scan above.  
Historical Git exposure: remains a credential-history risk until owner-side revocation and an appropriately scoped history review are complete.  
Credential revocation: NOT VERIFIED.  
Production security acceptance: NOT PASSED.

This addendum is documentation-only. It does not change application code, Git history, Discord configuration, or any Gate A/B artifact.
