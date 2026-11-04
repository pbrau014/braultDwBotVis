# grandYoloInstruct
## Pilot and Full YOLO Tournament System
**Implementation and operations manual - organizer publication required**

Revision: 1.1
Status: lifecycle foundation implemented; desktop lifecycle controls and final production gates remain open.

## 1. Governing model

One YOLO tournament system supports two formats:

- **Pilot YOLO** is a single-evening event with attendance/lineup check-in, individual Damage placement and no automatic season carryover.
- **Full YOLO** is an organizer-defined multi-week or multi-month season with Regular Season, Postseason and Grand YOLO Finale.

The formats share participant identity, evidence, OCR validation, referee review, correction, audit, communication and recovery procedures. They do not share the same lifecycle. The four legacy individual score categories remain separate from season stages and team match records.

## 2. Pilot YOLO

Lifecycle: Draft -> Published -> Active Pilot Event -> Complete.

Pilot has one event stage, not a season. Pilot attendance is checked in against an existing linked Discord roster identity; it is not Full-season registration. Each individual result records player ID, game number, ship class/tier, Damage and an original screenshot evidence SHA-256. Duplicate player/game slots are rejected. Individual standings aggregate recorded Damage. Pilot results do not automatically seed Full YOLO.

Before publication, organizers must provide the event title, timezone, start/end, entry close, lineup lock, game count, map/mode/ship policies, award/prize policy, dispute policy and an approved rules version/hash. Entry close must be no later than lineup lock, which must be no later than event start. The event must fit within a single 24-hour period. Historical guidance of roughly seven games and under three hours is context, not a mandatory limit.

## 3. Full YOLO

Lifecycle: Draft -> Published -> Regular Season -> Postseason -> Grand YOLO Finale -> Complete.

Organizers choose and publish the season duration in weeks or months, cadence, timezone and separate non-overlapping date windows for all three stages. Do not assume a fixed 12-week season. Full YOLO uses distinct records for registration, teams, locked rosters, event nights, fixtures, games, evidence, verified match outcomes, Race side-events and progression.

Full publication requires a named, versioned, approved match-outcome method with a SHA-256 hash, plus team/roster, qualification, tie-break, finale and dispute policies. Every event night must fall within its published stage window. Each fixture must reference an event night in the current stage and fit inside that night's time window.

## 4. Shared participant requirements

Use the exact Discord account linked to the tournament roster entry. Follow the published schedule and referee instructions. Submit original post-battle evidence. A player must be on the locked team roster for a Full YOLO fixture game.

The nine mandatory OCR fields remain in exact order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. Missing, ambiguous or illegible values remain unresolved. Never guess, fuzzy-repair, or substitute zero. Corrections retain before/after values, actor, timestamp, reason and evidence reference.

Training Room battles may not produce economy rewards. That does not authorize fabricated Credits/XP values or weakened validation. Establish screenshot-type-specific evidence policy from current-client evidence before accepting it.

## 5. Scoring terminology and boundaries

Keep separate:
- legacy Race individual score category;
- positive elapsed-time Race metric;
- Full YOLO recurring Race side-event;
- Big Race map;
- legacy Grand Yolo individual score category;
- Grand YOLO Finale stage.

Race elapsed time must be positive seconds; lower elapsed time is better. A normalized metric may be (1 / elapsedSeconds). Race side-event totals are recorded in their own ledger and do not silently affect ordinary match outcomes.

Ship weights remain DD=4, CA=3, BB=2. Unknown/blank class is invalid, not zero. Preserve the historical Grand Yolo tierWeight default of 0.9 pending canonical workbook reconciliation. The legacy 0.54 x score / 100 display is not a verified cash or prize conversion.

## 6. Full match outcomes and tie-breaks

Before Full YOLO publication, require a named, versioned, approved and published method for aggregating applicable individual metrics, including Damage and Kills. Publish weights, aggregation, rounding, point differential and qualification rules. Do not substitute raw wins/losses or one individual score.

A fixture can be completed only with a verified outcome that references the exact published method ID, version and hash, names one of the fixture teams as winner, and includes evidence. Stage advancement requires a separate approved qualification report using the same published method and evidence reference. The lifecycle module records this approval; it does not invent or calculate an unapproved scoring formula.

Tie-break order: (1) head-to-head outcome; (2) record among tied teams; (3) predeclared team metric/point differential; (4) extra deciding game if feasible and published; (5) auditable random draw only when expressly authorized. If no authorized tie-break resolves a tie, advancement is blocked.

## 7. Registration, teams and roster locks

Full registration attaches to an existing player ID and a verified linked Discord identity. Duplicate active registration is rejected. Team assignment requires active registration. Lock rosters before fixtures and play. A game must identify a player on the locked roster of the recorded team and reference an archived screenshot evidence record.

Pilot uses attendance check-in rather than Full-season registration. Pilot check-in also requires an existing linked Discord identity. Locked-roster withdrawals cannot silently edit the roster; an organizer-approved substitute or forfeit resolution is required.

## 8. Race side-event

A Full YOLO Race side-event schedule is a separately approved record. It requires an occurrence label, start/end window, map reference and named organizer approval. Individual results require an active Full registration, positive elapsed seconds, a reference to the approved side-event schedule and archived screenshot evidence. The suggested weeks 3/6/9/finale template is not automatic; organizers must ratify the schedule for the actual season. Keep the side-event map reference distinct from the ordinary Race category.

## 9. Discord lifecycle commands

Public discovery:
- `!yolo formats` - explains Pilot and Full formats.
- `!yolo lifecycle` - lists configured lifecycle tournaments.
- `!yolo lifecycle-register <tournament ID>` - self-registers a linked identity for Full YOLO.
- `!yolo lifecycle-checkin <tournament ID>` - checks in a linked identity for Pilot YOLO.

Administrator-only lifecycle actions:
- `!yolo lifecycle-create` with a JSON object.
- `!yolo lifecycle-publish` with a JSON object containing organizer approval.
- `!yolo lifecycle-start <tournament ID>`.
- `!yolo lifecycle-team`, `lifecycle-assign`, `lifecycle-lock`.
- `!yolo lifecycle-night`, `lifecycle-fixture`, `lifecycle-game`.
- `!yolo lifecycle-complete-fixture`, `lifecycle-resolve`, `lifecycle-stage`.
- `!yolo lifecycle-pilot-result`, `lifecycle-race-schedule`, `lifecycle-race`.
- `!yolo lifecycle-finish <tournament ID>`.

The JSON command interface is an initial operations surface, not a guided UI. Commands must be run in the configured DWBOT channel. Organizer mutations are admin-gated. Participant registration/check-in resolves the sender's Discord ID against the existing linked roster. Evidence arguments reference an archived battle record ID; the bot resolves its stored original-source SHA-256 rather than accepting a typed hash.

### 9.1 Create a Pilot draft

```json
{
  "title": "[PILOT EVENT TITLE]",
  "format": "pilot",
  "settings": {
    "timezone": "[IANA TIMEZONE]",
    "startAt": "[ISO DATETIME WITH OFFSET]",
    "endAt": "[ISO DATETIME WITH OFFSET]",
    "entryClosesAt": "[ISO DATETIME WITH OFFSET]",
    "lineupLocksAt": "[ISO DATETIME WITH OFFSET]",
    "gameCount": 7,
    "mapPolicy": "[APPROVED MAP POLICY]",
    "modePolicy": "[VERIFIED MODE POLICY]",
    "shipPolicy": "[APPROVED SHIP POLICY]",
    "prizePolicy": "[APPROVED AWARDS]",
    "disputePolicy": "[APPROVED REVIEW POLICY]"
  }
}
```

Run `!yolo lifecycle-create` followed by that JSON object. Replace every bracketed placeholder with approved values. Seven games is an example only; set the actual approved game count.

### 9.2 Create a Full YOLO draft

```json
{
  "title": "[SEASON TITLE]",
  "format": "full",
  "settings": {
    "timezone": "[IANA TIMEZONE]",
    "duration": "8 weeks",
    "cadence": "[WEEKLY OR APPROVED CADENCE]",
    "regularSeasonStart": "[ISO DATETIME]",
    "regularSeasonEnd": "[ISO DATETIME]",
    "postseasonStart": "[ISO DATETIME]",
    "postseasonEnd": "[ISO DATETIME]",
    "finaleStart": "[ISO DATETIME]",
    "finaleEnd": "[ISO DATETIME]",
    "postseasonPolicy": "[APPROVED QUALIFICATION AND BRACKET]",
    "finalePolicy": "[APPROVED GRAND FINALE FORMAT]",
    "teamPolicy": "[APPROVED TEAM AND ROSTER POLICY]",
    "matchOutcomeMethodId": "[METHOD ID]",
    "matchOutcomeMethodVersion": "[METHOD VERSION]",
    "matchOutcomeMethodHash": "[64-CHARACTER SHA-256]",
    "tieBreakPolicy": "[APPROVED TIE-BREAK POLICY]",
    "disputePolicy": "[APPROVED REVIEW POLICY]"
  }
}
```

The duration must be a positive number of weeks or months. Stage windows must be chronological and non-overlapping. The example duration is not a default season length.

### 9.3 Publish a draft

```json
{
  "tournamentId": "[TOURNAMENT ID]",
  "approval": {
    "approvedBy": "[ORGANIZER]",
    "approvedAt": "[ISO DATETIME]",
    "rulesVersion": "[VERSION]",
    "rulesHash": "[64-CHARACTER SHA-256]"
  }
}
```

Run `!yolo lifecycle-publish` with this object. Publication fails if required format-specific settings or approval fields are missing.

### 9.4 Full teams, event nights and fixtures

Examples of payload shapes (all IDs must be unique and refer to records in the same tournament):

```json
{ "tournamentId": "[ID]", "team": { "id": "[TEAM ID]", "name": "[TEAM NAME]" } }
{ "tournamentId": "[ID]", "playerId": 12, "teamId": "[TEAM ID]" }
{ "tournamentId": "[ID]", "teamId": "[TEAM ID]" }
{ "tournamentId": "[ID]", "night": { "id": "[NIGHT ID]", "title": "[WEEK / NIGHT]", "startsAt": "[ISO]", "endsAt": "[ISO]" } }
{ "tournamentId": "[ID]", "fixture": { "id": "[FIXTURE ID]", "eventNightId": "[NIGHT ID]", "teamAId": "[TEAM A]", "teamBId": "[TEAM B]", "startsAt": "[ISO]" } }
```

Create teams, assign active registrants, lock both rosters, create the event night, then schedule fixtures. Fixtures outside the published stage or event-night window are rejected.

### 9.5 Record evidence-backed games and outcomes

```json
{
  "tournamentId": "[ID]",
  "game": {
    "id": "[GAME ID]",
    "fixtureId": "[FIXTURE ID]",
    "playerId": 12,
    "teamId": "[TEAM ID]",
    "evidenceRecordId": "[ARCHIVED BATTLE RECORD ID]",
    "result": { "damage": 50000, "kills": 2 }
  }
}
```

To complete a fixture, provide the published outcome method and a second archived evidence reference:

```json
{
  "tournamentId": "[ID]",
  "fixtureId": "[FIXTURE ID]",
  "outcome": {
    "status": "verified",
    "methodId": "[PUBLISHED METHOD ID]",
    "methodVersion": "[PUBLISHED METHOD VERSION]",
    "methodHash": "[PUBLISHED METHOD SHA-256]",
    "winnerTeamId": "[TEAM ID]",
    "evidenceRecordId": "[ARCHIVED BATTLE RECORD ID]"
  }
}
```

### 9.6 Advance a Full stage

```json
{
  "tournamentId": "[ID]",
  "nextStage": "postseason",
  "qualification": {
    "approved": true,
    "methodId": "[PUBLISHED METHOD ID]",
    "methodVersion": "[PUBLISHED METHOD VERSION]",
    "methodHash": "[PUBLISHED METHOD SHA-256]",
    "evidenceRecordId": "[ARCHIVED QUALIFICATION REPORT RECORD ID]",
    "qualifiedTeamIds": ["[TEAM A]", "[TEAM B]"]
  }
}
```

Only use this after all fixtures in the current stage have been completed or explicitly resolved. The report and team list must be produced under the approved published method. Do not invent qualification results.

### 9.7 Pilot results, Race side-event and explicit resolutions

Pilot result payload:
```json
{ "tournamentId": "[ID]", "result": { "playerId": 12, "gameNumber": 1, "damage": 50000, "shipClass": "DD", "shipTier": 8, "evidenceRecordId": "[ARCHIVED BATTLE RECORD ID]" } }
```

Approved Full Race schedule payload:
```json
{ "tournamentId": "[ID]", "schedule": { "id": "[RACE EVENT ID]", "occurrence": "[APPROVED OCCURRENCE]", "startsAt": "[ISO]", "endsAt": "[ISO]", "mapReference": "[APPROVED BIG RACE MAP]", "approval": { "approved": true, "approvedBy": "[ORGANIZER]", "approvedAt": "[ISO]" } } }
```

Race result payload:
```json
{ "tournamentId": "[ID]", "result": { "id": "[RESULT ID]", "eventId": "[RACE EVENT ID]", "playerId": 12, "elapsedSeconds": 60, "evidenceRecordId": "[ARCHIVED BATTLE RECORD ID]" } }
```

Forfeit/withdrawal/bye resolutions require an explicit reason, winner where applicable, and archived evidence. Cancellation requires a reason and does not require a winner. Do not silently edit a locked roster.

## 10. Desktop and Discord safety

The Player/Admin desktop pages now explain the two formats and provide quick notes on mouse hover and keyboard focus. The help descriptions are also present in visible text. The lifecycle creation/management controls are currently exposed through the Discord admin JSON commands; a complete guided desktop lifecycle interface and authenticated lifecycle API remain planned work.

Do not change channel privacy, enable slash commands, or conduct live Discord actions outside an isolated development-guild test. Public replies and snapshots remain subject to the current configured-channel behavior.

## 11. Settings freeze, audit and appeals

Lifecycle changes are audited. Ordinary scoring/gameplay settings must be frozen at event/stage start; changes should apply prospectively to future/unplayed games only. The complete versioned settings-freeze workflow and emergency change approval process remain a follow-up implementation item. Emergency safety, security or platform actions require reason, scope, approver, timestamp, affected games and participant notice/review.

Publish dispute window and appeal authority before the event. Historical sources do not establish one universal appeal duration.

## 12. Organizer publication checklist

Required approvals not to be invented:
- Pilot date/start/end/timezone/entry close/lineup lock/game count.
- Full duration, cadence, and non-overlapping Regular Season, Postseason and Grand Finale date windows.
- Team size and human/bot composition.
- Ship allowlist/bans/tiers/maps/modes and verified current-client special-mode label.
- Match-outcome weights, aggregation, rounding, point differential and qualification.
- Tie-break, substitute, forfeit, bye, no-show, withdrawal, disqualification and appeal policy.
- Race side-event schedule/map and any use of weeks 3/6/9/finale template.
- Prizes, approver names, rules version/hash and publication time.

A blank or unapproved value blocks publication where it affects eligibility, scoring, outcomes, safety or awards.

## 13. Production release gates

Production is NO-GO until:
- automated unit/integration/migration/backup/restore/security tests pass on current source;
- legacy scores, settings, account links, battle records and pending OCR work survive migration;
- Pilot and Full lifecycle, fixture resolution, qualification and tie-break tests pass;
- the canonical workbook and Score Reporter are identified and formula parity is reconciled;
- Windows current-source OCR acceptance passes with native Tesseract;
- local OAuth, Player/Admin authorization, browser visual QA and synthetic upload pass;
- isolated development-guild Discord smoke passes;
- the organizer publication checklist is signed;
- DOCX/PDF/HTML/TXT are generated from this source and rendered/inspected;
- the release archive checksum, ZIP integrity and clean extraction/restore are verified.

Linux/offline CI cannot certify Windows, current game-client, browser, live Discord or organizer approval.

## 14. Provenance and implementation limits

Legacy version-2 score data is preserved and not retroactively assigned to Pilot or Full. The designated canonical scoring workbook and Score Reporter HTML were absent from the audited Library. The repository workbook is not proven canonical; workbook formula changes remain blocked until the designated source is identified.

This manual is an implementation baseline, not a signed event publication. Add append-only amendments with version, date, approver, affected sections, reason, test evidence and effective scope.
