# YOLO Tournament — Participant Quick Start & Evidence Guide

**Version:** v0.1 proposal  
**Audience:** New and returning participants, team representatives and substitutes  
**Status:** Participant-facing proposal. The event-specific notice and approved settings record always take precedence.

## Welcome aboard

YOLO is a World of Warships community tournament built around bot and mixed human/bot battles, weekly random team drafts, match brackets, individual damage awards and a season-ending Grand YOLO event.

**Remember the two result lanes:**
- A verified team match win advances the weekly bracket.
- Your individual damage contributes to damage awards and the cumulative Grand YOLO damage standing.

A high-damage loss does not become a bracket win. A low-damage win still advances the team if the published match rules say it does. Both outcomes must be recorded.

## 1. Before you register

Check the event notice for:

- Server/region and the correct in-game client.
- Event date, time zone, check-in time and late-arrival cutoff.
- Pilot or recurring-weekly ruleset.
- Eligible ship tiers, ship classes, banned ships and map pool.
- Match mode and duration.
- Team size and human/bot composition.
- Registration, random-draft and lineup publication process.
- Bracket format, seeding, advancement and tie-breakers.
- Damage award and season-standing formula.
- Screenshot/replay submission route and correction deadline.
- Referee, help-desk and appeal contact.

The recurring YOLO source excludes human-player aircraft carriers and submarines; bots may include carriers where the event rules specify. The final allowed-ship list is event-specific and must be checked for each tournament. Do not assume last week's list remains current.

### Participant requirements

**Source-supported recurring expectations**
- Use the in-game name and Discord identity supplied at registration.
- Be available for the published check-in and assigned matches.
- Follow the weekly random draft; new teams are formed each week.
- Enable battle replays and retain them for at least 48 hours, as required by the recurring source.
- Use only ships permitted by the current event list.
- Submit the original, readable post-battle screenshot through the designated route.
- Communicate promptly with your team representative or referee if you are delayed or have a technical problem.
- Follow respectful-play and anti-trolling rules.

**PROPOSAL — eligibility details to publish per event**
The source materials do not set a universal account-level, clan-membership, age or regional eligibility rule. The event notice must state any such restrictions rather than allowing staff to invent them at check-in. A PG-13/family-friendly team-name standard is present in the source material; team names and logos should not include copyrighted IP or offensive content.

## 2. Pilot Event or recurring weekly event?

| If you are joining… | Expect… |
|---|---|
| Pilot | Drop-in participation; the Pilot source says no prior registration, entry closes one hour before the start, final lineups appear 30 minutes before games, and lineups are visible. The simplified room is planned around six humans and six bots. |
| Recurring week | Individual weekly registration, a new random draft, hidden lineups until the published reveal/ready-up point, and the recurring three-round mixed bot/human format. |

Do not assume the Pilot's visible-lineup or drop-in rules apply to a recurring week. The event notice will name the governing ruleset.

## 3. Event-night checklist

### Arrive and check in
1. Join the designated Discord event channels or voice route.
2. Confirm your in-game name and attendance with your team representative.
3. Check your team assignment and the event's current ship list.
4. Ask the referee if the schedule, room or rules are unclear.

### Before ready-up
1. Confirm the correct Training Room, map, mode, duration and side.
2. Confirm the roster, legal ships and lineup.
3. Confirm that both representatives have checked the room.
4. Raise any mismatch before ready-up. Do not silently accept an incorrect room.

### During the battle
- Follow your caller's target and objective instructions.
- Share spotting information and focus the called target.
- Avoid unsupported pushes and unnecessary damage trades.
- If a technical issue occurs, contact the referee promptly. Restart eligibility and timing are governed by the event notice.

### After the battle
1. Save the original post-battle screenshot.
2. Keep the replay for at least 48 hours.
3. Submit the screenshot using the event's official evidence route.
4. Check that your player name, result and damage are readable.
5. Do not edit, redraw or type over the screenshot.

## 4. The nine required DWBOT fields

DWBOT accepts a battle record only when all nine required fields are present and validated:

| Order | Field | What it means |
|---:|---|---|
| 1 | `result` | Win/Loss/Draw result shown by the battle record |
| 2 | `player` | Exact player identity |
| 3 | `map` | Battle map |
| 4 | `mode` | Battle mode |
| 5 | `battleStart` | Battle start time |
| 6 | `credits` | Credits earned |
| 7 | `freeXp` | Free XP earned |
| 8 | `damage` | Damage dealt |
| 9 | `xp` | XP earned |

**If any value is unclear:** leave it unresolved and contact the scorekeeper. Do not guess a digit, infer a value from another player's screenshot, or change a value to make the standings look right. OCR output is a candidate; acceptance requires the project's validation rules.

## 5. Match wins, damage and awards

- **Match win/loss:** determines the team result and bracket advancement.
- **Damage:** contributes to the individual damage award and cumulative Grand YOLO damage standing.
- **Event score:** a formula result for a particular event sheet.
- **Final award:** the published result after the approved settings, verified inputs and any appeals are reconciled.

The archival sample workbook calculates Doubloons from damage, kills, race and Grand Yolo event tabs. It is not the designated canonical workbook. See the [Scoring and Standings Explainer](YOLO_Scoring_and_Standings_Explainer_v0.1_PROPOSAL.md) for the formula examples and current Race policy.

## 6. Race side event

The recurring source describes a separate Race every third week, one hour before the main event, for the lower 50% of participants by cumulative damage. The source describes an Ocean course, stationary non-firing bots, a 30-minute limit, a 10% increase to Race winnings for the first finisher and a 10% reduction for a participant who dies.

The current DWBOT C01 Race score uses inverse elapsed seconds, so faster time produces a larger performance share. The source workbook uses raw time and differs. Check the current event notice for the exact Race mode and duration: the Pilot, recurring map table and Race narrative conflict on the Ocean special-mode label and time limit.

## 7. Replays, screenshots and corrections

- Retain original screenshots and replays until the event's published retention period ends.
- Use the official reporting channel; do not post private account data or staff-only moderation information publicly.
- If a screenshot is unreadable, submit the original and flag it for review.
- If a score is wrong, submit a correction with the match/game ID and original evidence. Do not edit the source screenshot.
- If a dispute concerns the referee, match host or scorekeeper, request independent review through the published appeal route.

**PROPOSAL:** publish a correction deadline and appeal window with every event. The supplied sources do not establish one universal deadline.

## 8. Streaming and conduct

The recurring source specifies a minimum five-minute stream delay and additional rules for VOD availability, neutral presentation, facecam and conflict of interest. Streamers must read the current event broadcast policy before receiving room access.

Play respectfully. No deliberate throwing, trolling, harassment, stalling or unauthorized assistance. Report technical problems early. Keep match discussion factual and use the referee/appeal process rather than public accusations.

## 9. Quick answers

**Does the highest-damage team automatically win the bracket match?**  
No. Verified match outcome controls bracket advancement. Damage is a separate individual award/standing metric.

**Do I keep the same teammates every week?**  
No. The recurring source uses a new random draft each week.

**Can I use a carrier or submarine?**  
Human-player carriers and submarines are excluded by the supplied recurring rules. Always check the current event ship list. Bot compositions may differ.

**Can I use last week's ship list or map pool?**  
No. Configurations change frequently.

**What if the OCR bot reads the wrong number?**  
The OCR result is not automatically accepted. Preserve the original screenshot and request a review. An unresolved field remains unresolved until supported by evidence.

**What if the room settings are wrong?**  
Tell both representatives and the referee before ready-up. The event's published restart/invalid-room rules apply.

---

## Current game terminology

- **DD / Destroyer:** often scouts, contests objectives and uses concealment/torpedoes.
- **CA / Cruiser:** flexible support, screening and fire support.
- **BB / Battleship:** heavy gun platform and anchor; plan turns and exposure.
- **Spotting / concealment:** detection depends on range and line of sight; firing main guns can increase detectability.
- **Crossfire:** two firing angles that pressure the enemy to turn or expose a broadside.
- **Cap / reset:** capture objective and the act of interrupting enemy capture progress.
- **Radar / hydro / smoke:** ship-specific tools; smoke obscures line of sight but is not immunity.

Use the current World of Warships Wiki and the current event rules for exact mechanics and ship-specific values.

## Related documents

- [Admiralty × YOLO Mock Tournament Field Guide](Admiralty_YOLO_Mock_Tournament_Field_Guide_v0.1_PROPOSAL.md)
- [Admiralty × YOLO Mock Tournament HTML](Admiralty_YOLO_Mock_Tournament_v0.1.html)
- [Event Night Operations Manual](YOLO_Event_Night_Operations_Manual_v0.1_PROPOSAL.md)
- [Scoring and Standings Explainer](YOLO_Scoring_and_Standings_Explainer_v0.1_PROPOSAL.md)
- [Source Reconciliation and Visual Provenance](Admiralty_YOLO_Source_Reconciliation_and_Visual_Provenance_v0.1.md)

**Final reminder:** Tournament configurations often change. The latest event notice and signed settings—not this general guide—control the actual event.
