# DWBOT Iteration 21 patch overlay

Date: 2026-10-26
Base: `YoloDiscordBotV4.zip` (project version 2.5.0 / iteration 20)

## Purpose

This is a **source overlay patch**, not a complete application or a production release. Apply it only to the exact V4 source tree identified below, after making a backup. It corrects the OCR acceptance contract so the eight mandatory battle fields determine record completeness while XP remains optional; it also rejects Unicode replacement characters in OCR/manual field values and adds corrected metrics/reporting.

## Exact base archive

`YoloDiscordBotV4.zip` SHA-256: `b57942298f9d1405946f2eadf249ece94cf1cde05131172e44d0a4cd51099899`

## Apply

1. Preserve the original ZIP and make a working copy of its `wows-yolo-tournament-discord-bot` project directory.
2. Extract this overlay into that project directory, preserving relative paths and allowing the files to overwrite the same-named files.
3. Run `npm ci`, then `npm test` with Node.js 24.x on the target Windows host.
4. Do **not** treat this overlay as permission to deploy. The Windows OCR acceptance sequence, independent holdout, Discord staging, and restore rehearsal remain open gates.

## Contents

- 18 modified existing project files
- 3 new iteration-21 evidence/report files
- SHA-256 manifest for all overlay files

## Explicit exclusions

No `node_modules`, `.env`, Discord token, database, live tournament data, OCR model installer, nested ZIP, or deployment configuration is included. The four synthetic validation JSON files are unchanged from the base archive and are not part of this patch.

## Validation

The isolated working copy passed all 178 automated tests (0 failed, 0 skipped) using Node.js v24.17.0 on Linux, and all nine modified JavaScript files passed `node --check`. The smoke run of a real screenshot OCR sequence in this Linux sandbox timed out and did not produce a report; it is not counted as passed. Target-Windows validation remains mandatory.
