**Package release:** v3.22 production documentation release. Publication content and filenames retain the v3.19 lineage, with v3.21 policy and formatting updates included.

**Prepared:** 29 October 2026.

**Status:** PRODUCTION DOCUMENTATION RELEASE (v3.22) — accepted under the user-directed release-gate waiver. This status applies to the documentation package; it does not claim that unrun technical tests passed or that any specific event or runtime build is approved.

**Content-control rule:** Substantive policy is preserved from v3.15. Editorial wording, document placement, and navigation may change; no event values, signatures, technical test results, or approvals have been invented. See the source manual retained in the release package for the complete baseline.

**Source baseline:** Grand_Tournament_Instruction_Set_v3.15_Policy_Resolved. This role-based publication reorganizes source material; consult the included v3.15 source baseline for audit traceability.

# Event Operations Manual

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
## Start here
This manual is for organizers, hosts, referees, scorekeepers, and staff operating the event. Use only the event settings and authority actually approved for the event. A template or policy resolution is not evidence of event-specific approval.

**v3.22 documentation-release disposition:** At the user's direction, previously identified workbook, runtime, source-intake, credential-rotation, live-test, event-settings, and organizer-signature gates are waived as prerequisites for publishing this documentation package. These items remain not tested or not supplied; they are not recorded as passed and do not certify a live scoring implementation or authorize a specific event instance.

## Live-event decision path
1. **Pre-event gate:** Confirm format, dated settings, roles, maps/modes, rosters, ship restrictions, evidence route, contacts, and approval status. If a required setting is absent, stop the affected setup rather than infer it.
2. **Room setup:** Apply the correct format-specific checklist. Verify room, lineup, map, mode, timer, and ready state before starting.
3. **Normal match:** Record accepted participant metrics, the approved scoring calculation, the verified match outcome, the bracket decision, and any individual awards as distinct but linked records. The match outcome is calculated from individual performance across the published metrics (such as Damage and Kills); awards remain separate outputs.
4. **Fault or dispute:** Pause the affected decision; preserve original evidence; record scope, reason, time, and authorizer; use the applicable restart/dispute procedure.
5. **Closeout:** Reconcile official records, notices, unresolved disputes, and retained evidence before publishing results.


**Operational rule:** when evidence or instructions conflict, pause the affected decision, preserve the evidence, and escalate to the named authority rather than improvising a new rule.

**Governing rule for every command, message, and operation:** any instruction, bot command, interface action, announcement, or staff operation that calculates, reports, or changes bracket progression must use a verified match outcome calculated from accepted individual-performance metrics (including Damage and Kills) under the approved scoring method and published aggregation, rounding, and tie-break rules. Do not advance a bracket from a raw statistic, a standalone participant output, a manually asserted result, or an unverified calculator display. If inputs, formula version, or outputs conflict or cannot be verified, pause the affected publication and bracket action, preserve the evidence, and obtain an authorized ruling.

## Status labels
**DRAFT / NOT APPROVED:** not authorized for publication. **VERIFIED:** named check performed with evidence. **WAIVED / OUT OF SCOPE:** excluded from this release, not passed. **BLOCKED / NOT VERIFIED:** required evidence or input absent.


**Status discipline:** `BLOCKED`, `NOT TESTED`, `NO-GO`, and `NOT APPROVED` are distinct from `PASS`; do not promote a status without supporting evidence.

### Contents
- [🤖 Chapter 2 — Discord & Bot Operations Manual](#section-1)
- [⚙️ Chapter 4 — Training Room Setup & Match Operations Guide](#section-2)
- [Appendix A — Decision register D01–D52](#section-3)
- [Appendix C — Exclusion register X01–X07](#section-4)
- [Appendix D — Operating templates and checklists T01–T07](#section-5)
- [Appendix G — Release gates and outstanding work RG01–RG24](#section-6)
- [Appendix H — Publication approval PUB01–PUB09](#section-7)
- [Appendix Q — Organizer and Technical-Maintainer Instructions](#section-8)

---

<a id="section-1"></a>
# 🤖 Chapter 2 — Discord & Bot Operations Manual

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
This chapter is the dedicated home for all Discord and bot operating material, from submission through verification, correction, security, and fallback. Other chapters refer here instead of repeating these procedures. It governs the operational path from a participant's image to a verified battle record, but does not certify a deployed bot, turn the local HTML calculator into an official record system, or authorize the unsafe archived image reader. Refer to Appendix O of the Technical Reference for the tested build/status and the release gates in Appendix G before deployment.

## ✏️ 2.1 — Choose the correct tool before acting

| **📋 Task**                                                           | ** Approved path**                                                                                                         | ** Boundary**                                                                                     |
|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| 🧾 Submit a battle record                                             | Original Personal Score screenshot through the organizer-designated Discord intake route, when the approved bot is available | A bot response must be checked against the original screenshot before it becomes official evidence. |
| ✅ Draft or test score inputs                                         | Standalone Score Calculator HTML (Chapter 3 of the Technical Reference)                                                                                 | Local browser state only; no verified server synchronization or protected sign-in.                  |
| 📸 Read OCR text using the archived image reader                      | Do not use the archived file for live data                                                                                   | It contains a browser-side webhook/posting path; see §2.6 and security requirements in Appendix G.  |
| 🏆 Edit an accepted score, view protected totals, or change a bracket | Organizer-approved recordkeeping workflow                                                                                    | No verified admin-only command or secure admin HTML workflow was found in the reviewed snapshot.    |

🧭 Operating sequence: prepare the screenshot → submit once → validate extracted fields → correct one item at a time → compare the accepted record to evidence → route official scoring through Chapter 3 of the Technical Reference. If a required value is still unclear, pause and use the manual fallback—never fill the gap by guessing.

✅ **Done when:** The participant or operator has selected the approved path for the task and knows the fallback route if the primary tool is unavailable.

## ⏱️ 2.2 — Validate the battle-record contract

The reviewed bot snapshot expects all eight fields below before posting a complete record:

| **🧾 Required field** | ** Verification action**                                     |
|-----------------------|----------------------------------------------------------------|
| 📘 Battle Result      | Confirm Victory/Defeat shown on the original result screen.    |
| 👥 Player             | Confirm player identity and clan tag where displayed.          |
| ⚙️ Map                | Match the visible map name.                                    |
| 📘 Battle Mode        | Confirm the mode label.                                        |
| ⏱️ Battle Start Time  | Check the date/time against the battle record.                 |
| ✏️ Credits            | Read the exact reward amount.                                  |
| 📘 Free XP            | Read the exact Free XP amount.                                 |
| 📘 Damage             | Copy the exact Personal Score Damage total; never estimate it. |

XP, ship name, result description, and ribbon labels/counts were optional in that snapshot. Do not promote an optional field to mandatory without an approved interface contract. OCR should accept only a supported, unambiguous value; conflicting image crops or unclear digits must remain unresolved and trigger review.

> 🔥 Damage integrity: record the official post-battle Damage statistic required by the approved scoring method. If OCR cannot read the value in the original screenshot clearly, use the correction procedure in Section 2.4.
>
✅ **Done when:** Required identity, battle, and metric fields are present and traceable; missing or ambiguous fields are rejected or routed for correction rather than guessed.

## 👥 2.3 — Participant procedure: capture and submit the screenshot

> 🎯 1.  Open the World of Warships PC Personal Score/post-battle screen that includes the requested values.
>
> 👥 2.  Make sure the player, map/mode, start time, Credits, Free XP, and Damage are readable and not covered or cropped.
>
> 📸 3.  Save or capture the original image; recapture it if blurred rather than reconstructing values from memory.
>
> 🤖 4.  Open the organizer-designated Discord intake channel and attach the image to a single message. Do not use a different channel or repeatedly post the same file while processing is underway.
>
> ⏱️ 5.  Read the bot response. If all required fields validate, it should produce a structured record; if a field is missing or ambiguous, it should request that item for correction.
>
> 📸 6.  Compare the resulting record against all eight required fields extracted from the screenshot before treating it as verified.
>
> 🤖 7.  If the accepted record is wrong, retain the original screenshot and bot response, then notify the authorized recordkeeper; do not invent an edit command.

If any required field remains unresolved, do not use the record as an official score. Route it to the manual fallback and mark any internal record provisional until a scorekeeper resolves it against the original screenshot.

Damage-record submission flow: the participant supplies the original image, the bot checks required fields, and unresolved values require correction.

✅ **Done when:** The original screenshot is readable, matches the participant and battle, and is submitted through the approved route with correction or failure status recorded.

## 👥 2.4 — Participant procedure: answer correction prompts

> 🔎 1.  Read the latest prompt and identify the one field requested.
>
> 📸 2.  Recheck that field on the original screenshot, especially Damage digits and separators.
>
> 🎯 3.  Reply with the verified value only, in the format requested; do not include a field label, multiple fields, or commentary.
>
> ⏱️ 4.  Continue one prompt at a time until the record is complete; if you cannot verify a value, use the documented cancel correction route rather than guessing.
>
> 🔄 5.  Keep the reply in the same user/channel interaction. The reviewed snapshot documents a 30-minute pending-correction expiry and loss of pending state on bot restart; confirm that behavior against the actually deployed build.

Correction loop: read one prompt, verify from the image, reply with one value, then repeat or cancel.

A prompt does not prove the OCR system is correct; it is a deliberate safety stop. Preserve screenshots and records under the approved event rules and the approved event-settings record.

✅ **Done when:** The participant confirms only values supported by original evidence; the corrected record is revalidated, and unresolved ambiguity is sent to manual review.

## 🤖 2.5 — Operator procedure: verify Discord behavior and permissions

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
> 🤖 1.  Confirm the exact bot build, build fingerprint, configured target channel, and approved test account before declaring the workflow live.
>
> ⏱️ 2.  Run the authorized screenshot smoke test and verify: message detection, field extraction, one-at-a-time correction, final structured record, log trail, and no duplicate post.
>
> 🔐 3.  Check required channel access: View Channel, Read Message History, and Send Messages; confirm Message Content Intent only where required by the deployed implementation.
>
> 👥 4.  Use functional channel names in written instructions: announcements, registration/access, schedule/fixtures, help, urgent match escalation, screenshot intake/results, private sensitive support, and optional voice/observer spaces. Put actual channel names, IDs, permissions, or invite links only in a controlled server-specific setup document.
>
> 👥 5.  Do not invent /admin, /score, /refresh, or other commands. The reviewed code snapshot did not verify slash-command registration or admin-only score-editing operations.
>
> 🏆 6.  For official score edits, roster changes, leaderboard display, or bracket updates, use a separate authorized recordkeeping process until the exact function is implemented and tested.
>
✅ **Done when:** The test record confirms the intended commands, permissions, failure responses, and evidence path; no live deployment proceeds on an untested assumption.

## 📸 2.6 — Handle the archived HTML image reader safely

The supplied score_report_imgToDiscord.html exposes a Discord webhook in browser-side JavaScript and automatically posts extracted text. Do not use this archived version for live participant data or redistribute it unchanged. Hiding a URL in the same HTML file is not a secure fix.

The file's visible feature inventory lists: Choose an image or drag it here, Paste Clipboard Image, Read Text, Copy Text, Download Text, Reset, and an Extracted Text area; its help text lists PNG, JPG, WEBP, and BMP. This is a description of the unsafe archived copy, not permission to use it.

Do not use the archived image reader for live participant data. Use the approved bot only after it passes the required release gates; otherwise use the manual fallback described in Section 2.8. Before any replacement reader can be used, an authorized operator must revoke or regenerate the exposed webhook, remove browser-side posting, implement an approved secure send path if needed, inspect the exact new file, and retest explicit user review and sending behavior. Check the internal reconciliation record, required release gates in Appendix G, and validation evidence in Appendix O of the Technical Reference before release.

✅ **Done when:** The archived reader is treated as a limited test artifact, its outputs are checked against the source image, and it is not trusted with secrets or treated as a production service.

## 👥 2.7 — Protect credentials and participant records

🔐 Treat any live token, webhook, or credential found in a distributed package or HTML file as compromised; revoke it with the issuing service and generate a replacement.

⚙️ Keep secrets in private server-side configuration or an untracked local.env; never put them in browser code, public ZIPs, screenshots, logs, or manuals.

🤖 Prefer an authenticated server-side relay with validation and rate limiting over direct browser-to-webhook posting.

⏱️ Restrict screenshots to authorized staff and retain only the data needed for the event; apply the approved event rules and the event's announced retention/deletion schedule.

🔐 Rescan the final package before distribution. The review status of each asset is in Appendix O of the Technical Reference; a sanitized package does not itself revoke a live credential.

✅ **Done when:** Credentials are absent from public/client files, access follows least privilege, and participant evidence follows the approved retention policy.

## 🧯 2.8 — Failure handling and manual fallback

| **⚠️ Failure**                                                             | ** Action**                                                                                                                            |
|----------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| 🤖 No bot response                                                         | Confirm target channel and attachment; operator checks availability and permissions. Use the approved manual intake fallback.            |
| 📘 Blurry or cropped Damage                                                | Use the Personal Score Damage verification procedure in Appendix P of the Participant Guide and request a clearer original screenshot.                            |
| ⏱️ OCR candidates disagree                                                 | Leave the field unresolved; preserve evidence and request a human correction.                                                            |
| 📘 Duplicate or delayed response                                           | Check the record identity and timestamps; avoid silent overwrite and retain the audit trail.                                             |
| ✏️ Correction expires or disappears                                        | Re-submit through the approved route as directed; do not reuse stale values without checking the original screenshot or accepted record. |
| ⏱️ Record has wrong identity, map, mode, time, Credits, Free XP, or Damage | Preserve screenshot and response; send both to the authorized recordkeeper.                                                              |
| 🧮 Calculator says the total differs                                       | Stop score publication and follow Chapter 3 of the Technical Reference and Appendix K of the Technical Reference for regression checks; never change a raw input merely to force a match.            |
| 🏆 Need official totals or Doubloons                                       | Use the approved results process; the screenshot bot is not a verified live leaderboard.                                                 |

After recovering from a service failure, repeat the test tied to that failure, check logs, and confirm no duplicate or corrupted result before resuming automated intake.

✅ **Done when:** The failure is recorded, automated processing stops safely, and the approved manual route produces the required evidence fields and audit trail.

## 📣 2.9 — Release boundary

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
The packaged bot user manual and archived bot code are not proof of production readiness. Appendix O of the Technical Reference contains the actual test evidence, failure observations, target-runtime status, and release verdict; Appendix G lists the gates that must pass. Do not publish “production-ready” until the exact release build passes the required Windows/Node 24 OCR, interaction, security, and Discord smoke tests.  
✅ **Done when:** The exact release version and approval are recorded, applicable security and regression gates pass, and the tool’s stated limits match the evidence.

<a id="chapter-3-scoring-workbook-operations-manual"></a>

⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ 
<a id="section-2"></a>
# ⚙️ Chapter 4 — Training Room Setup & Match Operations Guide

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</div>
## ⚙️ 4.1 — Before creating the room

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</div>
> 👥 1.  Open the approved fixture and verify the match/game ID, host, intended participants, map, battle mode, timer, lineup display, allowed roster composition, and spectator permission.
>
> ⚙️ 2.  Confirm which lineups should be visible for the selected format; use the approved event rules and the matching situation under Appendix B of the Technical Reference if the rules documents differ.
>
> 👥 3.  Confirm that all participants have the correct client state and can be invited. If the assigned host cannot host, use the fixture's named fallback (as stated in the approved event rules).
>
✅ **Done when:** The host, map/mode, lineup rules, bans, timer, visibility, spectators, and restart procedure are known from approved settings before room creation.

## ✅ 4.2 — Create, configure, and verify

> ⚙️ 1.  Host creates the Training Room and applies the fixture's room settings.
>
> ⚙️ 2.  Use a concise room name containing the matchup, match ID, and game number where supported (as stated in the approved event rules).
>
> 🤖 3.  Invite the opponent and only authorized observers (as stated in the approved event rules).
>
> 👥 4.  Verify mode, map, timer, sides/spawns, player slots, roster, ship/class restrictions, lineups, and spectator settings against the fixture (as stated in the approved event rules).
>
> 👥 5.  Both representatives complete their checks; resolve objections before ready-up (as stated in the approved event rules).
>
> ⚙️ 6.  Start only after both sides confirm the room matches the published settings and the referee has addressed any active dispute.
>
✅ **Done when:** The live room matches the approved checklist, each team confirms lineup/readiness, and discrepancies are resolved before battle start.

## 🔄 4.3 — Manage a fault or restart

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
> 👥 1.  Participant reports a qualifying load/disconnect, incorrect room setting/side/spawn, bugged spawn, or confirmed platform fault promptly to the opponent and official (as stated in the approved event rules).
>
> ⏱️ 2.  The referee records the request time and game-clock time, verifies evidence, applies the published request cutoff and quota, then grants or denies the restart with a reason (the approved event rules and the approved event-settings record).
>
> ⏱️ 3.  Keep the restart completion window distinct from attendance and between-game clocks.
>
> 🔄 4.  Do not change ship/competitive setup during a restart except the narrow reconnect/replacement accommodations in the approved event rules.
>
> 🤖 5.  Recheck the approved setup, ready both sides, and preserve the decision/result record.
>
✅ **Done when:** The issue meets an authorized restart trigger, the request is within the applicable cutoff/quota, and the reason and decision are recorded.

## 📸 4.4 — Evidence and interface verification

After the match, each participant supplies a readable screenshot meeting the approved event rules; enable and preserve replays for the published retention period, which is at least 48 hours in the detailed rules document. The scorekeeper validates the official record under the approved event rules. Use the optional individual-mechanics drill in the controlled Training Room experiment that holds the ship, build, target, map, range, angle, and exposure time steady while changing one variable at a time to test damage types, aim uptime, saturation, consumable timing, and safe brawling entries without changing official settings. Log actual post-battle Damage and personal frags separately; do not treat fire chance, a potential citadel, or time spent in secondary range as realized damage.

ℹ️ Interface limitation: the PDFs describe rules for Training Rooms and refer to a separate tutorial, but they do not reproduce a complete, current click-by-click tutorial. This chapter therefore defines the procedural checklist; test the exact client version before adding screenshots, button labels, or coordinate-specific steps (the required release gates in Appendix G).  
✅ **Done when:** Evidence is readable and linked to the correct match; UI options not verified in the active client are marked unverified.

<a id="chapter-5-individual-game-strategy-guide"></a>

<a id="section-3"></a>
# Appendix A — Decision register D01–D52

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Complete the record at the point of action so the next operator can verify what was decided and why.</div>
Working decision register; unapproved options are not defaults.

## A1 — Governance, eligibility, teams, and rosters (D01–D08)

### D01 — Governing document model

**Decision:** B. Maintain a short Pilot Event ruleset and a separate detailed regular-season/postseason ruleset, with a shared glossary and master policy. Apply R-01 and D52 to hierarchy, settings, and exceptions.

### D02 — Eligibility

**Decision:** B. Publish eligibility and any safety/platform/account requirements before registration opens. Do not adopt historical account-battle counts, win-rate thresholds, press-account requirements, or historical clan-tenure rules as general eligibility criteria. The organizer designates an eligibility reviewer; an appeal goes to a different official when practical.

### D03 — Team formation

**Decision:** C, hybrid. Default to individual signup followed by an organizer-managed, auditable draft/assignment. A fixed-team or alternative model is allowed only when the settings announce it before signup. Roster lock is governed by D06.

### D04 — Registration

**Decision:** individual by default; fixed-team registration only when announced. Collect the participant's game identity, Discord identity or declared alias, availability, and required eligibility confirmations. Publish open/close times, approval steps, a waitlist rule, duplicate-registration handling, correction route, and final roster publication time. A late entrant is not guaranteed a place after play begins.

### D05 — Multiple teams

**Decision:** one active team per player within the same event/stage. A player may be assigned to a different team in a separately registered weekly session when that format uses a new draft. A player cannot play for two teams in the same stage or switch teams to influence a result. Approved emergency substitution is governed by D06.

### D06 — Roster changes

**Decision:** lock rosters before the first game; allow only approved exceptions. The event settings name the lock time. After lock, changes require the referee/organizer's approval, a recorded reason, and an update to the official roster. Emergency replacement is allowed only when needed to keep the event moving or address a genuine availability/connection problem; it must not be used to evade eligibility, bans, or a match result. In-game restart restrictions are separately governed by D40.

### D07 — Substitutes, bots, and short-handed teams

**Decision:** configure before play. Use bots or substitutes only when the event's approved lineup design permits them. Publish their purpose, count/limit, required behavior, and scoring treatment; no ad hoc additions are allowed. Apply D28 for roster limits and D34–D36 for failure to field a legal lineup.

### D08 — Team names, tags, and logos

**Decision:** basic conduct and intellectual-property standard. Names and images must be appropriate for the intended audience, non-harassing, and not misleading or unlawfully copied. The organizer can request correction or reject a submission under stated criteria. Give the team a correction route and a neutral appeal. Exact image dimensions are optional implementation guidance, not a core rule.

## A2 — Discord communication and notices (D09–D16)

### D09 — Minimum Discord participation

**Decision:** every participant must be reachable; each team must have a primary and backup representative. Representatives must attend required briefings and monitor official notices during the event. Individual players must join or obtain access to the communication spaces required by the event's permissions and match procedure. Do not hard-code a server name or server-specific role/channel.

### D10 — Identity matching

**Decision:** publish an identity mapping. The roster must map each participant's in-game name to their Discord display name or declared alias. Exact matching is not required if the mapping is reliable and updated before play. A mismatch that prevents verification must be corrected before the player participates.

### D11 — Discord functions

**Decision:** define functions, not channel names. Provide official announcements/rules, schedule and fixtures, registration/waitlist, participant help/escalation, result submissions, role/access requests, and team communication. Team voice and observer/streamer spaces are created only if the event uses them. Place concrete channel names and setup details in a separate implementation appendix.

### D12 — Team voice

**Decision:** use it for scheduled competitive coordination; require representatives at the briefing. Each team must have access to an appropriate private coordination space when the format uses voice. Team representatives attend the announced pre-event briefing. All-player voice participation is required only when published for that format; an announced text-based fallback is available for accessibility or technical problems. Officials may join only for authorized administration or troubleshooting.

### D13 — Staff contact

**Decision:** use a combination of routes. Routine questions go to a public help function; personal/account-sensitive matters use a private ticket or thread; urgent match issues go directly to the assigned referee/official route. Participants should notify both opponent and official promptly about a match-impacting technical problem.

### D14 — Role/access requests

**Decision:** staff-approved, least-privilege access. Grant only permissions needed for the participant's published role, preferably before the event; never require elevated permissions merely to participate. Use D16 for automation failure handling.

### D15 — Official notice

**Decision:** timestamped announcement plus direct representative notice for critical changes. Each notice identifies the rule/settings version, the change, and its effective time. For match-critical changes, message both team representatives and request acknowledgement when feasible. A participant must not be expected to discover a critical change by monitoring an unrelated chat.

### D16 — Discord automation

**Decision:** bot-assisted with a human fallback. Automate tasks only when results can be audited and corrected. Report failures, log actions that affect registrations/results/settings, and provide a manual fallback. Participation must not depend on one command or bot being available. Apply Appendix C to deployment details and credential handling.

## A3 — Schedule, bracket, seeding, and progression (D17–D22)

### D17 — Schedule

**Decision:** fixed published schedule by default. Publish each match's date/time, time zone, opponent, and contact route. Issue schedule changes under D15. Self-scheduling is allowed only when explicitly selected and bounded by deadlines.

### D18 — Structure

**Decision:** declare format/stages before signup; publish pairings, transitions, elimination conditions, consolation placement, and finale rules. Put any historic counts, rounds, or diagrams in dated settings only. See D21 for progression authority.

### D19 — Series length

**Decision:** declare by stage; otherwise one game is the default. The settings sheet must state whether each matchup is single-game or a best-of series, how many games form the series and how their dblns values are aggregated, and what happens if a game result is invalid or tied. If no series length is published, treat the matchup as one game rather than inventing a best-of format. Any longer series must be announced before the stage begins.

### D20 — Seeding/pairings

**Decision:** publish an auditable pairing/seeding method (registration order, draw, rating, or approved cumulative metrics). Record whether prior results affect seeding; do not import historic formulas. See D21 for progression.

### D21 — Performance-based match outcome, bracket advancement, and tie-breaks

**Decision:** In the detailed recurring format, the verified match outcome determines bracket advancement. Calculate that outcome using the approved, published scoring method applied to individual performance across the applicable game metrics (including Damage and Kills), with its input rules, aggregation, rounding, and tie-break procedure declared before play. Record the resulting outcome as the bracket decision; do not substitute a single raw metric or unverified calculator display. For an unresolved tie in the calculated outcome or standings, apply the published hierarchy: (1) head-to-head outcome, (2) record among the tied teams, (3) a team metric/point differential declared in advance, (4) an extra deciding game when feasible, and (5) an auditable random draw only when expressly authorized. The participant `dblns` value is an auditable participant-level output; it contributes to the match outcome only as specified by the approved formula and is not used alone unless the published formula expressly says so. In the Pilot Event, apply announced individual Damage awards; if a bracket is also used, publish its performance-based outcome calculation and tie-breaks before signup.

### D22 — Withdrawals and byes

**Decision:** waitlist before play; published forfeit rules after play starts. Before the first game, fill a vacant place from the waitlist if the roster can be finalized fairly. Once the stage starts, do not reshuffle completed pairings without an announced rule. An absent team is handled under D34–D36; standings and prize effects are recorded. A replacement team is allowed only if the format and timing permit it without unfairly changing results.

## A4 — Training Room and in-game procedure (D23–D33)

### D23 — Room host

**Decision:** the designated Home Team hosts by default. In a bracket, the Home Team is the side assigned the top slot in the published matchup unless the fixture says otherwise. It creates the room and invites the opponent and authorized observers. The fixture must identify a fallback host; if the assigned host cannot create the room promptly, the referee or named fallback takes over.

### D24 — Room name

**Decision:** team names plus match/game identifier. Use a concise form such as Team A vs Team B — Match ID — Game \# when the client permits. If the game client imposes a title-length limit, use shortened team names and retain the full match/game ID in the official tracker. Avoid server-specific or personal identifiers.

### D25 — Mandatory room checklist

**Decision:** verify the room against the fixture. Check mode, map, timer, sides/spawns, player slots, spectator access, and declared settings. Use D26 for lineup visibility and D29 for lineup legality. Provide hosts a compact checklist.

### D26 — Lineup visibility

**Decision:** hidden in the normal detailed format. Declare and verify visibility before ready-up; apply an alternate mode only when the governing rules/settings expressly authorize it. S02 illustrates the visible-lineup pilot case.

### D27 — Battle timer

**Decision:** 10 minutes for the normal detailed match. Verify the fixture's value before ready-up; any alternate duration or mode must be expressly declared in the event settings. S05 illustrates a format-specific timer variation.

### D28 — Lineup size and legality

**Decision:** declare all limits per event. Specify minimum/maximum humans, required slots, substitute/bot allowances, short-handed treatment, and the consequence for an illegal lineup. Historical counts are not defaults; refer to D07 for bot/substitute design.

### D29 — Lineup legality

**Decision:** each representative checks their own team's roster against published restrictions. The host owns room configuration; each team owns its lineup confirmation. Refer any disagreement to staff rather than relying on the opponent to identify every violation.

### D30 — Maps/spawns

**Decision:** a fixed, published event rotation is the default. List map and mode selection in the dated settings sheet, without embedding a historical named map pool in the general rules. Pick/ban or random selection is allowed only if order, timing, duplicate/illegal pick handling, and recording are published before play. Use a documented manual fallback if an automation/tool fails.

### D31 — Ship/class bans

**Decision:** no ban list by default; event bans must be published. If the selected format needs bans, publish the restricted categories/list, when it takes effect, selection order, overlap handling, and penalty for an illegal choice. Do not carry over named ships or a historical ban list. An urgent client/game change must be announced as a versioned event-setting change before it is enforced, except for an immediate safety/security problem.

### D32 — Spectators

**Decision:** event-authorized access only. Enable spectator slots only when official observation or an approved broadcast is needed. Restrict access to designated people and notify teams through the official process. Apply D48 for broadcast conditions.

### D33 — Ready-up

**Decision:** a two-side confirmation gate. Players may ready only after the checks in D25, D26, and D29 are complete and both representatives confirm. Send an unresolved objection to D44 before starting.

## A5 — Timing, results, restarts, and disputes (D34–D45)

### D34 — No-show grace period

**Decision:** 10 minutes after scheduled start. The same normal period applies between games in a series unless the published settings say otherwise; restart timing is separate under D38.

### D35 — Both teams absent/not ready

**Decision:** record a double forfeit if neither side is ready by the D34 deadline. Preserve timestamped evidence and apply the no-show score treatment in T01/D52. A verified platform/Training Room failure may justify a documented extension; silence or an unverified claim does not.

### D36 — One team ready, the other absent/not ready

**Decision:** record the attendance default when one side is ready and the other is absent/not ready. Confirm a legal lineup and room checks; preserve time evidence. Apply the no-show score treatment in T01/D52. Extensions require a verified fault or another published exception.

### D37 — Restart triggers

**Decision:** enumerated objective faults only. Eligible grounds are a load failure/disconnect, incorrect sides/spawns/room settings, bugged spawn, or an officially confirmed Training Room/platform fault. Follow D13 for notification; dissatisfaction with a matchup or poor performance is not grounds.

### D38 — Restart request cutoff

**Decision:** two minutes of game time. Report qualifying faults under D13 and request action within the cutoff; afterwards, play normally continues to completion. Any exceptional voiding requires an explicit, recorded order from the designated event official. Apply D39 to quota treatment.

### D39 — Restart count

**Decision:** series-based normal rule. Allow one team-requested restart per team in best-of-one, best-of-two, or best-of-three series and two in best-of-five; publish limits for other lengths. The organizer may authorize additional restarts for confirmed Training Room/platform faults. Officially ordered Battle Faults do not use a team's quota; see S07 for the pilot variant.

### D40 — Changes during a restart

**Decision:** no competitive configuration changes. Teams may not change their ship/vehicle lineup or its competitive settings (including equipment, consumables, captain/setup, or equivalent loadout selections). A player may be replaced or moved only when required to address a failure to reconnect or restore the already approved lineup. The referee records any permitted change. A restart is not a new draft or a chance to counter-pick.

### D41 — Player evidence

**Decision:** each participant submits a readable post-game screenshot showing damage and the result; include the player identity and client time where needed for timing or attendance. Replays must be enabled and preserved for at least 48 hours; provide them for disputes or when officials request them. See D45.

### D42 — Official result entry

**Decision:** each participant completes the evidence step in D41. A designated representative may coordinate the submission process, but does not waive individual evidence unless the approved event settings expressly define an alternate process. The scorekeeper validates the official record and retains corrections.

### D43 — Missing/unreadable/disputed evidence

**Decision:** result remains provisional until verified. Give the submitter a correction opportunity within a published deadline. Use the opponent's screenshot, replay, room evidence, or other verifiable record where appropriate. Preserve the original submission and log corrections. Do not finalize a disputed result based solely on an unsupported claim.

### D44 — Disputes and appeals

**Decision:** referee first, then one impartial appeal. Participants are encouraged to resolve simple clerical misunderstandings in good faith, but no one must abandon a legitimate concern to avoid a formal dispute. The referee records the issue and ruling. One appeal may be made within the published appeal window to an official who did not make the original ruling and has no material conflict.

### D45 — Retention

**Decision:** keep replay files at least 48 hours and records through final review. Preserve result evidence, official entries, corrections, no-show/restart records, rulings, and appeals until the event's audit/appeal period ends. Extend replay retention for open disputes, then apply the published deletion schedule and remove unnecessary personal data.

## A6 — Conduct, impartiality, streaming, changes, and support (D46–D52)

### D46 — Conduct and penalties

**Decision:** published ladder with severity exceptions. Require respectful play and prohibit trolling, intentionally throwing, cheating, harassment, bad-faith delay, and abuse of staff or opponents. Publish the possible consequences and who can impose them. Minor first-time issues may receive a warning; serious misconduct can receive an immediate match/event sanction. Sanctions and prize effects must be reasoned and recorded.

### D47 — Staff impartiality

**Decision:** recuse material conflicts. No official adjudicates their own match or a case where personal/team/community interests undermine neutrality. Record the recusal and assign a neutral replacement; a separate appeal reviewer is preferred.

### D48 — Streaming

**Decision:** optional and governed by event settings. Declare broadcasted matches, approved streamers/observers, access controls, information-leak protections, delay, recording/VOD expectations, neutrality, conflicts, and technical-fault handling. Do not import another event's delay, overlay, registration, or promotional conditions.

### D49 — Mid-event amendments

**Decision:** prospective by default; emergencies documented. Use D15 for notice format. Ordinary changes affect future/remaining games, not completed results. An urgent operational/security/platform action requires a recorded reason, scope, and review/correction route approved by a non-conflicted official.

### D50 — Awards

**Decision:** Publish award eligibility, recipients, values, and distribution before play. Keep individual awards as distinct outputs from bracket progression; bracket progression follows the verified match outcome calculated from the approved performance-based scoring method and published D21 tie-break procedure. If the HTML interface calculates awards or match inputs, record its approved equation/version under D52 and consult I02; do not assume HTML/Excel equivalence. Define completion/misconduct conditions and do not treat game currency as cash unless explicitly approved.

### D51 — Training/support materials

**Decision:** quick-start plus full reference. Provide a short participant checklist and a detailed guide, common glossary, Training Room pre-ready checklist, score-report sample, restart/dispute flow, Discord function map, and FAQ. The step-by-step game-client tutorial must be verified against the current client; a source that merely refers to an external guide does not prove its detailed instructions.

### D52 — Master policy and Event Settings Sheet

Keep stable policy in the master rules; record variable choices in an approved, dated T01 and complete each field or mark it “not used.” R-01 governs exceptions. Use Section 1.1 of the Participant Guide and Appendix A, Decision D21, for the performance-based match-outcome calculation, bracket advancement, and tie-breaks; use D20 for seeding and D50 for awards. T01 plus RC01–RC02/RG03/RG13–RG17 control workbook and HTML validation.

<a id="appendix-b-situational-examples-s01s31"></a>

<a id="section-4"></a>
# Appendix C — Exclusion register X01–X07

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</div>
> 🎯 Purpose: Screen public materials for details that must not carry over.
>
> 📚 Contents: X01–X07 cover event branding, server/region identifiers, historical restrictions and numbers, event-only mechanics, implementation identifiers, credentials, and unsupported claims.
>
> 🧭 Use: Check before release; remove identifying details without losing reusable procedures.

This is the **single complete exclusion checklist** for public/general versions. Comparative PDFs and older archive files are evidence sources, not automatic policy authorities. Convert a relevant historic variation into a labeled Appendix B of the Technical Reference situation when it helps explain a conflict; never promote it to a default rule.

Exclude the following:

- **X01 — Event identity:** names/acronyms, logos, branding, promotion, season/iteration labels, historical dates, named people/winners, and sponsor provisions.

- **X02 — Server/region identifiers:** server, region, channel, role, staff or voice-room names; invite/message URLs; account/server IDs; transfer rules; region-only procedures.

- **X03 — Specific game restrictions:** historic maps/ships/bans, tiers/classes/compositions, factions, race/rally mechanics, map/mode sequences, and event gimmicks.

- **X04 — Unapproved historic values:** roster/bot/substitute counts, account/win-rate thresholds, timers, grace/restart limits, prizes, stream delays, ratings, and other unapproved figures.

- **X05 — Event-only systems:** named scoring/rating formulas, contests, brackets, permanent-ban lists, historic sanctions, overlays, and event-specific publication rules.

- **X06 — Implementation secrets:** bot commands/names, webhooks, tokens, private identifiers, credentials, and server-specific deployment details. Rotate any live exposed credential; use D16 for automation design.

- **X07 — Unsupported tutorial claims:** do not imply the PDFs contain current click-by-click Training Room instructions; they reference additional help but omit those steps.

The bot, game-strategy guide, scoring workbook/calculator, and this manual remain separate deliverables. Appendix I of the Participant Guide provides a focused tactical reference because it supports scoring interpretation and match operations; it does not replace the standalone game-strategy guide.

<a id="appendix-d-operating-templates-and-checklists-t01t07"></a>

<a id="section-5"></a>
# Appendix D — Operating templates and checklists T01–T07

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Complete the record at the point of action so the next operator can verify what was decided and why.</div>
> 🎯 Purpose: Standardize event setup, match records, and closeout.
>
> 📚 Contents: T01–T07 include settings, organizer checks, match-start checks, restart and dispute logs, participant handout, and official-record index.
>
> 🧭 Use: Complete applicable templates and record owner, version, approval, and effective time.

Use the template IDs in the operating workflow. Complete only the forms relevant to the chosen format.

## T01 — Event Settings Sheet

Complete each field or mark **“not used.”** Enter actual values, owner, version, approval, and effective period; this index points to the decisions that govern each field.

| **Field group**                                                                         | **Decision references**        |
|-----------------------------------------------------------------------------------------|--------------------------------|
| Format/document authority                                                               | D01, D52                       |
| Eligibility, signup, teams, roster, identity                                            | D02–D08                        |
| Discord participation, access, notices, automation                                      | D09–D16                        |
| Dates, structure, series, seeding, withdrawals                                          | D17–D22                        |
| Host, room name, settings, visibility, spectators, ready-up                             | D23–D33                        |
| Attendance, restart procedure, result evidence                                          | D34–D45                        |
| Conduct, impartiality, broadcast, rule changes, rewards                                 | D46–D50                        |
| Participant support and publication controls                                            | D51–D52                        |
| Workbook progression source/version, formula, aggregation, tie; awards/seeding separate | §1, D20–D21, D50, D52, I01–I02 |

## T02 — Pre-event organizer checklist

- \[ \] Select the governing format and prepare the settings sheet (D01, D52).

- \[ \] Resolve all decisions required before signup (D02–D22).

- \[ \] Test room, attendance, restart, evidence, and dispute workflows (D23–D47).

- \[ \] Declare broadcast, amendments, awards, and support materials (D48–D51).

- \[ \] Version, approve, and publish the complete document set (Appendices G–H).

## T03 — Match-start checklist

- \[ \] Confirm fixture, effective rules/settings version, assigned host, and game ID (D17, D23–D24).

- \[ \] Complete the applicable setup checks (D25–D32).

- \[ \] Confirm both sides' readiness and resolve any objection before starting (D33–D36, D44).

## T04 — Restart log

| **Field**                                     | **Entry** |
|-----------------------------------------------|-----------|
| Event/stage/match/game ID                     |           |
| Requester and notice time                     |           |
| Game-clock time and claimed fault (D37–D38)   |           |
| Supporting evidence                           |           |
| Ruling and reason                             |           |
| Quota treatment / official-fault status (D39) |           |
| Approved changes, if any (D40)                |           |
| Restart timer and completion                  |           |
| Result/follow-up record ID                    |           |

## T05 — Dispute and appeal record

| **Field**                               | **Entry** |
|-----------------------------------------|-----------|
| Event/stage/match/game ID               |           |
| Challenged clause and requested outcome |           |
| Evidence and response from other side   |           |
| Decision-maker and conflict check (D47) |           |
| Initial ruling/reason/time (D44)        |           |
| Sanction, if any (D46)                  |           |
| Appeal reviewer/result/close-out (D44)  |           |

## T06 — Participant handout

The quick-start should point to the governing rules, event settings, submission route, and help/escalation function; it must not create a different policy.

## T07 — Official record index

| **Record field**                                  | **Governing reference**        |
|---------------------------------------------------|--------------------------------|
| Event, stage, match, and game IDs                 | Event Settings Sheet / fixture |
| Participant and lineup evidence                   | D41                            |
| Result submission and validation                  | D42                            |
| Provisional result, correction, and audit history | D43                            |
| Dispute, ruling, and appeal                       | D44                            |
| Retention/deletion date and open-case flag        | D45                            |
| Restart/no-show incident                          | D34–D40                        |

<a id="appendix-e-glossary-g01g26"></a>

<a id="section-6"></a>
# Appendix G — Release gates and outstanding work RG01–RG24

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</div>
> 🎯 Purpose: Set the evidence required before release or readiness claims.
>
> 📚 Contents: RG01–RG24 cover policy approval, credentials, score parity, regression, Excel/VBA, OCR/runtime, Discord tests, package hygiene, and publication.
>
> 🧭 Use: Record an owner and dated evidence for each gate; open critical gates block the affected release.

Do not mark this manual or a companion deliverable ready until its applicable gate is closed.

## Priority 0 — security

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
- **RG01 — DOCUMENTATION SCAN PASS / SOURCE SECURITY OPEN:** The generated documentation package passed its scoped secret-pattern scan with zero concrete token/webhook-pattern hits. This does not cover the unavailable RC3 source, nested source assets, historical reader, or live credential state. Obtain and scan the exact RC3 source, remove browser-side secret/posting paths, and have the authorized credential owner revoke/regenerate exposed credentials before any bot/UI/source bundle is distributed. Keep the full gate OPEN until evidence is attached (D16, RG18).

## Priority 1 — policy and evidence

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
- **RG02 — KNOWN SOURCE RULES RECONCILED / EVENT CONFIGURATION OPEN:** Pilot and recurring source baselines are separated. The Event Settings Record explicitly tracks the Pilot special-mode label conflict, recurring Race-event placement, and recurring team/bot composition. Do not publish these choices until verified and approved for the specific event.

- **RG03 — OPEN / BLOCKING:** `test27xlsm_detailed_audit_polished_regression.xlsm` is the designated authority but is unavailable. Prior default/settings-only parity and four mutations apply only to a historical sample and separate formula-repaired copy. Repeat the full matrix on the exact canonical file, then verify in desktop Excel; do not certify live scores meanwhile.

- **RG04 — GUIDE PREPARED / CURRENT-CLIENT TEST OPEN:** The Training Room Host and Referee Guide is prepared. Verify actual installed-client controls, access, lineup visibility, spectator permissions, replay behavior, restart workflow, and screenshots before treating it as tested click-by-click instruction (RG21).

- **RG05 — EVENT SETTINGS RECORD PREPARED / EVENT-SPECIFIC VALUES OPEN:** Known source baselines and conflicts are recorded. The organizer must select the format, resolve the listed ambiguities, enter the actual date/time/time zone, map/stage schedule, ship limits, prize values, channel/contact routes, and approved settings version before signup or announcement (D52).

- **RG06 — PROCEDURE DOCUMENTED / RUNTIME TEST OPEN:** Evidence intake, OCR review, corrections, retention, result confirmation, and a manual Discord fallback are documented in the participant and maintainer guides. Test the approved live workflow, permissions, attachments, correction audit trail, retention, bot failure, and fallback before production use.

## Priority 2 — companion manuals

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
- **RG07 — DRAFT RULESETS PREPARED:** The Pilot and Recurring Tournament rulesets are delivered as v1.1 drafts and aligned with known source baselines. Complete the format-specific unknowns in the Event Settings Record and obtain organizer approval before issue.

- **RG08 — SCORING GUIDE PREPARED / IMPLEMENTATION OPEN:** The v1.1 scoring guide documents equations, selected C01–C06 policies, regression cases, invalid-input handling, and historical limits. The canonical workbook and calculator implementation remain unavailable/unverified; do not certify scores.

- **RG09 — SECURITY GUIDE PREPARED / SOURCE BUNDLE OPEN:** The v1.1 maintainer security/release guide and source-acquisition record are included. The exact RC3 bundle is missing; no sanitized RC3 source is approved or included. Never distribute the archived browser-side webhook reader or a credential-bearing artifact.

- **RG10 — GUIDE PREPARED / TESTED SCREENSHOTS OPEN:** The v1.1 Training Room guide is delivered with setup, ready-up, restart, replay, and closeout checks. Current-client screenshots and actual click-by-click verification remain outstanding.

## Priority 3 — publication

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</div>
- **RG11 — DOCUMENTATION CROSS-CHECK PASS FOR KNOWN SOURCES / EVENT VALUES OPEN:** Recurring bracket advancement uses the verified match outcome calculated from the published individual-performance metrics and approved scoring method, with tie-breaks applied as declared; individual Damage placement may also determine separately announced awards. Pilot drop-in/visible-lineup rules remain separate from recurring registration/hidden-lineup rules. The Event Settings Record tracks unresolved source ambiguities. Repeat this check after event-specific settings are populated.

- **RG12 — DOCUMENT QA PASS / EVENT PUBLICATION OPEN:** Final Word/Markdown/PDF internal navigation and print layout were checked; the final PDF was rendered and inspected. The v3.22 automated DOCX audit found 0 high, 101 medium, and 0 low findings across 11 active documents; the medium findings are table-header warnings that include layout/callout tables. They were not blindly auto-fixed because many are not data tables. This is not a full WCAG/legal review, and the user-directed release waiver means the warning count does not block this documentation package. Actual event fields and authorized sign-off remain blocking under RG05/RG22.

- **RG13 — OPEN / BLOCKING:** Implement C01 in the exact designated workbook and calculator: numeric positive finite elapsed seconds and the metric `1 / seconds` for Round 3. Invalid values block certification. The canonical workbook is unavailable, so formula parity and invalid-input behavior cannot be certified.

- **RG14 — OPEN / BLOCKING:** Verify Round 4 terms, aggregation, zero-total DamageShare, invalid time, class mapping, retired S10:S12, and retired Round-4 F8 behavior in the canonical workbook and approved calculator. Keep legacy cell addresses for audit compatibility.

- **RG15:** OPEN. Run the authoritative source and formula-repaired copy in the target Excel version, including Office 2010 if it remains the intended runtime; compile VBA, recalculate formulas, and run fixed regression cases. The VBA binary was preserved byte-for-byte in the repaired copy, but this does not prove that compilation or runtime behavior succeeds.

- **RG16:** Record current WoWS Numbers ship-level benchmarks and repeatable test scenarios, but do not claim public averages prove a score coefficient; see Appendix L of the Technical Reference.

- **RG17 — POLICY SPECIFICATION RESOLVED / IMPLEMENTATION OPEN:** C01–C06 are selected governing policies in v3.15. Apply and test inverse-time Round 3 scoring, fixed DD/CA/BB weights, retired S10:S12/F8 controls, suppression of the unverified dollar estimate, and C06 audit/change controls in the exact approved implementation.

- **RG18 — DOCUMENT SCAN PASS / LIVE CREDENTIAL RESPONSE OPEN:** Generated documentation/index/readme/PDF artifacts passed the scoped secret-pattern scan with zero concrete pattern hits. Obtain and scan the exact RC3/source assets, remove browser-side webhook/posting paths, and have the authorized issuer revoke/regenerate any exposed live credential. Attach non-secret evidence; document scan does not prove rotation.

- **RG19 — Archived OCR regression:** archive-source npm test passed 32/32 under Linux Node v24.22.1; the reported-screenshot test failed by 60 damage (expected 87373, extracted 87313); the four-image run timed out at 120 seconds and is inconclusive. The archived package is not the latest RC3 source.

- **RG20 — RC3 TARGET RUNTIME NOT TESTED (WAIVED AS A DOCUMENTATION-RELEASE GATE):** The exact RC3 source and full Windows Node 24 acceptance, native Tesseract comparison, frozen screenshot fixtures, single/multi-image tests, retries/timeouts, and live Discord smoke tests are unavailable/not run. They remain runtime-certification follow-up, not a prerequisite for publishing this documentation package. Historical v1 tests do not certify RC3.

- **RG21 — CURRENT-CLIENT WALKTHROUGH OPEN:** Complete setup, team composition, mode/map/timer, lineup visibility, observers, replay retention, ready-up, fault/restart, and closeout in the installed client; record build/date/screenshots/tester. The v1.1 guide is a draft, not proof of a successful walkthrough.

- **RG22 — EVENT-INSTANCE APPROVAL NOT RECORDED (NOT A DOCUMENTATION-RELEASE GATE):** C01–C06 are selected policies, not organizer signatures. A particular event still needs a dated Event Settings Record, source-ambiguity decisions, PUB01/PUB02/PUB09 assignments, scoring-build identity, real approval/effective times, and authorized sign-off before the event is announced or run.

- **RG23 — HISTORICAL REPAIRED-COPY EVIDENCE ONLY:** A separate historical validation copy restored per-player total formulas and matched four controlled HTML mutations in the formula engine. Repeat row-by-row in desktop Excel on the exact designated workbook; do not treat the historical copy as accepted.

- **RG24 — HISTORICAL REPAIRED-COPY EVIDENCE ONLY:** A separate copy restored Tourney Totals!H4:H11 and E5:E11. Verify every row and H12 in desktop Excel and HTML on the designated workbook before release; do not promote the historical repaired copy by implication.

<a id="appendix-h-publication-approval-pub01pub09"></a>

<a id="section-7"></a>
# Appendix H — Publication approval PUB01–PUB09

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</div>
> 🎯 Purpose: Record formal publication approval.
>
> 📚 Contents: PUB01–PUB09 capture ownership, approver, date/time, version, scope, status, and related sign-off details.
>
> 🧭 Use: Complete after settings and release gates are reviewed.

Before converting this draft into a formally issued rulebook, fill in the following:

- **Document owner:** \[assign\]

- **Approving organizer:** \[assign\]

- **Approval date/time and time zone:** \[assign\]

- **Published version:** \[assign\]

- **Effective date/time:** \[assign\]

- **Applicable format(s):** \[Pilot / detailed recurring / both master policy only\]

- **Associated Event Settings Sheet version:** \[assign\]

- **Scoring workbook/formula version, if applicable:** \[assign\]

- **Review/appeal contact function:** \[assign\]

Do not publish with unresolved placeholders in an event-specific ruleset. In the general manual, placeholders are a checklist of work still required, not live rules.

<a id="appendix-i-competitive-tactics-reference-i01i13"></a>

<a id="section-8"></a>
# Appendix Q — Organizer and Technical-Maintainer Instructions

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</div>
Purpose: Appendix Q is the staff-only runbook for preparing, operating, verifying, approving, publishing, and closing an event. Chapters 1–8 of the Participant Guide remain the main participant-facing instruction path. This appendix coordinates organizer and technical-maintainer actions; it does not replace approved event rules, the event-settings record, or an authorized ruling.

## Q1 — Roles, authority, and change control

> 🧭 1.  Name the event owner, referee or escalation contact, scorekeeper, publication approver, and technical maintainer. Record the assigned roles in the approved event-settings record.
>
> 🗂️ 2.  Record the exact versions of the rules, settings, workbook, calculator, and deployed bot/build that govern the event. Record the owner, approver, approval time, effective time, and any later change.
>
> ⚖️ 3.  If approved rules, dated settings, workbook behavior, or official records conflict, pause the affected action and obtain an authorized ruling. Preserve each source; do not combine incompatible instructions.
>
✅ **Done when:** every required role has a named owner, the governing versions and effective dates are recorded, and the escalation path is clear.

## Q2 — Prepare and approve the event

> 📅 1.  Select the governing format and document model before opening registration. Keep pilot exceptions separate from recurring-event rules.
>
> 🧾 2.  Complete the approved event-settings record. Fill every applicable field or mark it “not used”; assign each setting a value, version, approver, and effective time.
>
> 🧪 3.  Walk through the end-to-end workflow: room setup, lineup verification, screenshot intake, corrections, official record entry, incident/restart logging, score review, and fallback handling.
>
> 🚦 4.  Review Appendix G for release gates and Appendix H for publication approval. Do not announce the event or release a setting that still requires an approval or has an open blocking gate.
>
> 📣 5.  Publish the approved rules, schedule, time zone, check-in window, required evidence, support routes, dispute contact, and settings version.
>
✅ **Done when:** the event owner and approver have signed off on the same dated settings, the workflow has been rehearsed, and participants can find the current rules and contacts.

## Q3 — Match-day operations and exceptions

> 📣 1.  Confirm the official announcement, schedule, room host, participant identity mapping, escalation contacts, and current settings version before the first match.
>
> ⚙️ 2.  Verify the Training Room against the fixture: mode, map, timer, sides/spawns, player slots, lineup legality/visibility, and observer permissions. Resolve objections before ready-up.
>
> ⏱️ 3.  Keep attendance, between-game, request-cutoff, and restart-completion clocks distinct. Apply only the published threshold for the specific situation.
>
> 🚨 4.  Log faults, restart requests, rulings, disputes, corrections, and timestamps. If a rule or setting is ambiguous, pause the affected match or bracket action and escalate; do not improvise a new command or rule.
>
> 📸 5.  Preserve the original screenshots, replay evidence when required, incident record, correction history, and final official record.
>
✅ **Done when:** each match used the approved settings, exceptions have a documented ruling, and evidence and final results can be traced to the correct match and participants.

## Q4 — Workbook and scoring maintenance

> 🧮 1.  Identify the authoritative workbook by exact filename, version, formula set, and approved event-settings record. Keep the untouched baseline separate from test or repaired copies.
>
> 📸 2.  Preserve original screenshots, raw entries, participant identity, round, class/tier values, and input provenance. Never alter evidence to force a match with an expected score.
>
> 🧪 3.  Compare Excel and HTML using the same data, settings, inputs, aggregation, and display precision. Inspect round results, participant-level `dblns`, aggregate totals, and the final displayed value.
>
> 🧮 4.  Keep unrounded outputs in test records and explain display rounding separately. Use Appendix K of the Technical Reference for the equation and multiplier meanings; use Appendix O of the Technical Reference for the last recorded validation evidence and limits.
>
> 🛑 5.  Do not certify or publish a score while formulas are missing, outputs disagree, unsupported values appear, or the target desktop Excel/VBA environment has not passed the required tests, including Office 2010 when that is the required runtime.
>
✅ **Done when:** the exact governing file is identified, same-input parity is demonstrated, raw evidence is retained, rounding is documented, and all score-release prerequisites are satisfied.

## Q5 — Discord, bot, and evidence handling

> 🤖 1.  Verify the exact deployed bot/build fingerprint, runtime, configured channels, approved test account, and required permissions before declaring the workflow ready.
>
> 🔐 2.  Keep tokens, webhooks, private configuration, and participant records out of public channels, screenshots, and distributable packages. Limit access to the people who need it.
>
> 📸 3.  Run an authorized smoke test from screenshot intake through field extraction, one-at-a-time correction, structured record output, logging, and duplicate-post checks.
>
> 🧯 4.  Test failure messages, unavailable dependencies, ambiguous OCR, retry/cancel paths, and the documented manual fallback. When OCR is uncertain, verify against the original screenshot; never infer an unreadable value from the desired score.
>
> 🗂️ 5.  Keep original images, OCR results, participant corrections, accepted data, workbook results, awards, and bracket decisions as separate traceable records.

🛡️  Maintainer-only: Do not use the archived score_report_imgToDiscord.html for live participant data; it exposes a browser-side webhook/posting path. Before using any replacement reader, revoke or regenerate the exposed webhook, remove browser-side posting, use an approved secure send path if needed, require explicit participant review before sending, inspect the exact replacement file, and pass the applicable secret-scan and release checks in Appendices G, J, and O.

✅ **Done when:** the tested build and permissions are recorded, normal and failure paths work in the target environment, sensitive values remain protected, and every accepted value can be traced to its evidence.

## Q6 — Publication, archive, and closeout

> 🧮 1.  Reconcile each participant’s accepted evidence and raw inputs with the official workbook result, aggregation, and bracket/award output. Record corrections and authorized rulings.
>
> 🚦 2.  Close the applicable Appendix G release gates and complete the Appendix H publication-approval record. Open blocking gates stop the affected release.
>
> 📣 3.  Publish only the approved rules/settings version, verified standings, awards, and appeal instructions. Include the effective date and the path for reporting an error.
>
> 🗂️ 4.  Archive the issued documents, settings, workbook/build identifiers, evidence index, test results, corrections, disputes, approvals, and final results under the approved retention policy.
>
✅ **Done when:** published materials match the approved version, all released results are traceable, required approvals are recorded, and the event record is archived.

## Q7 — Internal reference map

📋 Appendix A holds decision history; Appendix B of the Technical Reference contains situational examples; Appendix C records exclusions; and Appendix D supplies operating templates and checklists.

🔗 Appendix F of the Technical Reference records sources and evidence. Appendix G tracks release gates, Appendix H records publication approval, and Appendix J of the Technical Reference tracks reconciliation and defect status.

🧮 Appendix K of the Technical Reference explains scoring equations and multipliers; Appendix M of the Participant Guide tests performance claims; Appendix N of the Technical Reference records the selected C01–C06 policies and implementation acceptance checks; Appendix O of the Technical Reference records validation evidence and release status; Appendix P of the Participant Guide covers damage and combat mechanics.

🧭 Chapters 1–8 of the Participant Guide remain the main reading path for the tournament rules, participant workflow, match procedures, tactics, scoring, and combat guidance. This appendix coordinates staff actions but does not override approved rules or participant-facing instructions.

✅ **Done when:** staff can identify the governing procedure, evidence record, approval gate, and escalation route for the task without treating a reference appendix as authorization to bypass a rule.

## Q8 — Companion release documents and required hand-off

The following companion documents are included in this v3.22 production documentation release; their historical policy basis and source provenance remain documented separately. They are released as documentation and reusable templates. A template becomes an event-specific notice or ruleset only when the dated Event Settings Record and applicable PUB01–PUB09 approval fields are completed by authorized people.

- 📋  **Event Settings and Publication Approval Record** — one copy per event/stage; records selected format, exact settings, authority/build identity, approvals, effective time, and release disposition.
- 🛡️  **Pilot Event Ruleset** — participant-facing rules for the attendance-based Pilot, retaining Pilot-only lineup, timing, restart, evidence, and individual Damage-award rules.
- 🏆  **Recurring Tournament Ruleset** — registration, roster/lineup visibility, match outcomes, D21 tie-breaks, restart/forfeit handling, individual awards, replays, and disputes for the recurring format.
- 👥  **Participant Quick Start** — participant identity, original screenshot/evidence, score review, corrections, dispute route, and closeout.
- ⚙️  **Training Room Host and Referee Guide** — room preflight, two-side confirmation, clocks, restart decisions, and match closeout. Exact installed-client clicks remain unverified pending a live walkthrough.
- 🧮  **Scoring Workbook and Validation Guide** — selected C01–C06 policies, input validation, score provenance, and the target regression matrix. It is not certification of the unavailable canonical workbook.
- 🤖  **Discord Bot Maintainer Security and Release Guide** — source identity, local OCR requirements, credential safety, acceptance testing, and manual fallback. The exact RC3 source package and actual credential-rotation evidence remain unavailable.
- 🚦  **Release Gate Status and Reconciliation Record** — evidence checklist for each technical, security, event-configuration, accessibility, print-layout, and approval gate.

- 📦  **Source Bundle Status and Acquisition Record** — Documents that the exact RC3 source bundle is unavailable and sets acquisition, hashing, secret-scan, credential-response, and release-evidence requirements.
- 🚦  **Completion and Open-Gates Report** — Records C01–C06 selections, completed document checks, remaining runtime and human-approval blockers; outgoing hyperlink checks were excluded by instruction.

**Operational follow-up (not a blocker to publication of this v3.22 documentation package):** the designated canonical workbook and exact RC3 source, target-runtime tests, source/secret scan, credential response, current-client walkthrough, accessibility/navigation/print checks, event settings, and human sign-offs remain unverified or unsupplied. The user-directed waiver permits this documentation release, but it does not turn those checks into passes. Do not include an unsanitized source archive in a public release.

✅ **Done when:** Each companion has a named version; event-specific values agree with the signed settings record before a particular event is announced; participants and maintainers receive the appropriate documents; and technical gates are clearly marked PASS, NOT TESTED, or WAIVED for the documentation release. Package publication never implies that an untested gate passed.
