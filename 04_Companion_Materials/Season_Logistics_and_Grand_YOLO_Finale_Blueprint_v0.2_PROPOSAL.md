# Season Logistics and Grand YOLO Finale Blueprint

**Version:** v0.1 proposal  
**Status:** WORKING BLUEPRINT — NOT AN EVENT NOTICE, NOT A SIGNED SETTINGS RECORD, AND NOT AN APPROVED CALENDAR  
**Purpose:** Join the existing Pilot, recurring-season, postseason, and Grand YOLO materials into one operational sequence without inventing dates, prizes, eligibility thresholds, or unapproved scoring rules.

> **Important distinction:** “Grand Yolo” is both the name of Round 4 in the existing four-event calculator and a proposed name for the season-ending championship event. They are not automatically the same thing. The finale's event format, scoring, awards, and qualification rules must be expressly approved. The Round 4 calculator formula must not silently become the finale match-outcome formula.

## 1. Governing sources and boundaries

Use these existing documents as the working source set:

- `Pilot_Event_Ruleset_v1.1_DRAFT.md` — one-off attendance-based Pilot.
- `Recurring_Tournament_Ruleset_v1.1_DRAFT.md` — recurring weekly format, regular season, and postseason.
- `Participant_Quick_Start_Evidence_and_Results_v1.1_DRAFT.md` — participant actions and evidence.
- `Training_Room_Host_and_Referee_Guide_v1.1_DRAFT.md` — room setup, readiness, restarts, and disputes.
- `Scoring_Workbook_and_Validation_Guide_v1.1_DRAFT.md` — scoring authority and validation.
- `Event_Settings_and_Publication_Approval_Record_v1.1_DRAFT.md` — one signed settings record per event or stage.
- `docs/GRAND-TOURNAMENT-V3.22-DWBOT-ALIGNMENT.md` — bot behavior and unresolved scoring/workbook boundaries.

The v3.22 source bundle is a policy/operations reference, not proof that DWBOT implements every described rule. The designated canonical scoring workbook remains unavailable in the reconciled source set. Do not automate match outcomes, playoff advancement, or prize decisions until the exact workbook/formula and event settings are approved and tested.

## 2. Event lifecycle

| Stage | Purpose | Operating model | Exit evidence |
|---|---|---|---|
| Pilot event | Rehearse participant intake, room setup, evidence capture, scoring review, and closeout | Drop-in attendance baseline; keep it separate from season signup and playoff rules | Completed settings record, roster/lineup record, match/evidence archive, issue log, participant feedback, after-action review |
| Season registration | Establish the recurring participant pool | Individual signup; identity mapping; eligibility and availability confirmed; waitlist and duplicate handling published | Locked registration export and approved eligibility/settings record |
| Regular season | Run the published weekly fixture schedule | Organizer-managed team draft/assignment unless fixed teams are explicitly announced; publish map/mode, lineup size, roster, timing and evidence route per fixture | Verified match records, individual records, standings snapshot, correction/dispute log |
| Postseason qualification | Determine eligible playoff entrants | Apply only the qualification formula and tie-break order published before registration | Reproducible standings snapshot, qualification list, tie-break worksheet, referee approval |
| Playoffs | Determine finalists using the approved bracket | Publish bracket, pairing, series length, home/away/host rules, byes, substitutions, forfeit and restart rules | Verified match outcomes and signed bracket progression record |
| Grand YOLO finale | Conclude the season and recognize approved winners | Separate championship event with its own settings record; may include finals, placements, and approved awards | Final match/evidence records, verified standings, award approvals, season archive, after-action review |

## 2A. Recommended planning defaults — proposals requiring organizer ratification

The following are **proposed defaults**, not source-approved rules and not an event notice. They are intended to make a first season schedulable and understandable. The organizer must accept, edit, or reject each before registration opens.

| Decision | Proposed default | Why this is a workable starting point |
|---|---|---|
| Regular-season length | 12 weekly fixtures | Aligns with the source's candidate 12-week map rotation; the actual calendar remains unapproved. |
| Registration | Individual registration for each season; publish a weekly availability check and close weekly changes 24 hours before the fixture. | Keeps the recurring source's individual-registration model while giving scorekeepers time to form teams. |
| Waitlist | First-confirmed, first-served; publish a timestamped waitlist and close it with the roster lock. | Auditable and easy to administer. |
| Team/roster lock | Publish each side's human/bot slot table before the event; freeze human rosters at weekly lock. Allow one named substitute from the registered pool only before the first game of a series. | Avoids silent team-size changes and unrecorded substitutions. Exact slot composition still needs organizer approval. |
| Playoff qualification | Top 8 eligible teams by verified regular-season standings; require participation in at least 6 of 12 regular-season fixtures. Pilot results do not seed or qualify teams. | Gives a clear, auditable field while preventing a one-off Pilot from changing season seeding. |
| Seeding and ties | Seed 1–8 from verified standings; apply D21 tie-break order exactly as published. No subjective reseeding. | Reuses the recurring source's tie-break hierarchy. |
| Playoff bracket | Single-elimination, eight-team bracket. Quarterfinals and semifinals best-of-three; championship final best-of-five; third-place match best-of-three. | A simple bracket with a longer championship series. |
| Grand YOLO finale | One separately announced championship day containing the third-place match, best-of-five championship final, season awards, and closing recognition. | Makes the finale the clear season endpoint without confusing it with Round 4's individual calculator formula. |
| Score/advancement authority | Only the signed, tested scoring build and accepted individual-performance metrics may calculate the team match outcome; that verified outcome advances the bracket. If formula parity is not certified, keep outcomes under referee review and do not auto-advance. | Preserves the established match-outcome policy and avoids inventing a new formula. |
| Awards and prizes | Publish award categories, recipients, exact prize quantities/values, funding/source, and eligibility before registration; if any value is not approved, advertise no value and make no award commitment. | Prevents implied prizes or use of the historical H12 dollar diagnostic. |

### Proposed participant requirements

These are proposed operational requirements, not eligibility law or a new skill/clan threshold:

1. Use the Discord account linked by an administrator to the correct roster identity; confirm the in-game name before the roster lock.
2. Be able to join the announced Training Room, use the published map/mode and ship allowlist, and follow the host/referee's ready-up instructions.
3. Register by the published cutoff for the regular season and confirm weekly availability. The Pilot remains drop-in under its source baseline unless its signed settings say otherwise.
4. Read the current event notice and the rules/settings version it names. Ask about any blank or contradictory requirement before ready-up.
5. Supply the original readable post-battle evidence through the official route. DWBOT requires all nine fields: result, player, map, mode, battleStart, credits, freeXp, damage, and xp. Do not edit, crop away, or guess values; unresolved fields remain unresolved until reviewed.
6. Check the resulting record, submit corrections through the published route, and meet the published dispute deadline. A bot reply is receipt/candidate evidence, not final score approval.
7. Respect published room, communication, conduct, replay-retention, and privacy rules. No additional age, clan-tenure, skill-rating, or minimum-game requirement is created by this proposal unless the organizer expressly publishes one.

### Proposed event-day participant sequence

- **Before arrival:** check local time zone, fixture, host/fallback host, map/mode, ship/tier allowlist, roster, start/cutoff, evidence route, and referee contact.
- **Check-in:** confirm linked identity and roster; report an absence or technical issue promptly.
- **Room check:** both team representatives verify game ID, map/mode, duration, sides, slots, ship legality, visibility, and observers before ready-up.
- **During play:** follow the published attendance/restart clocks; report faults with the game ID and timestamp; do not assume a restart or extension.
- **After each game:** capture the original readable result screen; submit it through the official route; compare the record against the source; preserve corrections and disputes.
- **Closeout:** wait for verified match outcomes and the published ruling before treating standings, advancement, or awards as final.

### Proposed playoff and finale operating checklist

1. Freeze the regular-season standings snapshot only after source evidence, accepted metrics, corrections, and disputes are reconciled.
2. Apply the published 6-of-12 participation rule and rank the eligible teams; preserve the excluded/ineligible list and reasons.
3. Apply D21 tie-breaks in order and preserve the inputs/calculation for every tied pair.
4. Publish the eight-team bracket, series lengths, host/map assignment, roster/substitute rules, attendance/restart/forfeit rules, and appeal deadline before the first playoff match.
5. Record every game outcome and series winner; pause advancement for any unresolved source evidence or formula dispute.
6. At the Grand YOLO finale, verify the third-place and championship series, approve season awards separately from match scoring, publish the champion/placements, and archive the complete season record.

**Approval boundary:** The proposed top-eight field, 6-of-12 minimum, single-elimination bracket, series lengths, weekly registration cutoff, and substitution rule are not established facts. They remain proposals until the organizer records an explicit decision in the Event Settings and Publication Approval Record.

## 3. Pilot event — rehearsal before the season

### Participant requirements to publish

1. Event date, absolute start/end time, and IANA time zone.
2. Drop-in or registration variant; source baseline is no prior registration and entry cutoff one hour before start.
3. Exact participant cutoff enforcement and late-arrival treatment.
4. Required in-game name and Discord identity mapping.
5. Published map, current-client mode, duration, ship/tier allowlist, and room size.
6. Evidence channel/form and manual fallback route.
7. Referee/help contact and dispute deadline.
8. Exact award eligibility, recipient count, and prize value before the first game.

Do not impose the source's historical 30-day clan-tenure condition unless an organizer expressly approves it in the event settings. The source does not supply an exact ship/tier limit for the Pilot; publish an allowlist rather than guessing. The two different special armor-mode labels in the source remain unresolved; omit that match unless the installed client confirms the exact label and the organizer approves it.

### Rehearsal checklist

- Test sign-in and participant identity mapping.
- Verify the host and backup host can create the configured room.
- Rehearse roster/lineup announcement and the 30-minute pre-play baseline.
- Rehearse ready-up, absence clock, restart request, restart completion, and referee escalation.
- Submit a readable original screenshot through the approved route.
- Compare accepted fields to source evidence; exercise one correction and one manual fallback.
- Reconcile score inputs, calculator output, and the published Pilot award rule.
- Record what failed, what was confusing, time spent, and participant feedback.

Pilot Damage placement is limited to the individual awards expressly announced for the Pilot. Do not use Pilot ranking as season seeding unless the season settings explicitly authorize it.

## 4. Full-season planning model

The source materials describe a weekly recurring event and a candidate 12-week map rotation. Treat 12 weeks as a planning template only until the organizer approves the season length and calendar.

### Candidate regular-season sequence

| Template week | Source map baseline | Notes |
|---:|---|---|
| 1 | Islands | Standard Battle baseline |
| 2 | Polar | Standard Battle baseline |
| 3 | Big Race | Race side-event appears in the selected template policy |
| 4 | Archipelago | Standard Battle baseline |
| 5 | Ring | Standard Battle baseline |
| 6 | Straight | Race side-event appears in the selected template policy |
| 7 | New Dawn | Standard Battle baseline |
| 8 | Islands | Standard Battle baseline |
| 9 | Polar | Race side-event appears in the selected template policy |
| 10 | Big Race | “Big Race” is a map name in the source table |
| 11 | Archipelago | Standard Battle baseline |
| 12 | Ocean | Finale only if a 12-week season is ratified; verify mode before publication |

The source's selected template places a separate 30-minute Race side-event one hour before regular play in weeks 3, 6, 9, and week 12 only if a 12-week season is approved. Race damage is recorded in Race/cumulative season totals and declared Race awards, not silently added to that night's regular match outcome.

### Weekly operations cycle (proposed planning cadence)

- **Before registration opens:** publish event settings, eligibility, calendar, map/mode, ship allowlist, scoring formula version, awards, evidence route, appeal route, and contacts.
- **Registration window:** collect participant identity, availability, required eligibility confirmations, and waitlist order.
- **Roster lock:** close corrections, publish the team draft/assignment and substitutes, and record approved exceptions.
- **Pre-event:** confirm host/fallback host, room configuration, map/mode, roster, clock, observers, and evidence path.
- **During play:** record game IDs, lineup changes, incidents, restart/forfeit decisions, and evidence references.
- **After play:** reconcile source screenshots/replays, score inputs, formulas, match outcome, standings, disputes, and awards.
- **Before next week:** publish the verified standings snapshot and the next fixture only after review.

This cadence is a planning recommendation, not an approved deadline schedule.

## 5. Playoff structure — decisions that must be published first

The source establishes that the verified match outcome governs bracket advancement and gives a tie-break order, but it does not supply a complete playoff field size or bracket design. Do not assume a top-four, top-eight, single-elimination, double-elimination, or best-of series.

The event settings record must resolve:

- Season qualification metric and whether all weeks or a subset count.
- Number of playoff entrants and any minimum participation requirement.
- Seeding formula and treatment of withdrawals, ties, byes, and late disqualifications.
- Bracket type and match/series length at each stage.
- Home/away or host assignment and map selection.
- Roster continuity, substitutes, and eligibility at lock.
- Forfeit, restart, platform-fault, and abandoned-match treatment.
- Tie-break order and whether a deciding game is permitted.
- Independent review and appeal deadlines.
- Whether any regular-season individual award affects playoff seeding (default: no unless expressly published).

The recurring ruleset's D21 tie-break order is: head-to-head result; record among tied teams; declared team metric/point differential; extra deciding game if feasible; auditable random draw only when expressly authorized. Publish the applicable metric definition and data source before signup.

## 6. Grand YOLO season finale

Treat the Grand YOLO finale as the season's closing championship event, not as an automatic alias for the calculator's Round 4.

Before announcing it, the organizer must decide and record:

1. Whether it is the playoff final only, a multi-placement championship event, or a separate all-participant finale.
2. Which playoff qualifiers and/or other participants may enter.
3. Whether it uses the recurring match format or a distinct room/roster format.
4. Number of games, map/mode rotation, ship/tier allowlist, and schedule.
5. Whether Round 4 Grand Yolo individual scoring is used, and if so, the exact approved workbook/formula version and aggregation.
6. How team match outcomes are calculated and how those outcomes determine the champion.
7. Awards, recipient count, exact prize values, tie-breaks, and distribution process.
8. Evidence, replay retention, referee, appeals, and final publication authority.

The calculator's Grand Yolo Round 4 formula is an individual score calculation with Damage, Kills, Time, tier and class contributions. It is not, by itself, a team match-outcome formula or a playoff bracket engine. The current DWBOT alignment record explicitly keeps bracket progression outside automated decisions until the canonical workbook and signed settings are available and parity is tested.

### Finale closeout

- Verify every final and placement match against source evidence.
- Reconcile the signed scoring/formula version and any authorized corrections.
- Confirm the champion and placements from the approved match outcomes.
- Obtain award approval and record actual distribution.
- Publish final standings and a concise rules/version/evidence note.
- Archive source evidence, results, decisions, and settings with appropriate access controls.
- Conduct an after-action review and carry forward improvements only through a versioned policy update.

## 7. Staff and participant responsibilities

| Role | Minimum responsibility |
|---|---|
| Event director / organizer | Approves event settings, calendar, eligibility, prizes, publication and exceptions |
| Referee | Enforces rules, resolves room/match disputes, records rulings and appeals |
| Scorekeeper | Maintains source-linked inputs, formula version, standings and correction history |
| Room host | Configures room and confirms map/mode, teams, limits and ready-up |
| Backup host | Takes over under the published contingency |
| Team representative | Confirms roster/readiness and communicates disputes for the team |
| Participant | Uses correct identity, follows event settings, captures original evidence and checks submitted results |
| Independent reviewer | Reviews disputed score/outcome or award decisions where feasible |

The current bot is configured around one designated Discord channel for intake/publication and does not prove support for a multi-channel architecture. Any future channel split, role expansion, or bot permission change requires a separate implementation/security review. This blueprint does not create Discord channels or change access.

## 8. Open decision register

| ID | Decision | Current state | Required before |
|---|---|---|---|
| LOG-01 | Pilot date/time/time zone | Not supplied | Pilot announcement |
| LOG-02 | Pilot map/mode/ship allowlist | Mode label and ship limits unresolved | Pilot announcement |
| LOG-03 | Pilot prize values and award count | Not supplied | Pilot announcement |
| LOG-04 | Season length and actual calendar | 12-week candidate only | Registration |
| LOG-05 | Season eligibility, registration dates and waitlist | Not approved | Registration |
| LOG-06 | Team size and per-stage human/bot slots | Source ambiguity remains | Each fixture |
| LOG-07 | Season qualification metric and playoff field size | Not defined | Registration |
| LOG-08 | Bracket format and series length | Not defined | Registration |
| LOG-09 | Grand YOLO finale format and entrants | Not defined | Season publication |
| LOG-10 | Finale formula, awards and prize values | Not approved | Season publication |
| LOG-11 | Canonical workbook and scoring parity | Designated workbook unavailable; formula parity not certified | Automated match outcomes |
| LOG-12 | Discord channel/role architecture | Current bot uses one configured channel | Any live permission/channel change |

## 9. Ready-to-announce gate

An event is not ready to announce merely because this blueprint or the reusable rulesets exist. A specific event requires a completed, signed Event Settings and Publication Approval Record; complete participant-facing rules; approved dates/time zone, map/mode/ship limits, eligibility, roster and schedule; exact prizes; named staff/contacts; tested evidence and manual fallback; and an approved scoring/formula version. Playoff advancement and Grand YOLO champion declarations additionally require verified match outcomes and an auditable bracket/award record.

**Current disposition:** useful planning framework only. No event date, eligibility cutoff, prize, playoff format, finale format, or organizer approval has been invented or issued.
