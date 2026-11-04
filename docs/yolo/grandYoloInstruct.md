# grandYoloInstruct
## Pilot and Full YOLO Tournament System
Implementation baseline - organizer publication required

### 1. Governing model
One YOLO tournament system supports two formats. Pilot YOLO is a single-evening event. Full YOLO is a multi-week or multi-month season with Regular Season, Postseason and Grand YOLO Finale. Common participant and operational procedures are shared; lifecycle and published rules differ by format.

### 2. Pilot YOLO
Lifecycle: Draft -> Published -> Active Pilot Event -> Complete. Pilot has one event stage and no season carryover. Pilot results do not automatically seed Full YOLO. Historical guidance of roughly seven games and under three hours is planning context, not a mandatory limit. Organizers must publish date, start/end, timezone, entry close, lineup lock, game count, map/mode/ship restrictions, prizes and dispute policy before signup.

### 3. Full YOLO
Lifecycle: Draft -> Published -> Regular Season -> Postseason -> Grand Finale -> Complete. Organizers choose duration, dates, cadence, roster rules, qualification, bracket and finale format. Do not assume a fixed 12-week season. Registrations, teams, locked rosters, fixtures, matches, games, evidence, cumulative records and bracket progression are separate entities from legacy individual score categories.

### 4. Shared participant requirements
Use the exact Discord account linked to the roster entry. Follow the published schedule and rules. Submit original post-battle evidence. Corrections must retain before/after values, actor, timestamp, reason and evidence reference.

The nine OCR fields remain mandatory and in exact order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. Missing, ambiguous or illegible values remain unresolved. Never guess, fuzzy-repair, or substitute zero. Training Room battles may not produce economy rewards; this does not authorize fabricated Credits/XP values or weakened validation. Establish screenshot-type-specific evidence policy from current-client tests.

### 5. Scoring terminology
Keep separate: Race score category; positive elapsed-time Race metric; Full YOLO Race side-event; Big Race map; Grand Yolo individual score category; Grand YOLO Finale stage. Race elapsed time must be positive; lower seconds is better; normalized metric may be 1 / elapsed_seconds. Side-event totals must not silently affect ordinary match outcomes. Ship weights: DD=4, CA=3, BB=2. Unknown/blank class is invalid, not zero. Preserve Grand Yolo tierWeight 0.9 pending canonical workbook reconciliation. The historical 0.54 x score / 100 display is not a verified cash/prize conversion.

### 6. Full match outcomes and tie-breaks
Before Full YOLO publication, require a named, versioned, approved and published method for aggregating applicable individual metrics, including Damage and Kills. Publish weights, aggregation, rounding and point-differential rules. Do not substitute raw wins/losses or one individual score. Tie-break order: (1) head-to-head outcome; (2) record among tied teams; (3) predeclared team metric/point differential; (4) extra deciding game if feasible and published; (5) auditable random draw only when expressly authorized. If no authorized tie-break resolves a tie, advancement is blocked.

### 7. Registration, teams and roster locks
Registration must reference an existing stable tournament player ID and exact linked Discord identity. Duplicate active registration is rejected. Team membership requires active registration. Lock rosters before fixtures and play. A game must identify a player on the locked roster and retain an evidence hash. Withdrawals, substitutes, forfeits, byes, no-shows, disqualifications and appeals must follow published event rules. A locked roster cannot be silently edited.

### 8. Evidence, OCR and corrections
Original screenshot bytes are immutable evidence identified by SHA-256, size, media type and capture time. OCR is a proposal, not authority. If a field is missing, illegible, ambiguous or not produced by that battle type, retain unresolved state and require a published exception or alternative proof approved by the organizer. Do not alter the OCR contract silently.

### 9. Settings freeze, audit and appeals
Freeze ordinary scoring/gameplay settings at event or stage start. Changes apply prospectively to future/unplayed games only. Emergency safety, security or platform actions require reason, scope, approver, timestamp, affected games and participant notice/review. Record registrations, roster changes, fixtures, results, corrections, forfeits, tie-breaks, setting changes, publication and stage transitions in an audit log.

### 10. Desktop and Discord
The desktop app is the local Player/Admin interface. Players see only their linked records. Administrators create/publish tournaments, manage rosters, schedule fixtures, review evidence and export recovery data. Every mutation is re-authorized server-side. Quick-help tips must work on mouse hover and keyboard focus; essential instructions remain visible or accessible without hover. Discord permissions, scheduled events, channel visibility and live commands require isolated development-guild testing.

### 11. Organizer publication checklist
Required approvals not to be invented: Pilot date/time/timezone/entry close/lineup lock/game count; Full duration/dates/cadence/stage boundaries; team size and human/bot composition; ship allowlist/bans/tiers/maps/modes; verified current-client special-mode label; match-outcome weights/aggregation/rounding/qualification; substitute/forfeit/bye/no-show/withdrawal and appeal policy; prizes; approver names and publication times. A blank or unapproved value blocks publication where it affects eligibility, scoring, safety, outcomes or awards.

### 12. Production release gates
Production is NO-GO until automated unit/integration/migration/backup/restore/security tests pass; legacy scores/settings/links/battle records/pending OCR work survive migration; Pilot and Full lifecycle/tie-break tests pass; workbook parity is reconciled against the designated canonical workbook; Windows OCR/current screenshot acceptance passes with native Tesseract; local OAuth/browser visual/upload tests pass; isolated development-guild Discord smoke passes; organizer checklist is signed; and DOCX/PDF/HTML/TXT plus clean extraction are inspected and verified. Linux/offline CI cannot certify Windows, current game-client, browser, live Discord or organizer approval.

### 13. Provenance and implementation limits
Legacy version-2 score data is preserved and not retroactively assigned to Pilot or Full. The designated canonical scoring workbook and Score Reporter HTML were absent from the audited Library. The repository workbook is not proven canonical; workbook formula changes remain blocked until the designated source is identified. This manual is an implementation baseline, not a signed event publication. Amend append-only with version, date, approver, affected sections, reason, test evidence and effective scope.
