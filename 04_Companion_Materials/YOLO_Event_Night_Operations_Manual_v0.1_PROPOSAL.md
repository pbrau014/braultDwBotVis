# YOLO Tournament — Event Night Operations Manual

**Version:** v0.1 proposal  
**Audience:** Event directors, room hosts, referees, team representatives, scorekeepers, streamers and support staff  
**Status:** Operations proposal. The approved event settings record and current event notice govern each live event.

## 1. Operating principles

1. **Publish before play.** No one should discover a ship ban, mode, bracket rule, scoring weight or restart limit after a match has begun.
2. **Separate authority.** Event direction approves settings; Fleet Command calls tactics; referees administer match procedure; scorekeepers validate records; independent reviewers hear appeals.
3. **Keep two result lanes.** Verified match wins control bracket advancement. Individual damage controls damage awards and contributes to cumulative Grand YOLO damage standings.
4. **Preserve original evidence.** Screenshots, replays, OCR candidates, accepted records and corrected records are distinct artifacts.
5. **Fail closed.** An unreadable mandatory value is unresolved, not guessed. An invalid room is escalated before ready-up.
6. **Version every event.** Tournament configurations change frequently. Every notice identifies the exact ruleset and settings version.

## 2. Staff roles and separation of duties

| Role | Primary responsibility | Must not do |
|---|---|---|
| Event Director / Executive | Owns event notice, calendar, settings approval, exceptions and final publication | Change a match result without evidence or bypass the appeal record |
| Deputy / Operations Lead | Coordinates staff, schedule, attendance and backup coverage | Quietly alter the published rules |
| Fleet Commander / Match Caller | Tactical doctrine, training and live battle calls | Adjudicate a dispute involving their own match |
| Room Host | Opens Training Room, checks settings, invites opponent and approved streamers | Change map/mode/timer after ready-up without referee approval |
| Team Representative | Confirms roster, readiness and communication for the team | Submit another player's result as their own |
| Referee | Attendance, room faults, restart requests, conduct and match procedure | Decide a scorekeeper's transcription without checking source evidence |
| Scorekeeper / Data Steward | Links screenshots/replays to game IDs, validates nine fields, records corrections | Fill unreadable fields by inference or overwrite source evidence |
| Stream Producer | Broadcast delay, VOD, overlays, neutrality and access | Stream a private roster/voice room without approval |
| Independent Review Panel | Reviews appeals, conflicts and procedural disputes | Call tactics or edit the original score record |

**Admiralty translation:** Executive coordinates the event; Legislative/member representatives propose durable rules; Judicial reviews appeals; Fleet Command handles tactics; Service Corps handles logistics, safety, moderation, analytics and technical support; General Membership supplies participants and volunteers. The fictional Admiralty's fifty positions are not a required staffing level.

## 3. Required event settings record

Before registration opens, publish a versioned settings record containing:

- Event name, phase (Pilot / recurring week / Race / playoff / Grand YOLO), date and time zone.
- Server/region, client version/patch if relevant, and event contact.
- Registration window, check-in deadline, late-arrival cutoff and roster lock.
- Participant eligibility and substitute rules.
- Human/bot team size and composition.
- Map pool, mode, battle duration, side/spawn and room settings.
- Ship tier/class limits, bans and allowed consumables.
- Draft method, lineup visibility, bracket format, seeding and tie-breakers.
- Advancement rule and consolation/third-place path.
- Individual damage award and cumulative season scoring policy.
- Race eligibility, course, duration, finish bonus and death penalty (if Race is active).
- Restart rules, no-show/forfeit rules, invalid-room rules and disconnect handling.
- Screenshot/replay evidence route, mandatory fields, correction deadline and appeal window.
- Stream delay, VOD policy, streamer access and conflict-of-interest rules.
- Prize/award description and the official source for any in-game or cash equivalent.
- Ruleset version, approval date, approver and change log.

If a value is not established by the source documents, mark it **PROPOSAL** and obtain approval before publication. Never fill a blank with a silent assumption.

## 4. Phase A — preparation

### 24–48 hours before the event
- Publish the current event notice and settings record.
- Confirm host, backup host, referee, scorekeeper, event director and independent reviewer.
- Confirm map/mode/ship list against the current client and region.
- Confirm bracket platform or manual bracket sheet, team IDs and game IDs.
- Verify Discord permissions and the configured DWBOT intake channel.
- Confirm scorekeeper can access the source evidence store and the nine-field schema.
- Test the room creation process and the approved stream delay.
- Ensure no API keys, bot tokens or private moderation notes are present in public documents or channels.

### Before registration closes
- Confirm each entrant's in-game identity and Discord identity.
- Check eligibility only against published criteria.
- Record attendance and substitute availability.
- Preserve registration timestamp and any approved exception.

## 5. Phase B — Pilot Event runbook

The supplied Pilot source describes a drop-in event, no prior registration, a one-hour entry cutoff, and final lineups thirty minutes before the games. Each room is planned around six humans and six bots; if the human count is short, the bot count mirrors the human count. Lineups are visible. Training Rooms are used.

### Pilot checklist
1. Open the help-desk voice route and event announcement.
2. Close entry at the one-hour cutoff.
3. Confirm participants and final lineup thirty minutes before play.
4. Publish the visible lineups and identify the host for each room.
5. Host creates the Training Room and confirms Standard Battle, map, sides, timer and observers.
6. Use the verified ten-minute Standard Battle baseline.
7. Do not launch the Pilot's Ocean special-mode final match until its exact client mode label and duration are approved. Supplied sources conflict (five vs ten minutes; the Race narrative describes thirty minutes).
8. After each battle, collect the original screenshot showing damage and win/loss.
9. Record the Pilot result separately from recurring season standings unless the event notice explicitly says otherwise.
10. Publish a post-event report: attendance, games completed, room incidents, score evidence status, lessons and proposed corrections.

The Pilot source does not automatically authorize the recurring weekly registration, hidden-lineup, bracket or Race rules.

## 6. Phase C — recurring weekly event runbook

### Check-in and draft
- Open check-in according to the notice.
- Confirm attendance and substitutions.
- Run the random weekly draft and record the seed/order.
- Publish teams and lineups at the approved reveal time.
- The recurring source uses new teams each week; do not promise persistent weekly rosters.

### Round 1
The source describes a bot match, with 2v6 and a later 3v9 option depending on turnout. It describes first-come-first-served seeding for Round 1. The event settings must state which lineup is active.

### Rounds 2 and 3
The source describes mixed human/bot contests, including 6v6 or 9v9, with two or three humans per side and bots filling remaining slots. Later rounds are seeded by wins. The third-place/consolation bracket is intended to keep teams playing through the rounds.

### Match schedule baseline
The recurring source describes ten-minute battles, ten minutes between matches for reporting, fifteen-minute breaks between rounds, approximately seven games per participant and a total event estimate of two to three hours. Publish actual start times and time zone for each event.

## 7. Training Room setup and match procedure

The recurring rules describe the Home Team as the top bracket entry. The Home Team opens the room, names it `Team 1 vs Team 2`, and invites the opponent and approved streamers.

Before ready-up, the host and both representatives verify:
- Correct map and mode.
- Correct timer.
- Correct teams, sides and ship slots.
- Legal ships and lineup.
- Observer/streamer permissions.
- No unauthorized player or bot slot.

If the room is wrong, stop before ready-up and contact the referee. The recurring source says that if an error is discovered after two minutes of game time, the match is played to completion and remains valid. Record the incident and the referee's ruling.

## 8. Attendance, restarts and technical issues

The recurring source gives the following baseline:
- Ten-minute attendance / between-game window.
- A team absent ten minutes after scheduled start may forfeit; if only one team is present and ready, that team receives the win.
- A restart request must be made within the first two minutes.
- The restart should be completed within five minutes.
- Restart allowance is one per team for BO1/BO2/BO3 and two per team for BO5; additional restarts are at organizer discretion.
- Teams may change lineups between games, but not during an approved restart.

These values apply only where the event format/series length matches the source rule. The event settings record must state how the rule applies to a particular Pilot, weekly match, playoff series or finale. Do not infer an unstated restart allowance.

## 9. Evidence and scorekeeping workflow

### Required DWBOT record
The nine mandatory fields, in order:
1. `result`
2. `player`
3. `map`
4. `mode`
5. `battleStart`
6. `credits`
7. `freeXp`
8. `damage`
9. `xp`

### Scorekeeper procedure
1. Assign a unique event, round, match and game ID.
2. Preserve the original screenshot and replay.
3. Check the screenshot is readable and belongs to the correct player/game.
4. Extract candidate values using the approved OCR pipeline.
5. Verify every field against the original evidence and validation rules.
6. Record each candidate source, engine/version, exact value, normalized value, confidence/validation state and disagreement.
7. Accept only fully supported mandatory values. An uncertain value stays unresolved.
8. Link any correction to the original record and preserve both.
9. Do not overwrite the source screenshot or original extraction report.
10. Publish only accepted standings; clearly label provisional results.

OCR.Space PDF-first workflow is: source screenshot -> OCR.Space Engine 2 searchable PDF -> validated HTTPS PDF download -> bounded local raster from that PDF -> Tesseract.js/native Tesseract/PaddleOCR/OpenCV readers operating only on the PDF-derived raster. No automatic retry or original-image fallback is permitted. A missing/invalid PDF or raster is a failure, not a reason to silently switch input sources.

## 10. Match wins, damage and standings

The weekly bracket advancement metric is the verified match outcome. The individual damage award metric is the participant's damage. The cumulative Grand YOLO damage standings aggregate eligible damage from prior events and the finale under the approved scoring policy.

Never:
- Advance a team because its players did more damage if it lost the match.
- Award a damage prize from the team win/loss alone.
- Count the same game twice.
- Use OCR candidates as accepted scores.
- Change formula weights after seeing the result without a versioned rule change.

The supplied `test27xlsm.xlsm` is an archival sample, not the designated canonical workbook. Use the Scoring and Standings Explainer for historical formulas and the current DWBOT C01 Race policy. The canonical workbook and signed event settings are still required for live award certification.

## 11. Appeals and independent review

**Source-supported principle:** the Admiralty handbook separates judicial review from executive and fleet operations.

**PROPOSAL:** publish a fixed appeal window, for example 24 hours after provisional results, and a separate response window. The event settings must approve the actual values.

Appeal packet:
- Event/match/game ID.
- Player and team.
- Original screenshot and replay reference.
- Disputed field or ruling.
- Requested correction.
- Relevant rule/settings version.

The reviewer checks source evidence, rule version and procedure; records a reasoned decision; preserves the original and corrected values; and identifies any conflict of interest. A staff member should not adjudicate their own match or a match involving their own clan/community.

The recurring source restricts staff adjudication of matches involving their own clan/community or teams with more than three members of that community; a staff member on a playing roster must not adjudicate while their team is playing. Apply the exact event-specific conflict rule.

## 12. Streaming and public communications

The recurring source includes a minimum five-minute stream delay and rules for neutral presentation, VOD availability, facecam during games and streamer conflicts of interest. Confirm the current settings before granting room access.

Suggested announcement sequence:
- T-24h: official event notice and settings version.
- T-60m: check-in opens / Pilot entry closes.
- T-30m: final Pilot lineup or recurring lineup reveal, as applicable.
- T-10m: room host and team representatives verify settings.
- After each game: provisional result and evidence submission reminder.
- After the event: provisional standings, correction/appeal window and final verified report.

Keep public messages concise and link to the current ruleset. Do not publish private player details, API keys, bot tokens, internal moderation notes or unverified accusations.

## 13. Race side-event runbook

The recurring source describes Race:
- Every third week.
- One hour before the main event.
- Eligible participants: lower 50% by cumulative damage.
- Ocean route; stationary non-firing bots.
- Thirty-minute Race narrative limit.
- First finisher: +10% Race winnings.
- Participant who dies: -10% Race winnings.
- Race damage contributes to cumulative Grand YOLO damage/seeding, but not that evening's regular event total.

The Pilot and recurring map table conflict on the Ocean special-mode label and duration. Verify the exact current-client mode before the event. DWBOT C01 uses inverse elapsed seconds; the archival workbook uses raw time and is not the active policy.

## 14. Playoffs and Grand YOLO

The supplied YOLO rules do not define a complete separate season playoff field or series format. The current planning proposal is:
- Top eight eligible participants by verified regular-season standings.
- Minimum participation of six of twelve regular-season events.
- Seeds 1–8, with published tie-breakers.
- Single-elimination bracket.
- Quarterfinals and semifinals best-of-three; championship final best-of-five; third-place match best-of-three.
- Grand YOLO finale configured as a separate event, with its own settings record.

These are proposals only. General bracket guidance distinguishes single elimination (fast, one loss eliminates), double elimination (second chance, more matches), Swiss (everyone plays fixed rounds against similar records) and round robin (complete head-to-head, time-intensive). A hybrid season-to-bracket model is also possible. The selected format, byes, seeding and tie-breaks must be approved and published before the season.

Do not confuse the Grand Yolo Round 4 calculator sheet with the season-ending Grand YOLO championship event.

## 15. Post-event closeout

- Reconcile all match outcomes and individual score records.
- Resolve missing screenshots and OCR disagreements.
- Publish provisional results with a clear correction deadline.
- Hear appeals independently and publish the final result.
- Export the final standings and archive the settings version, bracket, source evidence hashes, score report, replay references and incident log.
- Record lessons learned and proposed rule changes for the next event.
- Preserve prior versions; do not silently rewrite history.

## 16. Source references and configuration warning

This manual reconciles the supplied Admiralty handbook, YOLO Pilot and recurring rules, Discord scoring messages, CBStrat Tier X guide and current game/tournament references. The source reconciliation record lists exact source fingerprints and conflicts.

Tournament configurations often change: maps, ship restrictions, team sizes, modes, signup windows, schedule, scoring and bracket formats can vary by season, region and patch. Recheck the current official event notice and the signed YOLO settings before every event.
