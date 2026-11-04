**Package release:** v3.22 production documentation release. Publication content and filenames retain the v3.19 lineage, with v3.21 policy and formatting updates included.

**Prepared:** 29 October 2026.

**Status:** PRODUCTION DOCUMENTATION RELEASE (v3.22) — accepted under the user-directed release-gate waiver. This status applies to the documentation package; it does not claim that unrun technical tests passed or that any specific event or runtime build is approved.

**Content-control rule:** Substantive policy is preserved from v3.15. Editorial wording, document placement, and navigation may change; no event values, signatures, technical test results, or approvals have been invented. See the source manual retained in the release package for the complete baseline.

**Source baseline:** Grand_Tournament_Instruction_Set_v3.15_Policy_Resolved. This role-based publication reorganizes source material; consult the included v3.15 source baseline for audit traceability.

# Participant Guide

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Start with the governing format and follow the matching procedure; do not assume every event uses the same rules.</div>
## Start here
Use the event-specific ruleset that has actually been approved for your event. If no approved ruleset or dated event settings are supplied, do not assume a pilot rule applies to a recurring event or vice versa.

### Quick decision path
1. **Before registering:** Confirm the event format, eligibility, roster, ship restrictions, and published schedule.
2. **Before a match:** Follow the applicable room, lineup, timer, and ready-up instructions issued by the authorized host/referee.
3. **After a match:** Submit the required evidence using the event’s declared process. Do not treat an OCR value, screenshot, calculator result, award, and match result as interchangeable.
4. **If information conflicts:** Preserve evidence and request an authorized ruling; do not self-resolve a scoring or bracket dispute.
5. **For gameplay advice:** Treat tactics as guidance, not as a replacement for event rules.


**Reader boundary:** This guide explains participant-facing procedures; the declared event format and approved Event Settings control where formats differ.

## Document map
This guide contains the general tournament rules, individual gameplay strategy, competitive tactics, combat mechanics, performance-claim evidence cards, and related reference material. Scoring formulas and implementation limits are in the Technical Reference; organizer workflows are in the Event Operations Manual.

### Contents
- [📘 Chapter 1 — General Tournament Rules & Procedures](#section-1)
- [🎯 Chapter 5 — Individual Game-Strategy Guide](#section-2)
- [⚓ Chapter 6 — Competitive Tactics Procedure](#section-3)
- [💥 Chapter 8 — Damage & Combat Mechanics Procedure](#section-4)
- [Appendix I — Competitive tactics reference I01–I13](#section-5)
- [Appendix M — Performance-claim evidence cards M01–M07](#section-6)
- [Appendix P — Damage, fires, flooding, and secondary brawling mechanics P01 – P11](#section-7)

---

<a id="section-1"></a>
# 📘 Chapter 1 — General Tournament Rules & Procedures

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the verified match outcome for bracket advancement. Calculate that outcome from individual performance across the published game metrics (such as Damage and Kills) using the approved scoring method and tie-break rules.</div>
## 🏆 1.1 — Performance-based match outcomes determine bracket advancement

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the verified match outcome for bracket advancement. Calculate that outcome from individual performance across the published game metrics (such as Damage and Kills) using the approved scoring method and tie-break rules.</div>
🗺️ Procedure

> 🧮 1.  Identify the approved workbook and formula version in the approved event-settings record.
>
> 👥 2.  Record which event rounds contribute, how participant values are aggregated, how displayed precision is handled, and how ties are settled.
>
> 🏆 3.  Calculate the participant's dblns result using the approved workbook; retain input evidence and the exact workbook/version.
>
> 🏆 4.  Calculate the match outcome using the published scoring method applied to individual performance across the applicable game metrics (including Damage and Kills) and the published tie-breaks. Use the verified outcome for bracket advancement. Retain each participant’s `dblns` result as an auditable calculation output; its role in the outcome is set by the approved formula, and any separate award or seeding use must be expressly authorized.
>
> 🏆 5.  If data, results, formula versions, or settings disagree, pause the affected bracket action. Record the discrepancy and obtain an authorized ruling before proceeding.

The scoring workflow and parity checks are set out in Chapter 7 of the Technical Reference. The equation and multiplier explanations are in Appendix K of the Technical Reference. Public ship statistics in Appendix L of the Technical Reference can inform test cases but cannot prove formula correctness.

✅ **Done when:** The workbook/version, inputs, unrounded calculation trail, participant dblns result, and any tie decision are recorded; unresolved discrepancies are held for an authorized ruling.


**Keep linked records distinct:** accepted participant metrics and calculated outputs support the event-approved match-outcome calculation; the verified match outcome drives bracket progression. Retain each `dblns` value for audit, and use it for an additional individual award or seeding purpose only where published settings expressly authorize it.

## 🎯 1.2 — Select the governing format before announcing the event

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Confirm the declared event format before applying eligibility, roster, timing, or award rules.</div>
| **⚙️ Procedure**            | ** Pilot Event**                                          | ** Detailed recurring format**                                       |
|-----------------------------|-------------------------------------------------------------|------------------------------------------------------------------------|
| 📚 Governing rules document | yolo_event.docx                                             | yolo_rules_xmpl.docx                                                   |
| 📘 Participation            | Apply the published pilot drop-in/cutoff wording            | Apply published registration, roster, and eligibility controls         |
| ⚙️ Lineup visibility        | Use visible lineup only where the pilot settings declare it | Keep lineups hidden until both sides and slots are correctly organized |
| ⚙️ Settings                 | Simplify only what the pilot expressly changes              | Use the full event settings and reporting/replay controls              |
| 🧯 Exceptions               | Pilot-only; do not transfer automatically                   | Recurring rules; do not inherit pilot exceptions silently              |

> ⚖️ Rule — Normal case first; conflicts remain separate situations, not blended rules. The approved rules, dated event settings, and workbook decide the normal case. Appendix B of the Technical Reference illustrates how disagreements can arise; an authorized ruling resolves them.
>
✅ **Done when:** The applicable format and rule source are explicitly selected, conflicting alternatives are resolved by an authorized decision, and dated event settings match the selected format.

## 📣 1.3 — Prepare and approve the event

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</div>
> 👥 1.  Choose the event format and owner. Confirm the document model, eligibility and roster settings, and schedule structure before announcing the event.
>
> ⏱️ 2.  Complete the approved event-settings record. Fill every applicable field or mark it “not used”; give each configurable item an approved value, version, approver, and effective time.
>
> 👥 3.  Open registration and communications: apply the approved event rules; publish deadlines, participant identity mapping, support routes, and official notice process.
>
> ⏱️ 4.  Publish fixtures and rules: identify stage, opponent, time zone, room host, applicable settings version, reporting requirements, and dispute contact.
>
> 🔄 5.  Test the process: run a controlled walkthrough of room preparation, screenshot intake, corrections, official record entry, restart logging, and fallback routes.
>
> ⚙️ 6.  Stop before opening if a mandatory setting or release gate is missing (Appendix G of the Event Operations Manual).
>
✅ **Done when:** The event settings, owner, approver, effective time, schedule, notices, support route, and evidence process are complete and approved before registration or play begins.

## 🗺️ 1.4 — Operate each match

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</div>
> 👥 1.  Check in: participants and representatives monitor official notices and arrive within the declared attendance window (as stated in the approved event rules).
>
> ⚙️ 2.  Create the room: assigned host opens the Training Room, invites the opponent and authorized observers, and identifies the match/game (as stated in the approved event rules).
>
> 👥 3.  Verify settings: both representatives check the fixture's mode, map, timer, sides/spawns, player slots, lineup legality/visibility, and observer permissions (the approved event rules and the approved event-settings record).
>
> ⚙️ 4.  Resolve objections before ready-up: record corrections; if unresolved, contact the referee. Do not start under contradictory settings.
>
> ⏱️ 5.  Play and document incidents: use the applicable clock, restart, and lineup-change rules (the approved event rules and the approved event-settings record). Different clocks remain distinct; see the matching situational examples.
>
> 👥 6.  Submit evidence: each participant supplies the required readable post-game screenshot. Preserve replays and incidents under the approved event rules.
>
> ⏱️ 7.  Validate the official record: the scorekeeper checks evidence, enters results, retains corrections, and routes disputes under the approved event rules and the approved event-settings record.
>
> 🏆 8.  Recalculate the published performance-based match outcome from accepted inputs and verified calculation outputs, apply published tie-breaks, and update the bracket only after the outcome is checked. Retain participant-level `dblns` values and the full calculation trail. If inputs or scoring outputs conflict, pause advancement and obtain an authorized ruling rather than guessing or silently changing the outcome.
>
✅ **Done when:** The room matches approved settings, both lineups are legal and ready, the correct timing rule is applied, and the result and supporting evidence are recorded.

## 🔄 1.5 — Enforce the normal timing and restart procedure

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
Use the detailed recurring rules as the normal baseline unless the selected format's approved settings state otherwise:

📋  Timing and restart rule: apply the approved event rules and settings record first; use the normal thresholds below only where no authorized event-specific setting differs.

⏱️  Attendance: allow 10 minutes from the scheduled start, or use the published between-game clock.

⏱️  No-show: apply the published outcome for one or both absent sides and preserve timestamp evidence.

🔄  Restart grounds: qualifying load/disconnect, incorrect settings/sides/spawns, bugged spawn, or official fault; report promptly.

⏱️  Request cutoff: allow 2 minutes of game time, except for documented official faults.

⏱️  Restart window: allow 5 minutes from the call; keep this clock separate from attendance timing. See Appendix B of the Technical Reference for examples.

👥  Per-team allowance: allow one team-requested restart per team in best-of-one/two/three, and two in best-of-five. Official-fault restarts do not count; record the chosen limit and any exceptions.

These are default thresholds from the detailed rules. Record any authorized format-specific values in the approved event-settings record. If published rules, dated settings, or other controlling records conflict, pause the affected decision and obtain an authorized ruling; do not improvise a threshold.

✅ **Done when:** The correct no-show and restart thresholds are applied, separate clocks/quotas are recorded, and the restart, continuation, or ruling is documented before the next match step.

## 📣 1.6 — Close the event

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
> 👥 1.  Reconcile participant evidence with official records; record missing/ambiguous evidence and resolve disputes (as stated in the approved event rules).
>
> 🏆 2.  Compute or import the approved dblns result and verify round aggregation with the identified workbook version (Chapter 3 of the Technical Reference; Appendix K of the Technical Reference; and the internal reconciliation record).
>
> 🏆 3.  Publish only approved standings/awards and explain any correction within the published appeal rules (as stated in the approved event rules).
>
> ⚙️ 4.  Archive versioned settings, evidence, corrections, replays, rulings, and final results for the declared retention period (as stated in the approved event rules).
>
> ⚙️ 5.  Close required release gates, complete the publication-approval record, and freeze the issued rules/settings version (Appendices G–H).  
✅ **Done when:** Results and evidence are reconciled, open disputes have an owner and status, official standings and progression are confirmed, and required retention and award actions are recorded.

<a id="chapter-2-discord-bot-operations-manual"></a>

⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ 
<a id="section-2"></a>
# 🎯 Chapter 5 — Individual Game-Strategy Guide

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Use this chapter to make the next in-game decision; it is not a tier list or a promise of damage. Recurring-format bracket advancement follows the verified match outcome, calculated from individual performance across the applicable published metrics (such as Damage and Kills) under the approved scoring method and tie-break rules. Participant-level `dblns` is a traceable calculated output; its role in the outcome is governed by the approved formula, and any additional award or seeding use must be expressly authorized. For tactical procedures, see Chapter 6 and Appendix I; for damage-system procedures, see Chapter 8 and Appendix P. Appendix K of the Technical Reference defines the scoring calculation, Appendix L of the Technical Reference supplies public descriptive benchmarks, and Appendix M treats performance claims as testable hypotheses.

## ⏱️ 5.1 — Prepare the ship and identify a useful firing window

> ⚙️ 1.  Check event legality, the selected ship's actual build, range, ammunition, consumables, armor, concealment, and viable retreat route. The supplied general ship guide focuses on solo Random Battles and may not describe tournament or Clan Battles priorities; event settings and the current client take precedence.
>
> ⚙️ 2.  Read the minimap, target direction/speed, likely loaded guns, cover, torpedo lanes, and how long the target will remain exposed.
>
> 📣 3.  Choose repeatable opportunities over a low-probability highlight salvo; the personal objective is realized output under the approved score, not a speculative damage estimate.
>
✅ **Done when:** The player selects a workable position and target window based on range, line of fire, target behavior, and exposure cost.

## 🎯 5.2 — Select a target and ammunition

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Before firing, compare hit probability, angle, armor, shell travel time, target HP, saturation state, reload window, and exposure cost. Use Appendix I for target-selection prompts and Appendix P for penetration, overpenetration, and saturation mechanics. A broadside cruiser may offer higher-variance citadel potential; an angled battleship may offer steadier direct/fire damage only if the ammunition can interact with its armor. Choose based on the current shot, not a universal AP/HE rule.

🎯 Damage decision workflow: select a realistic shot, observe the result, change the aim point or target, and verify actual damage after battle.

✅ **Done when:** The selected target, ammunition, and aim point fit the target’s aspect/armor and the actual firing opportunity; the next action uses observed results.

## ⏱️ 5.3 — Preserve aim uptime while avoiding unnecessary exposure

During reload, plan the next rudder/speed change, turret alignment, angle, and exit path. Maneuver to disrupt incoming aim without constant unpredictable zigzags that spoil your own lead. Under sustained fire, begin opening distance while there is still room to turn; do not expose a flat broadside simply to dodge one salvo. Use Appendix I for tactical prompts and Appendix P for damage-control, repair, HP, and reload mechanics.

✅ **Done when:** The player balances useful firing time against incoming risk and repositions or disengages when continued exposure has a worse expected trade.

## ⏱️ 5.4 — Apply damage-over-time and manage health

Use fires, flooding, DCP, Repair Party, and Adrenaline Rush according to the actual ship and threat state. Assess active effects, duration, likely follow-up damage, cooldown, repairability, remaining HP, and expected future firing cycles; do not use an inflexible rule such as always saving DCP until multiple fires. Appendix P centralizes detailed mechanics and limits.

✅ **Done when:** Fire/flooding and repair decisions reflect current effects, ship capability, remaining HP, and expected future threat rather than a fixed rule.

## 🎯 5.5 — Adapt the role to a personal damage opportunity

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
⏱️  Destroyer: use concealment, detection edges, terrain, gun/consumable cooldowns, and torpedo geometry to create short, survivable damage windows (see Appendix I). Do not chase a low-HP target through multiple loaded opponents solely for a possible finish.

⏱️  Cruiser: maintain a kiting/cover path, exploit quality broadside windows, and use radar/hydro only within the ship's actual current range (see Appendix I). Avoid a risky broadside for a speculative citadel.

⏱️  Battleship: align guns while repositioning, favor penetrable broadside windows over the nearest target by habit, and spend remaining HP before the endgame removes the firing opportunity (see Appendix I).

🧯  Against a stronger ship: compare armor interactions, arcs, concealment, speed, reload timing, terrain, and exit options; avoid mirroring a larger ship's brawl by default (see Appendix I for tactics and Appendix P for mechanics).

✅ **Done when:** The action fits the ship’s class and the current team situation while preserving a realistic opportunity for useful personal output.

## 🎯 5.6 — Commit to a brawl only when the setup supports it

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Brawling can layer main guns, automatic secondaries, torpedoes where fitted, armor, and damage-over-time, but the ship's real build and threat geometry determine whether it is viable. Start from a position where you can still contribute, identify an isolated or constrained target, and close only after reviewing incoming crossfire, torpedoes, hydro/radar, HP, DCP, and escape routes. Use Appendix I for tactical prompts and Appendix P for mechanics; follow the controlled-brawling flow below and verify skills, upgrades, ranges, and names in the current client.

Controlled-brawling flow: observe and set up, identify a favorable entry, close at an angle, convert range into damage, then disengage or reset when the trade turns poor.

✅ **Done when:** The target is isolated or constrained, the entry trade and weapon capability are favorable, and a viable exit remains; otherwise the player delays or declines the brawl.

## 📸 5.7 — Review individual performance using evidence

After each battle, record the official post-battle Damage statistic required by the approved scoring method. Count realized damage—not potential or expected future damage. Submit the screenshot through Section 2.3 of the Event Operations Manual; keep Kills, Damage, Race/time, and other inputs separate under the active workbook specification. For controlled learning, use the Training Room experiment that holds the ship, build, target, map, range, angle, and exposure time steady while changing one variable at a time; compare repeated scenarios and use means and medians where benchmarks permit (Appendix L of the Technical Reference).

✅ **Done when:** The review uses actual post-battle records and comparable trials, and separates observed performance from assumptions or unverified explanations.

## 🧭 5.8 — Keep claims, mechanics, and event rules separate

The performance statements collected in the performance-claim tests are not presumed true or false merely because a player believes them. Test them against matched personal samples and current public ship data, controlling for ship/tier, mode, map, build, target availability, and sample size. The results are descriptive and do not validate the scoring formula. Event-specific ship legality, maps, and settings remain in the approved event-settings record and the approved rules, not in this coaching section.  
✅ **Done when:** The player can distinguish event policy, verified game mechanics, and performance hypotheses, and does not use one category as proof of another.

<a id="chapter-6-competitive-tactics-procedure"></a>

⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ 
<a id="section-3"></a>
# ⚓ Chapter 6 — Competitive Tactics Procedure

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Use this chapter as a repeatable decision route for individual output. It is tactical guidance, not an event-rule override or a guarantee of damage; the approved workbook and Event Settings Sheet remain controlling.

## 🧭 6.1 — Set the objective and prepare the ship

> 🧮 1.  Confirm the active event format, legal ship/build, and the approved scoring objective under Section 1.1 and the approved event rules before choosing a risk or target.
>
> 🎯 2.  Check weapon range, shell types, armor scheme, concealment, turret arcs, consumables, reload cycle, and a viable exit route for the ship actually being used.
>
> ⏱️ 3.  Read range, target direction/speed, cover, likely enemy reload status, torpedo lanes, and the time a target will remain exposed; favor repeatable firing windows over speculative highlight shots.
>
✅ **Done when:** The objective, ship/build, position, and risk limits are clear before committing to a target or maneuver.

## 🎯 6.2 — Select a target and commit a salvo

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
> ⏱️ 1.  Estimate realistic hit probability and damage per hit, accounting for target angle, armor, remaining HP, saturation, shell flight time, and the number of salvos likely to fit in the exposure window.
>
> 🏆 2.  Consider a finishing opportunity only when the active scoring definition awards value for a kill; do not abandon a reliable damage opportunity for an unsupported kill bonus.
>
> ⏱️ 3.  Compare likely realized output against exposure, incoming crossfire, travel/reposition time, loss of firing lanes, and the chance of being sunk before later salvos.
>
> ✏️ 4.  After the shot, observe the actual result and adjust the aim point, ammunition, or target; do not treat estimated fire/flood ticks as credited damage before they are recorded.
>
✅ **Done when:** A target is chosen for a defensible tactical opportunity, shot value is considered, and observed impact informs the next decision.

## 🛡️ 6.3 — Preserve aim uptime while evading

> ⏱️ 1.  Use reload time to plan rudder, speed, angle, turret alignment, and the next firing opportunity; avoid chaotic turns during the actual aiming window.
>
> ⚙️ 2.   Under sustained fire, begin opening distance while there is room to turn, and preserve an angle that avoids unnecessary broadside exposure.
>
> ⏱️ 3.  Reposition behind cover or break detection when the expected damage from continuing to fire is outweighed by the risk and lost future firing time.
>
✅ **Done when:** The player maintains useful fire when practical, avoids predictable damage, and breaks contact or repositions when survival and future output require it.

## 🚢 6.4 — Apply the class-specific route

> 🔥 1.  Destroyer: use concealment edges, terrain, detection, gun reloads, and torpedo geometry to create short, survivable opportunities; do not chase a low-HP target through several ready opponents solely for a finish.
>
> ⏱️ 2.  Cruiser: preserve a kiting or cover path, exploit good broadside windows, and use radar/hydro only within the ship’s actual current capability; avoid a risky broadside for a low-probability citadel.
>
> ⏱️ 3.  Battleship: align the guns while repositioning, favor penetrable high-value targets over the nearest target by habit, and spend useful firing time before the endgame closes the opportunity.
>
> 🎯 4.  Against a stronger hull, compare armor interactions, gun arcs, concealment, speed, reload timing, terrain, and exit options instead of copying the opponent’s close-range plan.
>
✅ **Done when:** The action reflects class capabilities and threat geometry rather than copying an opponent’s preferred engagement.

## 🔥 6.5 — Use controlled aggression for brawling

> 🎯 1.  Set up at a range where the ship can still contribute and observe enemy deployment, island lanes, loaded guns, torpedo threats, and retreat paths.
>
> ⏱️ 2.  Identify an isolated, constrained, distracted, or retreating target and assess the time required to enter effective main-battery or secondary range.
>
> 🎯 3.  Commit only when the entry trade is favorable; approach at an appropriate angle, keep useful turret arcs, exploit the ship’s actual secondaries/armor/hydro/torpedoes, and maintain an exit.
>
> 🔄 4.  Disengage or reset the position when crossfire, consumable state, remaining HP, or lost firing opportunity makes the close-range trade poor. The measure is realized output before exposure ends, not merely entering secondary range.
>
✅ **Done when:** The push begins only when target, entry trade, consumable state, and exit route justify it; the player disengages when the trade deteriorates.

## 🧪 6.6 — Train, record, and improve

> ⚙️ 1.  In a Training Room, hold the ship/build, target, map/mode, range, target aspect, and exposure interval as constant as possible; change one variable per pair of trials.
>
> 🏆 2.  Record ship/tier/class, ammunition, target angle, game time/exposure, personal damage, personal frags, and approved `dblns` output; compare matched cases rather than single highlights.
>
> 🤖 3.  Use both mean and median when interpreting public benchmarks, and treat ship-level averages as descriptive context—not proof that scoring weights are correct.

🔗 Full tactical reference: Appendix I contains detailed target choice, evasion, class roles, HUD use, brawling, and practice material.  
✅ **Done when:** Matched trials keep relevant conditions stable, change one variable at a time, and record actual outcomes without treating averages as proof of formula correctness.

<a id="chapter-7-scoring-equation-workbook-verification-procedure"></a>

⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ 
<a id="section-4"></a>
# 💥 Chapter 8 — Damage & Combat Mechanics Procedure

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Use this procedure to connect the game’s damage systems to observable individual output. This is the operational summary; detailed mechanics, values, exceptions, and refresh notes remain in Appendix P.

## 🔥 8.1 — Identify the damage mechanism

> ⏱️ 1.  Classify the event as direct shell damage, torpedo damage, fire, flooding, or a combination; distinguish damage already recorded from potential future damage-over-time.
>
> ✏️ 2.  For shell hits, distinguish a citadel/critical penetration, an ordinary section hit, an over-penetration, and damage affected by saturation; the correct category depends on ship type, armor geometry, section state, and shell behavior.
>
> 🔥 3.  For fire/flood effects, check which effects are active, their remaining duration, the ship’s current speed/visibility risk, and the expected follow-up exposure before making a consumable decision.
>
✅ **Done when:** The observed result is classified by mechanism and recorded damage is kept separate from potential future damage-over-time.

## 🎯 8.2 — Choose ammunition and aim point

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
> ⏱️ 1.  Check target aspect, armor thickness/angle, range, ship type, shell travel time, and the intended impact section before selecting AP, HE, or SAP where available.
>
> ⚖️ 2.  Prefer a high-probability, useful impact over a visually appealing but unlikely citadel attempt; move the aim point when repeated hits produce poor results or the section is saturated.
>
> ⏱️ 3.  After each salvo, inspect the observed damage and penetration indicators, then adjust ammunition or target selection for the next available firing window.
>
✅ **Done when:** Ammunition and aim point follow target aspect, armor interaction, range, and observed hit feedback; the choice is reviewed after the salvo.

## 🧯 8.3 — Manage damage-over-time, repair, and survival

> 🔥 1.  Assess fire/flood count and expected duration alongside incoming threats, reload cycles, remaining HP, and the ship’s available Damage Control Party and Repair Party capability.
>
> 🔥 2.  Do not apply an absolute rule that a single fire must always be ignored or always extinguished; decide from the actual ship, current effect, expected future damage, and consumable state.
>
> 🔥 3.  Account for the trade between remaining alive to create more firing cycles and staying exposed to exploit current output; low HP has no value if the next unavoidable salvo ends the opportunity.
>
✅ **Done when:** Consumable use reflects active effects, remaining HP, future exposure, and actual ship capabilities instead of an absolute single-fire rule.

## ⚓ 8.4 — Apply combat mechanics to close-range decisions

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
> 🔥 1.  Before a push, check armor scheme, effective angle, secondary range/build, hydro, torpedoes, turret handling, heal/DCP state, incoming crossfire, and the retreat route.
>
> 🧭 2.  Set up at a workable range, identify a favorable isolated or constrained target, then close only when entry risk is justified; avoid an opening rush into several ready opponents.
>
> ⏱️ 3.  Leave or reset the engagement when multiple threats can focus the ship, aim/fire uptime falls, the exit is lost, or the next close-range exchange is unlikely to repay the HP spent.
>
✅ **Done when:** The decision accounts for armor/angle, weapon range, consumables, crossfire, and an exit route before committing.

## 🧪 8.5 — Verify mechanics in controlled practice

> ⚙️ 1.  Fix the ship/build, target, range, aspect, map/mode, and exposure interval as closely as possible.
>
> ⏱️ 2.  Change one factor at a time: ammunition, aim point, section saturation, DCP timing, maneuver timing, or brawl-entry trigger.
>
> 🧮 3.  Record realized post-battle damage and relevant personal metrics, and keep game-mechanics observations separate from the scoring formula’s approved input/weight rules.

🔗 Full combat-mechanics reference: Appendix P contains detailed mechanics, values, brawling traits/builds, tests, and the evidence-refresh policy.  
✅ **Done when:** Trials record the chosen mechanic, controlled conditions, post-battle output, and uncertainty; observations stay separate from the tournament scoring formula.

<a id="appendix-a-decision-register-d01d52"></a>

<a id="section-5"></a>
# Appendix I — Competitive tactics reference I01–I13

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
These are quick prompts, not a second tactics chapter. Follow Chapters 5–6 for the procedure, Chapter 8 for combat mechanics, and Appendix K of the Technical Reference for the scoring equation.

## I01 — Governing objective: accurate individual-performance inputs and match-outcome progression

Improve the personal inputs that feed the published scoring method. The validated scoring workflow must calculate participant-level outputs from accepted Damage, Kills, time, and other applicable metrics, then apply the approved calculation and D21 tie-break rules to determine the match outcome used for bracket progression. Preserve participant-level `dblns` outputs for audit and authorized individual purposes; do not treat an unverified output as official.

## I02 — Score-calculator reference and limits

Treat HTML as a calculator mirror, not the authority. If HTML and Excel differ, pause match-outcome publication and bracket movement until the formula, version, inputs, aggregation, and rounding are reconciled against authoritative evidence and an authorized ruling is recorded; tactics cannot settle a scoring mismatch.

## I03 — Choose targets by expected score and tactical value

Weigh armor angle, compartment state, reload timing, likely damage, exposure, and whether a finish changes the fight. See Chapters 5.2 and 8.2.

## I04 — Choose ammunition by the actual shot

Choose AP or HE based on armor, angle, target, and likely result. A fire chance, possible citadel, or expected hit is not realized damage; use Appendix P for mechanics.

## I05 — Evasion without sacrificing aim uptime

Use the reload window to change course or speed, then settle your aim before firing. Avoid needless corrections that cost accurate shots.

## I06 — Choose survival and consumables to preserve future output

Keep an exit and time repairs around the actual threat. Survival preserves future firing opportunities, but is not an extra scoring input unless the approved equation says so.

## I07 — HUD information, leading, and kill confirmation

Estimate lead from range, target heading and speed, and shell travel time. Confirm damage and kills from post-battle evidence, not from a predicted hit or an uncertain visual cue.

## I08 — Destroyers: spotting to controlled aggression

Use concealment, spotting, torpedo lanes, and escape routes to create useful attacks. Avoid trading the ship for proximity damage without a clear payoff.

## I09 — Cruisers: useful damage without becoming the obvious focus

Use cover, range, firing angles, and reload windows to keep guns active while limiting broadside exposure. Reposition before incoming pressure removes your next firing opportunity.

## I10 — Battleships: positioning for reliable high-value salvos

Choose lanes that give guns time to reload and targets time to expose useful angles. Avoid firing simply because a target is visible if the shot has poor odds or leaves you overexposed.

## I11 — Fight a larger or stronger ship through geometry

Use islands, concealment, range, armor angle, crossfire, and enemy reloads to limit its clean shots. Attack an isolated or constrained target; disengage when the geometry turns against you.

## I12 — Field decision card and practice reference

Before committing, check target, range, angle, ammunition, aim time, incoming threat, escape route, and the personal metrics the approved score consumes. Change one variable at a time during practice.

## I13 — Brawling decision route

Check build, survivability, secondary/torpedo threat, terrain, reload cycles, and retreat path before closing. Commit only when the range and timing favor your ship; use Chapter 8 and Appendix P for the mechanics.

<a id="appendix-j-reconciliation-register-rc01rc33-status-and-action"></a>

<a id="section-6"></a>
# Appendix M — Performance-claim evidence cards M01–M07

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
> 🎯 Purpose: Test common performance claims instead of treating them as facts.
>
> 📚 Contents: M01–M07 cover claims about ship power, luck, RNG, matchmaking, bottom tier, divisions, and carrying.
>
> 🧭 Use: Refer to claim IDs and compare matched, sufficiently large personal samples.

These cards preserve common claims in one place to avoid paraphrased repetition elsewhere. Other sections refer to card IDs. None of the statements below is a scoring input unless the approved equation explicitly says so.

## M01 — “My ship is under powered.”

**Testable interpretation:** the ship may produce less personal damage or fewer personal frags than a chosen reference. **Test:** compare the same ship’s results across repeated, comparable sessions; separate hit rate, damage per hit, damage per minute in firing position, and survival time. Public averages describe a ship population, not the user’s own performance.

## M02 — “Win rate is all luck anyway.”

**Testable interpretation:** an outcome metric is being used to make a claim about randomness. This document deliberately excludes win-rate observations from the individual-output benchmark. To assess personal play, log a repeated sample of damage, frags, hit quality, and time in a viable firing position without asserting that these measures predict the match result.

## M03 — “RNG ruins any competitiveness in this game.”

**Testable interpretation:** random dispersion, fires, penetration outcomes, or other variable results may dominate observed performance. **Test:** record intended target area, range, shell type, salvo count, hits, penetrations/overpens when reliably visible, and resulting damage across a meaningful sample; compare observed results with the aim/armor expectation rather than a single frustrating salvo (SRC-17, SRC-23).

## M04 — “Whenever I'm doing well, Matchmaker tries to make me lose.”

**Testable interpretation:** perceived matchmaking intent is inferred from a sequence of outcomes. The supplied sources do not establish such intent. Test only individual measures under comparable ship/tier/mode conditions and record the limitations; do not treat a personal streak as proof of a hidden rule or use win rate as calculator evidence.

## M05 — “I don't stand a chance when I'm bottom tier.”

**Testable interpretation:** a tier disadvantage is believed to remove meaningful damage opportunities. **Test:** record personal damage and frags by own tier and opponent tier spread for the same ship where possible; note armor interactions, penetration limits, concealment, range, and survival. The current public summary does not supply a controlled bottom-tier dataset, so this belief is neither established nor disproved by Appendix L of the Technical Reference.

## M06 — “You have to play in a division to increase your win rate.”

**Editorial note:** The wording above is normalized for grammar because the source package does not identify it as a verbatim quotation. Treat the statement as a testable hypothesis, not an established result.

**Testable interpretation:** playing in a division is assumed to change a personal performance statistic. The requested individual-output analysis excludes team-performance records, and the calculator’s inputs must come from its approved formula. Do not add division membership as a scoring factor unless the approved policy and workbook expressly define it.

## M07 — “It's impossible to carry in World of Warships.”

**Testable interpretation:** one player’s influence is considered too small to matter. This manual does not infer team outcomes from an individual ship average. Examine personal damage, frags, shot quality, survival-adjusted firing time, and the exact approved score output; do not confuse a personal metric with a guarantee of a particular battle outcome.

<a id="appendix-n-user-decisions-needed-before-score-sign-off-c01c06"></a>
<a id="appendix-n-resolved-scoring-policies-and-implementation-checks-c01c06"></a>

<a id="section-7"></a>
# Appendix P — Damage, fires, flooding, and secondary brawling mechanics P01 – P11

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
Chapter 8 is the combat procedure. This appendix keeps the mechanics and test notes most likely to affect personal-damage interpretation; it does not add new score inputs.

## P01 — What counts as personal damage

Damage can come from main or secondary guns, torpedoes, fires, flooding, aircraft, depth charges, or ramming, depending on ship and mode. Use the official post-battle Damage statistic required by the approved scoring method; potential damage and likely future damage are not realized damage.

## P02 — Shell damage: aim at armor and compartment state

Choose AP or HE by armor, angle, target, and likely penetration. A broadside alone does not guarantee a citadel; steep angles, armor thickness, and overpenetration can reduce a salvo's value. See Chapter 8.2 for the firing decision.

**Broadside cruiser or battleship:** Use AP against a valid citadel or armor zone. Citadel height, belt layout, fuse behavior, and impact angle vary by ship; check the armor view.

**Angled, bow-in, or heavily armored target:** Consider HE against penetrable upper plating or superstructure; use AP only when angle and armor support it. HE may shatter if it misses penetration thresholds, and fires are not guaranteed. SAP follows separate penetration and ricochet rules.

**Destroyer:** Prioritize reliable hits and account for thin armor and large-caliber AP/SAP restrictions. Destroyers have no citadel; AP/SAP of 280 mm or larger has a special 10%-of-listed-damage limit against destroyers.

**Previously hit bow, stern, or superstructure:** Aim at another valid, less-saturated section when geometry allows. Saturation thresholds and compartment HP vary; darkened sections may take less direct damage.

## P03 — Saturation: stop paying for depleted sections

Ships divide damage across compartments such as bow, stern, casemate, and superstructure. Ordinary sections can become saturated, reducing later direct damage to that section; citadel and ship-specific rules differ. Test target choice against actual post-battle damage, not hit count alone.

## P04 — Fires: damage over time and detection pressure

Fires can follow qualifying HE and aircraft attacks, with some mode- or ship-specific exceptions. Many ships have fore, aft, and two amidships fire zones; skills may change the number. Fire chance is not realized fire damage. Consider duration, likely damage, detection, and whether the opponent can extinguish the fire before choosing a target or consumable.

## P05 — Flooding, Damage Control Party, and Repair Party

Flooding commonly follows torpedo hits and can arise from qualifying ramming or submarine depth-charge interactions. Many ships can have forward and aft floods; submarines follow a different limit. Damage Control Party timing and Repair Party eligibility affect the result, so record actual damage and survival rather than assuming every hit produces full-duration flooding.

## P06 — Health, healing, and Adrenaline Rush

Remaining HP preserves future firing cycles; some builds also reload faster as HP is lost through Adrenaline Rush. The trade-off is ship- and situation-dependent. Neither low HP nor a faster reload is a scoring bonus by itself; count only the inputs in the approved equation.

## P07 — Brawler profile and build checks

A brawler may benefit from strong secondaries, armor, Repair Party, Hydroacoustic Search, close-range torpedoes, or fast turret traverse. No ship has every advantage. Check the actual build, enemy tools, map, exit route, and ability to disengage before committing.

## P08 — Controlled-aggression procedure pointer

The participant-facing controlled-aggression procedure is in Chapter 8.4. This appendix provides supporting damage mechanics and controlled-test guidance; it does not add scoring inputs.

## P09 — Positioning against larger or stronger ships

Avoid giving heavy AP a flat broadside. Use angles, island edges, range, concealment breaks, crossfires, and enemy reload windows to restrict their clean shots. Target useful armor/angle combinations and keep an exit; geometry improves odds but does not guarantee a win.

## P10 — Training Room individual-performance experiment

Compare controlled pairs. Hold ship/build, map, mode, target, starting range, target angle, and exposure time steady; change one variable at a time. Log salvos, hits, observed penetrations where reliable, damage, fires/floods, survival, and time in a viable firing position. Repeat enough trials to avoid drawing conclusions from one lucky battle.

## P11 — Evidence and refresh policy

Use game-Wiki references as guidance, not a guarantee that every ship follows a general rule. When a patch changes mechanics, update this appendix and the related practice scenarios together, record the version/date, and keep speculative outcomes separate from verified battle results.

<a id="appendix-q-organizer-and-technical-maintainer-instructions"></a>

---
