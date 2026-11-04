# grandYoloInstruct

## Governing model
One YOLO tournament system has two formats: Pilot YOLO is a single-evening event; Full YOLO is a multi-week or multi-month season with Regular Season, Postseason and a Grand YOLO Finale. Both formats share participant identity, registration, evidence, scoring validation, referee operations, correction, audit, communication and recovery procedures. Format-specific lifecycle and rules are configured separately.

## Pilot YOLO
Lifecycle: Draft -> Published -> Active Pilot Event -> Complete. It has one event stage and no season. Pilot results do not automatically carry into or seed Full YOLO. Existing individual Damage placement remains unless a different rule is published before signup. Historical seven-game/under-three-hour timing is planning guidance only; organizers must publish actual timing and game count.

## Full YOLO
Lifecycle: Draft -> Published -> Regular Season -> Postseason -> Grand Finale -> Complete. Duration is chosen by organizers and published in weeks/months, dates and timezone. The system must not assume a fixed 12-week season. Registrations, teams, locked rosters, fixtures, matches, games, evidence, cumulative records and bracket progression are separate records from the legacy four individual scoring categories.

## Shared participant rules
Use the exact Discord account linked to the roster entry. Follow the published schedule, ship/map/mode rules and referee instructions. Submit original post-battle evidence. Confirm exact player, result, map, mode, battle start, Credits, Free XP, Damage and XP values. Missing or ambiguous values remain unresolved; never guess, fuzzy-repair, or substitute zero. Corrections require actor, timestamp, reason, before/after values and evidence reference.

## Scoring terminology
Keep these separate: (1) Race score category; (2) positive elapsed-time Race metric where lower seconds are better and normalized value may be 1/seconds; (3) Full YOLO Race side-event; (4) Big Race map; (5) Grand Yolo individual score category; (6) Full YOLO Grand Finale stage. A Race side-event must not silently affect an ordinary match score. Legacy class weights DD=4, CA=3, BB=2; unknown/blank is invalid. Preserve Grand Yolo tierWeight 0.9 pending canonical workbook reconciliation. The legacy 0.54*score/100 display is not a verified cash/prize conversion.

## Full match outcomes
Before Full YOLO publication, require a named, versioned, approved and published method for aggregating applicable individual performance metrics (including Damage/Kills), with weights, aggregation, rounding and differential rules. Do not substitute raw W/L or a single player score. Tie-break order: head-to-head; record among tied teams; predeclared team metric/point differential; deciding game if feasible and published; auditable random draw only when expressly authorized. If unresolved, block advancement.

## Operations and change control
Before signup publish eligibility, registration close, roster lock, schedule, timezone, game count, ships/maps/modes, scoring, tie-breaks, awards, dispute window and referee authority. Verify game-client mode labels and restrictions before announcement. Freeze ordinary settings at stage/event start; changes apply only to future/unplayed games. Emergency actions require reason, scope, approver, time, affected games and participant notice/review. Every material mutation is auditable.

## Unresolved organizer decisions
Do not invent Pilot/Full dates, exact duration, team size, human/bot composition, ship allowlist/bans, maps, modes, special armor-mode availability, match-outcome weights, qualification/bracket rules, substitute/forfeit/bye/no-show/withdrawal policy, appeal window, prizes, approver names or publication times. Mark required unknowns as blockers before publication.

## Desktop and Discord
Players see only their linked records and may register for available events. Admin actions are authorized server-side. Quick help works on mouse hover and keyboard focus; essential instructions remain visible/accessibly described. Discord permissions, scheduled events, channel visibility and live commands require isolated development-guild testing. Do not enable slash commands or alter privacy/channel scope before that gate.

## Production gates
NO-GO until automated tests, migration/restore, format lifecycle, tie-break, workbook parity against the designated canonical workbook, Windows OCR/current screenshot acceptance, local OAuth/browser/upload, isolated live Discord, organizer approvals, rendered DOCX/PDF, and clean extraction pass. Linux/offline CI cannot certify Windows, game-client, browser or live Discord behavior. Record every gate as NOT RUN, PASS, FAIL or BLOCKED with evidence.

## Provenance and current limits
Legacy version-2 score data is preserved and not retroactively assigned a format. The designated canonical workbook and canonical Score Reporter HTML were absent from the audited Library; the repository workbook is not proven canonical. Workbook formula edits remain blocked until the designated source is identified. This document is an implementation baseline, not a signed event publication.
