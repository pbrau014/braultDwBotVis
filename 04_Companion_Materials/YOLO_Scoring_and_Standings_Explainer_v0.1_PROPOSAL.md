# YOLO Tournament — Scoring & Standings Explainer

**Version:** v0.1 proposal / source explanation  
**Audience:** Participants, team representatives, scorekeepers, event directors and reviewers  
**Status:** This document explains the supplied historical workbook and the current DWBOT scoring implementation. It is not a live prize schedule or approval of a canonical workbook.

## 1. Four different results

| Result | Question it answers | Used for |
|---|---|---|
| Battle result | Did the battle end in Win, Loss or Draw? | Match record and bracket logic |
| Match / series result | Which team won the match under the event rules? | Bracket advancement |
| Individual event score | What did this player's event formula calculate? | Event reward / standings |
| Cumulative damage standing | How much eligible damage has the player accumulated under the season rules? | Damage awards and Grand YOLO placement |

**Do not collapse these into one number.** A high-damage loss is still a loss for bracket advancement. A low-damage win still advances the team if the event rules say it does. Damage awards and match wins are separate outputs.

## 2. Source workbook status

The supplied Discord scoring explanations and `test27xlsm.xlsm` describe four historical event sheets:
- `Event1-Damage`
- `Event2-Kills`
- `Event3-Race`
- `Event4-GrandYolo`
- `Tourney Totals`

The supplied workbook is an archival sample, not the designated canonical workbook. It explains the historical scoring logic and is useful for regression tests, but it does not certify current prize settings or live event results.

## 3. Damage and Kills

The historical workbook and current DWBOT engine use a share-based calculation for each of the seven game entries.

`Event Doubloons = 2 × multiplier × pool × Σ[classWeight × (gameMetric / eventTotalMetric) / tier^tierPower]`

Where:
- `gameMetric` is damage for Event 1 or kills for Event 2.
- `eventTotalMetric` is the sum of the same metric across all eligible players/games in that event.
- `classWeight` is the configured class weight.
- `tier` is the ship tier.
- `tierPower` is the configured tier exponent.
- `pool` is the event pool.
- `multiplier` is the event multiplier (sample default 1).

The archival sample defaults are pool 500, multiplier 1, tierPower 1, and class weights DD=4, CA=3, BB=2. The current event settings may differ; publish the actual values before play.

### Worked damage example

Assume:
- Pool = 500
- Multiplier = 1
- DD class weight = 4
- Tier = 2
- Game damage = 20,000
- Total event damage = 1,000,000
- TierPower = 1

`2 × 1 × 500 × [4 × (20,000 / 1,000,000) / 2] = 40`

That game contributes 40 Doubloons. If the player records the same contribution across seven games, the total is 280 Doubloons. This is the example used in the supplied Discord guide; it is illustrative, not a prize promise.

### What the formula rewards

The player's share of event-wide damage/kills determines the contribution. Class weight and tier power adjust it. A high raw damage number alone is not enough to know the reward: the event-wide total, ship class, tier, pool and multiplier all matter.

## 4. Race — current DWBOT C01 policy

The archival workbook's Race sheet uses elapsed seconds directly as the performance share. That reverses the intended reward: a slower time can receive a larger share.

DWBOT policy C01 uses inverse elapsed seconds:

`RaceShare_i = (1 / seconds_i) / Σ(1 / seconds_j)`

The current DWBOT core and standalone HTML calculator have been changed to use this inverse-time share. The archival workbook and Discord texts remain unchanged as historical evidence. Exact-head CI/browser verification is required before declaring implementation parity passed.

### Worked Race example

Two eligible players have the same class weight (DD=4) and tier (2):
- Player A: 60 seconds
- Player B: 120 seconds

Inverse times:
- A: 1/60
- B: 1/120

Shares:
- A: (1/60) / (1/60 + 1/120) = 2/3
- B: (1/120) / (1/60 + 1/120) = 1/3

Using pool 500, multiplier 1, class weight 4 and tierPower 1:
- A: `2 × 500 × 4 × (2/3) / 2 = 1,333.33`
- B: `2 × 500 × 4 × (1/3) / 2 = 666.67`

The faster player receives twice the share. This example is only a formula illustration; event settings determine the actual pool and award.

### Race side-event rules from the recurring source

The recurring YOLO source describes a Race every third week, one hour before the regular event, for the lower 50% of participants by cumulative damage. It describes an Ocean route, stationary non-firing bots, a 30-minute limit, a 10% increase to Race winnings for the first finisher, and a 10% reduction for a participant who dies.

The Pilot and recurring materials conflict on the Ocean special-mode label and duration. Confirm the exact current-client mode and the event settings before announcing Race.

## 5. Grand Yolo — historical Round 4 score

The archival workbook combines seven game entries using class, tier, damage, kills and elapsed time, then weights the player's contribution by their share of total Grand Yolo damage.

`GrandScore = multiplier / 3 × (playerDamage / totalDamage) × Σ[classWeight × perGame]`

Where:

`perGame = 100 × tierWeight / tier`
`        + damage × damageWeight / (tier × 1000)`
`        + 10 × kills × killsWeight / tier`
`        + 5000 × timeWeight / elapsedSeconds`

The sample Grand settings use tierWeight 0.9 and damageWeight, killsWeight and timeWeight 1. The current DWBOT engine stores a Grand pool setting but the observed formula does not use that pool cell. The archival workbook's class-preference controls are also not referenced by the per-game formula.

The Grand formula is not a team match win/loss formula. It does not determine bracket advancement by itself.

### Do not confuse the two Grand YOLO names

- **Grand Yolo Round 4:** an individual weighted score sheet in the historical workbook.
- **Grand YOLO finale:** the proposed season-ending championship event with its own match/bracket rules and cumulative damage standings.

The event settings must explicitly state whether and how the Round 4 score is used in the finale.

## 6. Tourney Totals — historical summary columns

The archival workbook's summary tab:
- Adds the four event Doubloon totals.
- Calculates average damage from Event 1 total damage and Grand Yolo total damage.
- Calculates average tier across 21 entries from Events 1, 2 and 4.
- Calculates average kills across seven Event 2 games.
- Calculates average class weight across 21 entries from Events 1, 2 and 4.
- Maps average class weight to a class label: DD above 3.6; CA from 2.7 through 3.6; BB below 2.7.
- Shows a historical dollar-equivalent formula: `0.54 × Doubloons / 100`.

The dollar-equivalent value is a workbook conversion, not an official Wargaming purchase value, exchange rate or promised prize.

## 7. How the tournament uses the scores

### Pilot
The Pilot is a rehearsal and its own event. Use the Pilot's stated result/award rule. Do not silently seed the regular season from Pilot results unless the event notice says so.

### Recurring weekly events
- Verified match wins advance teams through the weekly bracket.
- Individual damage determines the nightly damage awards and contributes to cumulative Grand YOLO damage standings.
- Race is a separate side event on the specified weeks; its damage and rewards follow the approved Race settings.

### Playoffs and Grand YOLO
The supplied YOLO rules do not fully specify a separate season-playoff field or bracket. The current top-eight, six-of-twelve and best-of series plan remains a proposal. Publish the exact qualifying metric, tie-breakers, seeds, bracket, byes, series length and award formula before the playoffs begin.

## 8. Evidence integrity and DWBOT

A score is only as reliable as the battle record it came from. DWBOT requires nine mandatory fields, in this exact order:

1. `result`
2. `player`
3. `map`
4. `mode`
5. `battleStart`
6. `credits`
7. `freeXp`
8. `damage`
9. `xp`

The approved OCR pipeline is OCR.Space Engine 2 on the original screenshot -> searchable PDF -> validated PDF download -> bounded local raster from the PDF -> local readers on that PDF-derived raster. A reader's candidate is not an accepted value until field-specific validation succeeds. If a mandatory value is unclear, preserve it as unresolved and request a review. Never fill a field from another player's record or infer it from the score equation.

## 9. Recommended publication of a score report

Every public score report should show:
- Event/settings version.
- Participant/game ID.
- Verified battle result and match/series result.
- Individual damage and any other event metric.
- Formula version and weights used.
- Provisional or final status.
- Any correction/appeal status.
- Link/reference to the source evidence record without exposing private data.

A score report should not show OCR confidence as if it were a prize result. It should distinguish candidate extraction, verified input and accepted score.

## 10. Current implementation and verification status

The DWBOT core and standalone HTML calculator have been changed to use inverse-time Race scoring under C01. A regression test asserts that a 60-second result earns more than a 120-second result under equal class/tier conditions. Exact-head CI and browser verification remain pending; no successful parity result is claimed until those checks complete.

The source workbook and Discord texts remain unchanged. The live canonical workbook and signed event settings remain required before score/prize certification.

## 11. References

- [YOLO recurring rules source](../dwbotStuff/yolo_rules_xmpl.docx)
- [YOLO Pilot source](../dwbotStuff/yolo_event.docx)
- [Discord workbook explanation](../dwbotStuff/discordMsgs/how%20yolo%20wkbk%20work%20discord.txt)
- [Discord scoring guide](../dwbotStuff/discordMsgs/yolo%20scoring%20guide%20discord.txt)
- [Historical workbook sample](../dwbotStuff/test27xlsm.xlsm)
- [Historical score formula image](../dwbotStuff/mtheqfnl.jpg)
- [Admiralty × YOLO Source Reconciliation](Admiralty_YOLO_Source_Reconciliation_and_Visual_Provenance_v0.1.md)
- [Participant Quick Start](YOLO_Participant_Quick_Start_and_Evidence_Submission_Guide_v0.1_PROPOSAL.md)
- [Event Night Operations Manual](YOLO_Event_Night_Operations_Manual_v0.1_PROPOSAL.md)

**Configuration warning:** Tournament configurations often change. Recheck the current event notice, signed settings and canonical scoring workbook before each event.
