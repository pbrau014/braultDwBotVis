# grandYoloInstruct
## Pilot and Full YOLO Tournament System
**Implementation baseline - event-specific publication remains subject to organizer approval.**

## Governing model

One YOLO tournament system has two formats: Pilot YOLO is a single-evening event; Full YOLO is a multi-week or multi-month season with Regular Season, Postseason and Grand YOLO Finale. Both formats share participant identity, registration, evidence, scoring validation, referee operations, correction, audit, communication and recovery procedures. Format-specific lifecycle and rules are configured separately.

## Pilot YOLO

Lifecycle: Draft -> Published -> Active Pilot Event -> Complete. Pilot has one event stage and no season carryover. Pilot results do not automatically seed Full YOLO. Existing individual Damage placement remains unless a different rule is published before signup.

Historic guidance describes roughly seven games and an event under three hours. These are planning references, not fixed limits. Organizers must publish the actual start/end, timezone, entry close, final lineup lock, game count, map/mode/ship restrictions, prizes and dispute policy.

## Full YOLO

Lifecycle: Draft -> Published -> Regular Season -> Postseason -> Grand Finale -> Complete. Organizers choose and publish the season duration in weeks or months, dates, cadence, timezone, roster policy, qualification and bracket rules. The system must not assume a fixed 12-week season.

Registrations, teams, locked rosters, fixtures, matches, games, evidence, cumulative records and bracket progression are separate records from the legacy four individual scoring categories.

## Shared participant requirements

Use the exact Discord account linked to the roster entry. Follow the published schedule, ship/map/mode rules and referee instructions. Submit original post-battle evidence.

The nine exact OCR fields remain mandatory: result, player, map, mode, battleStart, credits, freeXp, damage and xp. Missing, ambiguous or illegible values remain unresolved. Never guess, fuzzy-repair or substitute zero. Corrections retain before/after values, actor, timestamp, reason and evidence reference.

A Training Room battle may not produce economy rewards. That is not permission to fabricate Credits/XP values or weaken validation. Establish the correct evidence policy for each screenshot type from current-client evidence before accepting it.

## Scoring terminology

Keep separate: Race score category; positive elapsed-time Race metric; Full YOLO Race side-event; Big Race map; Grand Yolo individual score category; and Grand YOLO Finale stage.

Race elapsed time must be positive; lower seconds is better. A normalized metric may be 1 / elapsed_seconds. Race side-event totals must not silently affect ordinary match outcomes. Ship weights: DD=4, CA=3, BB=2. Unknown/blank class is invalid, not zero.

Preserve the historical Grand Yolo tierWeight default of 0.9 pending canonical workbook reconciliation. The legacy 0.54 x score / 100 display is not a verified cash or prize conversion.

## Full match outcomes and tie-breaks

Before Full YOLO publication, require a named, versioned, approved and published method for aggregating applicable individual performance metrics (including Damage and Kills). Publish weights, aggregation, rounding and point-differential rules. Do not substitute raw wins/losses or one individual score.

Tie-break order: (1) head-to-head outcome; (2) record among tied teams; (3) predeclared team metric/point differential; (4) extra deciding game if feasible and published; (5) auditable random draw only when expressly authorized. If no authorized tie-breaker resolves a tie, advancement is blocked.

## Registration, teams and roster locks

Each registration attaches to an existing tournament player ID and exact linked Discord identity. Duplicate active registration is rejected. Team membership requires active registration. Close registration before locking rosters; lock rosters before fixtures and play. A game result must identify a player on the locked roster of the recorded team and retain an evidence reference.

Withdrawals, substitutes, forfeits, byes, no-shows, disqualifications and roster replacement rules must be published for the specific event. Forfeits require a declared winner, reason and evidence. Do not infer policy from anecdotal historical practice.

## Evidence, OCR and corrections

Original screenshot bytes are immutable evidence identified by SHA-256, size, content type and capture time. OCR is a proposal, not authoritative evidence. The exact nine-field contract remains in force.

If a field is missing, illegible, ambiguous or not produced by that battle type, retain an unresolved state and require a published evidence exception or alternative proof approved by the organizer. Do not silently alter the OCR acceptance contract.

## Settings freeze, audit and appeals

At event/stage start, freeze ordinary scoring and gameplay settings. Changes apply prospectively to future/unplayed games only. Emergency safety, security or platform actions require reason, scope, approver, timestamp, affected games and participant notice/review.

Every registration, roster change, fixture, match result, correction, forfeit, tie-break, setting change, publication and stage transition must be auditable. Publish a dispute window and appeal authority before the event; historical sources do not establish one universal appeal duration.

## Desktop and Discord

The desktop app is the local Player/Admin interface. Players see only their linked records and may register for available events. Administrators create/publish tournaments, manage registrations/teams, schedule fixtures, review evidence and export recovery data. Every mutation is re-authorized server-side.

Quick-help tips work on mouse hover and keyboard focus; essential instructions remain available in visible text or accessible descriptions. Discord permissions, scheduled events, channel visibility and live commands require isolated development-guild testing. Do not enable slash commands or change channel privacy before that gate.

## Organizer publication checklist

Required approvals not to be invented: Pilot date/start/end/timezone/entry close/lineup lock/game count; Full duration/dates/cadence/stage boundaries; team size and human/bot composition; ship allowlist/bans/tiers/maps/modes; verified current-client special-mode label; match-outcome weights/aggregation/rounding/qualification; substitute/forfeit/bye/no-show/withdrawal and appeal policy; prizes; approver names and publication times.

A blank or unapproved value blocks publication where it affects eligibility, scoring, match outcomes, safety or awards.

## Production release gates

Production is NO-GO until automated unit/integration/migration/backup/restore/security tests pass; legacy scores, settings, links, battle records and pending OCR work survive migration; Pilot and Full lifecycle/tie-break tests pass; workbook parity is reconciled against the designated canonical workbook; Windows OCR/current screenshot acceptance passes with native Tesseract; local OAuth/browser visual/upload tests pass; isolated development-guild Discord smoke passes; organizer checklist is signed; DOCX/PDF/HTML/TXT are rendered and inspected; and clean extraction/restore is verified.

Linux/offline CI cannot certify Windows, current game-client, browser, live Discord or organizer approval. Record every gate as NOT RUN, PASS, FAIL or BLOCKED with evidence and timestamp.

## Provenance and implementation limits

Legacy version-2 score data is preserved and not retroactively assigned to Pilot or Full. The designated canonical scoring workbook and canonical Score Reporter HTML were absent from the audited Library. The repository workbook is not proven canonical, so workbook formula changes remain blocked until the designated source is identified.

This manual is an implementation baseline, not a signed event publication. Add append-only amendments with version, date, approver, affected sections, reason, test evidence and effective scope.
