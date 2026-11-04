# grandYoloInstruct — YOLO Tournament Operations Guide

**Version:** 1.0 implementation draft  
**Applies to:** Pilot YOLO and Full YOLO  
**Authority:** Published event-specific rules and signed organizer approval record take precedence over this general guide.  
**Status:** Core procedures defined; event-specific publication values remain unapproved where marked.

## 1. The two formats

The DWBOT system supports two formats with common participant needs and operational procedures.

### Pilot YOLO
A smaller, single-evening tournament. It uses shared participant registration, check-in, team/room assignment, battle evidence submission, scoring review, standings and awards procedures. It is not a season. Pilot results do not automatically seed or carry into a Full YOLO season. Any bridge must be explicitly published and approved before registration.

### Full YOLO
A season lasting multiple weeks or months, according to the organizer's published calendar. It contains:
1. Regular Season - recurring event nights, registrations, rosters, fixtures, match results and cumulative records.
2. Postseason - qualification and bracket/series play under the published advancement method.
3. Grand YOLO Finale - the season's concluding tournament stage.

The Grand Yolo scoring category is not the same thing as the Grand YOLO Finale stage.

## 2. Shared participant journey

1. Read the event announcement and confirm the format, date/time, server, eligibility, ship restrictions, map/mode, scoring method, evidence deadline and contact route.
2. Register using the published method before the stated cutoff.
3. Confirm your exact in-game name and linked Discord identity with an organizer. Do not assume similar names are interchangeable.
4. Review team, room, match, and check-in instructions. Keep lineup information private until the published reveal/ready-up point.
5. Join the designated Training Room or other published battle environment. Follow host/referee instructions.
6. Play the assigned game and retain the complete post-battle results screen.
7. Submit one clear, original screenshot through the approved bot upload route before the deadline. Do not crop away fields needed for verification or edit numeric values.
8. Check submission status. If OCR is uncertain or incomplete, respond to the correction request with the exact visible value; do not guess.
9. Review your own recorded result and report discrepancies promptly using the correction process.
10. Follow the published standings, tie-break, protest and award procedures.

## 3. Pilot YOLO event lifecycle

### Before event day
- Organizer publishes the Pilot format, rules, entry cutoff, eligibility, roster/side size, human/bot split, ship restrictions, map pool, battle mode, number of games, breaks, evidence instructions, scoring and award details.
- The event roster and exact participant names are confirmed.
- Host/referee confirms room creation, permissions, passwords, team assignment procedure, restart policy and contingency contact.
- Any special mode is named exactly as shown in the current game client. If the label is not verified, omit that mode and use the approved standard battle instead.

### Event day
- Check in by the published deadline.
- Lock the final lineup at the published lineup-lock time.
- Host creates the Training Room and verifies map, mode, duration, teams, restrictions and password.
- Participants join the correct side and wait for the ready signal.
- Host records the start/end times, match number, room settings, attendance, substitutions, restarts and incidents.
- Referee confirms that each required game is complete and that evidence has been submitted.

### Results and closure
- Validate each screenshot and exact values before scoring.
- Pilot placement/prize calculation uses only the published Pilot scoring rule. Historical notes indicate individual Damage may determine Pilot placement; this must be confirmed in the event publication and must not be confused with team match win/loss.
- Publish provisional results, allow the stated review window, resolve protests, then publish final results.
- Close the Pilot event. Do not create a Full-season record or bracket seed unless a separate approved bridge explicitly says so.

## 4. Full YOLO season lifecycle

### Season setup
Organizer creates a Full YOLO tournament and season, then publishes:
- season duration and calendar;
- registration and weekly signup cutoffs;
- eligibility and participant identity requirements;
- team generation/assignment and roster lock rules;
- event-night schedule and round structure;
- fixture, match, game and evidence definitions;
- regular-season scoring and standings;
- postseason qualification and advancement;
- Grand YOLO Finale format and awards;
- withdrawal, no-show, substitute, forfeit, bye, restart and dispute rules.

### Regular Season
- Participants complete season registration and each required event-night check-in.
- Teams and rosters are assigned according to the published procedure. If random team generation is used, the method and any exclusions must be recorded.
- Each event night is recorded independently with its date, settings, participants, teams, fixtures, matches and games.
- Completed battle evidence is validated before results are mapped.
- Season totals and match outcomes are separate records. A player's individual score is not itself a team advancement result.
- Ordinary settings freeze when the event starts. Later changes apply prospectively only to future/unplayed games. Completed games are never silently recalculated.

### Postseason
- Qualification is calculated using the published, approved regular-season rules.
- Bracket entries, seeds, byes, fixtures and match series are recorded.
- A match outcome must reference the approved scoring method version and its approval record.
- D21 is a policy direction, not an executable formula until the organizer approves the exact aggregation, eligible metrics, rounding, tie-break and missing-data treatment. The legacy field dblns is an individual performance output, not a standalone advancement key.
- Tie-breaks must be applied in the published order. The proposed order is head-to-head outcome, record among tied teams, predeclared team metric/point differential, extra deciding game if feasible, and auditable random draw only when expressly authorized.
- No bracket progression is recorded without a verified match outcome.

### Grand YOLO Finale
- Finale is the final Full YOLO stage, not the Grand Yolo score category.
- Publish finalist qualification, team/individual participation, game sequence, map/mode, scoring, tie-break, evidence and awards before the finale.
- Verify final standings and evidence; close the season only after the review window and disputes are complete.

## 5. Scoring categories and special records

The four existing workbook categories remain:
- Damage
- Kills
- Race
- Grand Yolo

Each player retains seven game slots per category unless a separately approved workbook migration changes that contract.

### Race distinctions
- Race-time metric: positive elapsed seconds. Where this metric is used, lower elapsed time is better.
- Race side-event: a separately scheduled Full-season event. It must have its own event-night, map, participant/team records, timing evidence and scoring publication. It contributes only where the approved season rules say it contributes; it is not silently counted as ordinary match score.
- Big Race: a map name, not a scoring category or lifecycle stage.

### Grand Yolo distinctions
- Grand Yolo: existing scoring category and its current workbook formula.
- Grand YOLO Finale: Full-season concluding stage. It may use one or more published categories, but it does not redefine the Grand Yolo category.

### Existing scoring safety
- Preserve existing workbook formulas unless a canonical workbook and approved formula change are supplied.
- Ship-class weights in current code: DD=4, CA=3, BB=2.
- Unknown/blank values are invalid, not zero.
- Do not infer prize conversion from the historical 0.54 × dblns / 100 display formula. Participant-facing dollar display remains off unless an approved award rule explicitly enables it.
- Do not publish a formula as approved merely because it exists in code or a workbook.

## 6. Evidence, OCR and corrections

The mandatory OCR field contract is exactly nine fields in this order:
1. result
2. player
3. map
4. mode
5. battleStart
6. credits
7. freeXp
8. damage
9. xp

XP is mandatory and ninth. Missing, invalid, ambiguous, conflicting or incorrect values block acceptance. Tesseract.js remains the baseline; OpenCV proposes image regions only. PaddleOCR and OCR.space are optional evidence sources and may not independently approve a field. Never fuzzy-correct a value or edit ground truth to manufacture a pass.

Participant procedure:
- Upload the original screenshot using the local desktop/bot upload workflow.
- Confirm the upload is associated with the correct participant and game.
- If correction is requested, enter the exact value visible in the source screenshot.
- Keep the original image and all correction/audit history.
- Do not submit screenshots containing unrelated private information where avoidable.

Referee procedure:
- Check image identity, required fields, exact value and game/participant mapping.
- Reject unreadable or conflicting evidence; request a new source or manual review.
- Preserve original OCR, correction, reviewer, timestamp and final accepted value.
- Never convert absent Training Room reward fields into invented zero values.

## 7. Training Room and game-client checks

Training Room battles are intended for controlled competition and may not award normal battle rewards. The exact current game-client behavior must be checked on the actual build used for the event. The OCR contract still requires the nine fields for screenshots it accepts; if a required field is not present in a particular approved screenshot type, define and test a separate explicit evidence profile rather than weakening the existing contract. Do not fabricate Credits, Free XP or XP.

Before publishing a room:
- verify current client map/mode labels;
- verify team size and human/bot counts;
- verify ship tier/class restrictions;
- verify battle duration, weather and other configured options;
- verify no reward/credit assumptions are used in scoring;
- capture a room-settings checklist for the event log.

## 8. Discord and desktop operations

- Use the designated tournament server and configured channel(s) only.
- Admin commands and actions remain restricted by the existing trusted Node service and configured administrator identity/permissions.
- Participant views show only the linked participant's own protected data.
- Do not post tokens, OAuth secrets, webhook URLs, private account links or full recovery archives publicly.
- Keep slash-command activation disabled unless separately tested in an isolated development guild.
- Desktop login uses the local OAuth bridge. The local service must remain loopback-bound unless a separately approved deployment design is security-reviewed.
- The Player page supports personal standings/submissions; Admin manages roster, account links, settings, evidence review and recovery.
- Quick-note tips are available by mouse hover and keyboard focus. Essential instructions remain visible in the page and are never tooltip-only.

## 9. Configuration freeze and audit

At event start, freeze ordinary rules/settings. Any change after start:
- applies only to future/unplayed games;
- records old value, new value, reason, actor/approver, timestamp and affected scope;
- is communicated to affected participants before play continues.

Emergency safety, security or platform changes require an incident record, reason, scope, approver, timestamp, affected games and participant notice/review. Never retroactively alter a completed result without a documented correction process.

## 10. No-show, restart, withdrawal and disputes

Each event publication must define exact timing and handling for no-shows, late arrivals, substitutions, disconnects, restarts, withdrawals, forfeits, byes and disputes. Historical Pilot notes include a 10-minute no-show/restart clock, but this value is not a universal rule until confirmed in the current event publication. Referees must log each occurrence and apply only the published rule. If no rule exists, pause the affected match and obtain an organizer ruling; do not improvise a scoring penalty.

## 11. Organizer publication checklist — currently unapproved values

The following must be completed and approved for each event/season before publication:
- [ ] Format, event name, date, local time and time zone.
- [ ] Registration opening/closing and lineup/roster lock.
- [ ] Participant eligibility and maximum roster.
- [ ] Side/team size and human/bot split.
- [ ] Ship allowlist, banned classes/ships, tiers and restrictions.
- [ ] Verified current-client mode label and map pool.
- [ ] Battle duration, rounds/games and breaks.
- [ ] Pilot placement rule or Full match/season scoring formula.
- [ ] D21 calculation, rounding, tie-break and missing-data policy if used.
- [ ] Race side-event schedule and contribution rules, if used.
- [ ] Postseason qualification, bracket, bye, forfeit and withdrawal rules.
- [ ] Grand YOLO Finale structure.
- [ ] Awards/prizes and exact amounts/eligibility.
- [ ] Evidence deadline, review window, protest route and referee assignments.
- [ ] Discord server/channel, bot permissions and privacy notice.
- [ ] Named approver, approval timestamp, version and effective time.

Until approved, show the item as **Not yet approved**. Never fill blanks from old draft documents as if they were current approvals.

## 12. Referee event log template

For each game record: event/season ID; format; event-night; stage; fixture/match/game ID; date/time; room host; map/mode; team/roster snapshot; ship restrictions; start/end; result; evidence ID/hash; OCR engine/version; mandatory field status; manual corrections; reviewer; incident/restart/no-show; scoring method version; approval reference; final status.

## 13. Troubleshooting

**Participant cannot see their entry:** verify exact roster spelling, Discord account link, identity mapping and account permissions. Do not expose another participant's record as a workaround.

**OCR requests correction:** inspect the original screenshot at full resolution. Enter only the exact visible value or request a clearer screenshot. Do not guess.

**A result maps to the wrong game:** pause scoring, retain evidence, verify participant/event/game mapping, then use the audited correction process.

**A stage cannot be activated:** verify that the preceding stage exists and is complete. Do not skip regular season or postseason to force a finale.

**Match outcome cannot advance:** verify the exact approved scoring-method ID, approver, calculation inputs, and match outcome. An individual score alone is not enough.

**Training Room reward values are absent:** do not enter zero unless the actual evidence and published evidence profile explicitly define zero. Request a supported screenshot/evidence path.

**Discord or browser test is unavailable:** keep the gate OPEN and use offline tests only as offline evidence. Never label a mock or local simulation as a live test.

## 14. Release and acceptance gates

Automated domain, migration, UI-contract, scoring and regression tests must pass. Separately, production release requires real evidence for:
- current-source Windows screenshot OCR acceptance with native Tesseract and paired Tesseract.js;
- local Discord OAuth, Player/Admin permissions, browser visual review and synthetic screenshot upload;
- isolated development-guild Discord smoke;
- Windows process-separated persistence and full recovery;
- final PDF/manual/package manifest, checksums, ZIP integrity and clean extraction.

A green Linux/offline suite does not close these gates. Production status remains **NO-GO** until all required gates are evidenced and reviewed.
