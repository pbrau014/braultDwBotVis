🏷️ Version: 3.15 — policy and release-document reconciliation

📅 Prepared: 29 October 2026

**📝 Status: Working draft. Not approved for event publication, score certification, or live bot deployment.**

## **🧭** **Contents & quick navigation**

### **🗂️** **Main manuals — read in process order**

[<u>📘 Chapter 1 — General Tournament Rules & Procedures</u>](#chapter-1-general-tournament-rules-procedures)

[<u>🤖 Chapter 2 — Discord & Bot Operations Manual</u>](#chapter-2-discord-bot-operations-manual)

[<u>🧮 Chapter 3 — Scoring & Workbook Operations Manual</u>](#chapter-3-scoring-workbook-operations-manual)

[<u>⚙️ Chapter 4 — Training Room Setup & Match Operations Guide</u>](#chapter-4-training-room-setup-match-operations-guide)

[<u>🎯 Chapter 5 — Individual Game-Strategy Guide</u>](#chapter-5-individual-game-strategy-guide)

[<u>⚓ Chapter 6 — Competitive Tactics Procedure</u>](#chapter-6-competitive-tactics-procedure)

[<u>🧮 Chapter 7 — Scoring Equation & Workbook Verification Procedure</u>](#chapter-7-scoring-equation-workbook-verification-procedure)

[<u>💥 Chapter 8 — Damage & Combat Mechanics Procedure</u>](#chapter-8-damage-combat-mechanics-procedure)

### **📚** **Reference appendices**

[<u>📋 Appendix A — Decision register D01–D52</u>](#appendix-a-decision-register-d01d52)

[<u>💬 Appendix B — Situational examples S01–S31</u>](#appendix-b-situational-examples-s01s31)

[<u>🚫 Appendix C — Exclusion register X01–X07</u>](#appendix-c-exclusion-register-x01x07)

[<u>🧰 Appendix D — Operating templates and checklists T01–T07</u>](#appendix-d-operating-templates-and-checklists-t01t07)

[<u>📖 Appendix E — Glossary G01–G26</u>](#appendix-e-glossary-g01g26)

[<u>🔗 Appendix F — Sources and evidence register SRC-01–SRC-32</u>](#appendix-f-sources-and-evidence-register-src-01src-32)

[<u>🚦 Appendix G — Release gates and outstanding work RG01–RG24</u>](#appendix-g-release-gates-and-outstanding-work-rg01rg24)

[<u>✅ Appendix H — Publication approval record PUB01–PUB09 (status: NOT APPROVED)</u>](#appendix-h-publication-approval-pub01pub09)

[<u>🎯 Appendix I — Competitive tactics reference I01–I13</u>](#appendix-i-competitive-tactics-reference-i01i13)

[<u>🔍 Appendix J — Reconciliation register RC01–RC33 (status and action)</u>](#appendix-j-reconciliation-register-rc01rc33-status-and-action)

[<u>🧮 Appendix K — Scoring equation, inputs, and multiplier reference K01–K13</u>](#appendix-k-scoring-equation-inputs-and-multiplier-reference-k01k13)

[<u>📊 Appendix L — WoWS Numbers individual ship-statistics benchmarks L01–L05</u>](#appendix-l-wows-numbers-individual-ship-statistics-benchmarks-l01l05)

[<u>🗣️ Appendix M — Performance-claim evidence cards M01–M07</u>](#appendix-m-performance-claim-evidence-cards-m01m07)

[<u>❓ Appendix N — Resolved scoring policies and implementation checks C01–C06</u>](#appendix-n-resolved-scoring-policies-and-implementation-checks-c01c06)

[<u>🧪 Appendix O — Validation results, release status, and completed work</u>](#appendix-o-validation-results-release-status-and-completed-work)

[<u>💥 Appendix P — Damage, fires, flooding, and secondary brawling mechanics P01–P11</u>](#appendix-p-damage-fires-flooding-and-secondary-brawling-mechanics-p01p11)

[<u>🧭 Appendix Q — Organizer and Technical-Maintainer Instructions</u>](#appendix-q-organizer-and-technical-maintainer-instructions)

## **📝** **Abstract**

This manual brings tournament rules, Discord/bot intake, scoring, match procedures, and individual tactics together. Chapters 1–8 follow the work from event setup to score verification and combat decisions. The appendices hold detailed decisions, examples, checks, equations, and validation records; cross-references point to the relevant section instead of repeating material.  
**🧭 Reading path:** Participants should begin with the approved event rules, use the participant procedures in Chapter 2, then consult the match and gameplay sections that apply. Organizers and technical maintainers should use Appendix Q as their role-specific index and complete relevant approval and release checks before publishing a setting, tool, or result.  
**🏆 Governing rule:** In the detailed recurring format, the official match result (win/loss/forfeit) determines bracket advancement. Apply the published tie-break order in Appendix A, Decision D21. The Pilot Event uses its published individual-Damage placement for the stated awards and has no bracket progression unless a separate bracket is announced before registration. The approved workbook’s dblns output is an individual scoring result and may affect awards or seeding only when the applicable rules and dated settings expressly say so. A screenshot, OCR result, HTML value, workbook total, award, and match result are separate records; verify each before relying on it. Appendix K defines the score model and its implementation limits.

<a id="chapter-1-general-tournament-rules-procedures"></a>
# 📘 Chapter 1 — General Tournament Rules & Procedures

> <span style="color:#244c70">⚓ **Quick hint:** Use the official match result for bracket advancement; treat individual scoring as a separate output.</span>


## 🏆 1.1 — Match results determine bracket advancement; dblns is a configured individual scoring output

> <span style="color:#244c70">⚓ **Quick hint:** Use the official match result for bracket advancement; treat individual scoring as a separate output.</span>


🗺️ Procedure

> 🧮 1. 🔍 Identify the approved workbook and formula version in the approved event-settings record.
>
> 👥 2. 🧾 Record which event rounds contribute, how participant values are aggregated, how displayed precision is handled, and how ties are settled.
>
> 🏆 3. 🔢 Calculate the participant's dblns result using the approved workbook; retain input evidence and the exact workbook/version.
>
> 🏆 4. 📊 Use that result to determine bracket placement/progression under the published settings.
>
> 🏆 5. 🧾 If data, results, formula versions, or settings disagree, pause the affected bracket action. Record the discrepancy and obtain an authorized ruling before proceeding.

The scoring workflow and parity checks are set out in Chapter 7. The equation and multiplier explanations are in Appendix K. Public ship statistics in Appendix L can inform test cases but cannot prove formula correctness.

> **✅ 🧾 Done when:** The workbook/version, inputs, unrounded calculation trail, participant dblns result, and any tie decision are recorded; unresolved discrepancies are held for an authorized ruling.

## 🎯 1.2 — Select the governing format before announcing the event

> <span style="color:#244c70">⚓ **Quick hint:** Confirm the declared event format before applying eligibility, roster, timing, or award rules.</span>


| **⚙️ Procedure**            | **🧪 Pilot Event**                                          | **📘 Detailed recurring format**                                       |
|-----------------------------|-------------------------------------------------------------|------------------------------------------------------------------------|
| 📚 Governing rules document | yolo_event.docx                                             | yolo_rules_xmpl.docx                                                   |
| 📘 Participation            | Apply the published pilot drop-in/cutoff wording            | Apply published registration, roster, and eligibility controls         |
| ⚙️ Lineup visibility        | Use visible lineup only where the pilot settings declare it | Keep lineups hidden until both sides and slots are correctly organized |
| ⚙️ Settings                 | Simplify only what the pilot expressly changes              | Use the full event settings and reporting/replay controls              |
| 🧯 Exceptions               | Pilot-only; do not transfer automatically                   | Recurring rules; do not inherit pilot exceptions silently              |

> ⚖️ Rule — Normal case first; conflicts remain separate situations, not blended rules. The approved rules, dated event settings, and workbook decide the normal case. Appendix B illustrates how disagreements can arise; an authorized ruling resolves them.
>
> **✅ 🧾 Done when:** The applicable format and rule source are explicitly selected, conflicting alternatives are resolved by an authorized decision, and dated event settings match the selected format.

## 📣 1.3 — Prepare and approve the event

> <span style="color:#244c70">⚓ **Quick hint:** Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</span>


> 👥 1. 📋 Choose the event format and owner. Confirm the document model, eligibility and roster settings, and schedule structure before announcing the event.
>
> ⏱️ 2. 🧾 Complete the approved event-settings record. Fill every applicable field or mark it “not used”; give each configurable item an approved value, version, approver, and effective time.
>
> 👥 3. 📊 Open registration and communications: apply the approved event rules; publish deadlines, participant identity mapping, support routes, and official notice process.
>
> ⏱️ 4. 📣 Publish fixtures and rules: identify stage, opponent, time zone, room host, applicable settings version, reporting requirements, and dispute contact.
>
> 🔄 5. 🧾 Test the process: run a controlled walkthrough of room preparation, screenshot intake, corrections, official record entry, restart logging, and fallback routes.
>
> ⚙️ 6. 🛑 Stop before opening if a mandatory setting or release gate is missing (Appendix G).
>
> **✅ 🧾 Done when:** The event settings, owner, approver, effective time, schedule, notices, support route, and evidence process are complete and approved before registration or play begins.

## 🗺️ 1.4 — Operate each match

> <span style="color:#244c70">⚓ **Quick hint:** Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</span>


> 👥 1. ✅ Check in: participants and representatives monitor official notices and arrive within the declared attendance window (as stated in the approved event rules).
>
> ⚙️ 2. 🛠️ Create the room: assigned host opens the Training Room, invites the opponent and authorized observers, and identifies the match/game (as stated in the approved event rules).
>
> 👥 3. 📋 Verify settings: both representatives check the fixture's mode, map, timer, sides/spawns, player slots, lineup legality/visibility, and observer permissions (the approved event rules and the approved event-settings record).
>
> ⚙️ 4. 🧾 Resolve objections before ready-up: record corrections; if unresolved, contact the referee. Do not start under contradictory settings.
>
> ⏱️ 5. 🧾 Play and document incidents: use the applicable clock, restart, and lineup-change rules (the approved event rules and the approved event-settings record). Different clocks remain distinct; see the matching situational examples.
>
> 👥 6. 📸 Submit evidence: each participant supplies the required readable post-game screenshot. Preserve replays and incidents under the approved event rules.
>
> ⏱️ 7. 🧾 Validate the official record: the scorekeeper checks evidence, enters results, retains corrections, and routes disputes under the approved event rules and the approved event-settings record.
>
> 🏆 8. 🔢 Update bracket state from the verified official match result and the published recurring-format tie-breaks. Record any dblns result separately for individual scoring or awards; a score mismatch does not silently change the match winner.
>
> **✅ 🧾 Done when:** The room matches approved settings, both lineups are legal and ready, the correct timing rule is applied, and the result and supporting evidence are recorded.

## 🔄 1.5 — Enforce the normal timing and restart procedure

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


Use the detailed recurring rules as the normal baseline unless the selected format's approved settings state otherwise:

📋 ⚖️ Timing and restart rule: apply the approved event rules and settings record first; use the normal thresholds below only where no authorized event-specific setting differs.

⏱️ 🧾 Attendance: allow 10 minutes from the scheduled start, or use the published between-game clock.

⏱️ 🚫 No-show: apply the published outcome for one or both absent sides and preserve timestamp evidence.

🔄 🧾 Restart grounds: qualifying load/disconnect, incorrect settings/sides/spawns, bugged spawn, or official fault; report promptly.

⏱️ 🚦 Request cutoff: allow 2 minutes of game time, except for documented official faults.

⏱️ 🧾 Restart window: allow 5 minutes from the call; keep this clock separate from attendance timing. See Appendix B for examples.

👥 🔢 Per-team allowance: allow one team-requested restart per team in best-of-one/two/three, and two in best-of-five. Official-fault restarts do not count; record the chosen limit and any exceptions.

These are default thresholds from the detailed rules. Record any authorized format-specific values in the approved event-settings record. If published rules, dated settings, or other controlling records conflict, pause the affected decision and obtain an authorized ruling; do not improvise a threshold.

> **✅ 🧾 Done when:** The correct no-show and restart thresholds are applied, separate clocks/quotas are recorded, and the restart, continuation, or ruling is documented before the next match step.

## 📣 1.6 — Close the event

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


> 👥 1. 🧾 Reconcile participant evidence with official records; record missing/ambiguous evidence and resolve disputes (as stated in the approved event rules).
>
> 🏆 2. 🧾 Compute or import the approved dblns result and verify round aggregation with the identified workbook version (Chapter 3; Appendix K; the internal reconciliation record).
>
> 🏆 3. 📊 Publish only approved standings/awards and explain any correction within the published appeal rules (as stated in the approved event rules).
>
> ⚙️ 4. 🧾 Archive versioned settings, evidence, corrections, replays, rulings, and final results for the declared retention period (as stated in the approved event rules).
>
> ⚙️ 5. ✅ Close required release gates, complete the publication-approval record, and freeze the issued rules/settings version (Appendices G–H).  
> **✅ 🧾 Done when:** Results and evidence are reconciled, open disputes have an owner and status, official standings and progression are confirmed, and required retention and award actions are recorded.

<a id="chapter-2-discord-bot-operations-manual"></a>
# 🤖 Chapter 2 — Discord & Bot Operations Manual

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


This chapter is the dedicated home for all Discord and bot operating material, from submission through verification, correction, security, and fallback. Other chapters refer here instead of repeating these procedures. It governs the operational path from a participant's image to a verified battle record, but does not certify a deployed bot, turn the local HTML calculator into an official record system, or authorize the unsafe archived image reader. Refer to Appendix O for the tested build/status and the release gates in Appendix G before deployment.

## ✏️ 2.1 — Choose the correct tool before acting

| **📋 Task**                                                           | **✅ Approved path**                                                                                                         | **🛡️ Boundary**                                                                                     |
|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| 🧾 Submit a battle record                                             | Original Personal Score screenshot through the organizer-designated Discord intake route, when the approved bot is available | A bot response must be checked against the original screenshot before it becomes official evidence. |
| ✅ Draft or test score inputs                                         | Standalone Score Calculator HTML (Chapter 3)                                                                                 | Local browser state only; no verified server synchronization or protected sign-in.                  |
| 📸 Read OCR text using the archived image reader                      | Do not use the archived file for live data                                                                                   | It contains a browser-side webhook/posting path; see §2.6 and security requirements in Appendix G.  |
| 🏆 Edit an accepted score, view protected totals, or change a bracket | Organizer-approved recordkeeping workflow                                                                                    | No verified admin-only command or secure admin HTML workflow was found in the reviewed snapshot.    |

🧭 Operating sequence: prepare the screenshot → submit once → validate extracted fields → correct one item at a time → compare the accepted record to evidence → route official scoring through Chapter 3. If a required value is still unclear, pause and use the manual fallback—never fill the gap by guessing.

> **✅ 🧾 Done when:** The participant or operator has selected the approved path for the task and knows the fallback route if the primary tool is unavailable.

## ⏱️ 2.2 — Validate the battle-record contract

The reviewed bot snapshot expects all eight fields below before posting a complete record:

| **🧾 Required field** | **🔎 Verification action**                                     |
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
> **✅ 🧾 Done when:** Required identity, battle, and metric fields are present and traceable; missing or ambiguous fields are rejected or routed for correction rather than guessed.

## 👥 2.3 — Participant procedure: capture and submit the screenshot

> 🎯 1. 🖥️ Open the World of Warships PC Personal Score/post-battle screen that includes the requested values.
>
> 👥 2. ✅ Make sure the player, map/mode, start time, Credits, Free XP, and Damage are readable and not covered or cropped.
>
> 📸 3. 📸 Save or capture the original image; recapture it if blurred rather than reconstructing values from memory.
>
> 🤖 4. 📸 Open the organizer-designated Discord intake channel and attach the image to a single message. Do not use a different channel or repeatedly post the same file while processing is underway.
>
> ⏱️ 5. 🤖 Read the bot response. If all required fields validate, it should produce a structured record; if a field is missing or ambiguous, it should request that item for correction.
>
> 📸 6. 🧾 Compare the resulting record against all eight required fields extracted from the screenshot before treating it as verified.
>
> 🤖 7. 🧾 If the accepted record is wrong, retain the original screenshot and bot response, then notify the authorized recordkeeper; do not invent an edit command.

If any required field remains unresolved, do not use the record as an official score. Route it to the manual fallback and mark any internal record provisional until a scorekeeper resolves it against the original screenshot.

Damage-record submission flow: the participant supplies the original image, the bot checks required fields, and unresolved values require correction.

> **✅ 🧾 Done when:** The original screenshot is readable, matches the participant and battle, and is submitted through the approved route with correction or failure status recorded.

## 👥 2.4 — Participant procedure: answer correction prompts

> 🔎 1. 🔍 Read the latest prompt and identify the one field requested.
>
> 📸 2. ✅ Recheck that field on the original screenshot, especially Damage digits and separators.
>
> 🎯 3. 💬 Reply with the verified value only, in the format requested; do not include a field label, multiple fields, or commentary.
>
> ⏱️ 4. 🔄 Continue one prompt at a time until the record is complete; if you cannot verify a value, use the documented cancel correction route rather than guessing.
>
> 🔄 5. 💬 Keep the reply in the same user/channel interaction. The reviewed snapshot documents a 30-minute pending-correction expiry and loss of pending state on bot restart; confirm that behavior against the actually deployed build.

Correction loop: read one prompt, verify from the image, reply with one value, then repeat or cancel.

A prompt does not prove the OCR system is correct; it is a deliberate safety stop. Preserve screenshots and records under the approved event rules and the approved event-settings record.

> **✅ 🧾 Done when:** The participant confirms only values supported by original evidence; the corrected record is revalidated, and unresolved ambiguity is sent to manual review.

## 🤖 2.5 — Operator procedure: verify Discord behavior and permissions

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


> 🤖 1. 🔍 Confirm the exact bot build, build fingerprint, configured target channel, and approved test account before declaring the workflow live.
>
> ⏱️ 2. 🧪 Run the authorized screenshot smoke test and verify: message detection, field extraction, one-at-a-time correction, final structured record, log trail, and no duplicate post.
>
> 🔐 3. ✅ Check required channel access: View Channel, Read Message History, and Send Messages; confirm Message Content Intent only where required by the deployed implementation.
>
> 👥 4. 📣 Use functional channel names in written instructions: announcements, registration/access, schedule/fixtures, help, urgent match escalation, screenshot intake/results, private sensitive support, and optional voice/observer spaces. Put actual channel names, IDs, permissions, or invite links only in a controlled server-specific setup document.
>
> 👥 5. 🛑 Do not invent /admin, /score, /refresh, or other commands. The reviewed code snapshot did not verify slash-command registration or admin-only score-editing operations.
>
> 🏆 6. 📊 For official score edits, roster changes, leaderboard display, or bracket updates, use a separate authorized recordkeeping process until the exact function is implemented and tested.
>
> **✅ 🧾 Done when:** The test record confirms the intended commands, permissions, failure responses, and evidence path; no live deployment proceeds on an untested assumption.

## 📸 2.6 — Handle the archived HTML image reader safely

The supplied score_report_imgToDiscord.html exposes a Discord webhook in browser-side JavaScript and automatically posts extracted text. Do not use this archived version for live participant data or redistribute it unchanged. Hiding a URL in the same HTML file is not a secure fix.

The file's visible feature inventory lists: Choose an image or drag it here, Paste Clipboard Image, Read Text, Copy Text, Download Text, Reset, and an Extracted Text area; its help text lists PNG, JPG, WEBP, and BMP. This is a description of the unsafe archived copy, not permission to use it.

Do not use the archived image reader for live participant data. Use the approved bot only after it passes the required release gates; otherwise use the manual fallback described in Section 2.8. Before any replacement reader can be used, an authorized operator must revoke or regenerate the exposed webhook, remove browser-side posting, implement an approved secure send path if needed, inspect the exact new file, and retest explicit user review and sending behavior. Check the internal reconciliation record, required release gates in Appendix G, and validation evidence in Appendix O before release.

> **✅ 🧾 Done when:** The archived reader is treated as a limited test artifact, its outputs are checked against the source image, and it is not trusted with secrets or treated as a production service.

## 👥 2.7 — Protect credentials and participant records

🔐 Treat any live token, webhook, or credential found in a distributed package or HTML file as compromised; revoke it with the issuing service and generate a replacement.

⚙️ Keep secrets in private server-side configuration or an untracked local.env; never put them in browser code, public ZIPs, screenshots, logs, or manuals.

🤖 Prefer an authenticated server-side relay with validation and rate limiting over direct browser-to-webhook posting.

⏱️ Restrict screenshots to authorized staff and retain only the data needed for the event; apply the approved event rules and the event's announced retention/deletion schedule.

🔐 Rescan the final package before distribution. The review status of each asset is in Appendix O; a sanitized package does not itself revoke a live credential.

> **✅ 🧾 Done when:** Credentials are absent from public/client files, access follows least privilege, and participant evidence follows the approved retention policy.

## 🧯 2.8 — Failure handling and manual fallback

| **⚠️ Failure**                                                             | **🧯 Action**                                                                                                                            |
|----------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| 🤖 No bot response                                                         | Confirm target channel and attachment; operator checks availability and permissions. Use the approved manual intake fallback.            |
| 📘 Blurry or cropped Damage                                                | Use the Personal Score Damage verification procedure in Appendix P and request a clearer original screenshot.                            |
| ⏱️ OCR candidates disagree                                                 | Leave the field unresolved; preserve evidence and request a human correction.                                                            |
| 📘 Duplicate or delayed response                                           | Check the record identity and timestamps; avoid silent overwrite and retain the audit trail.                                             |
| ✏️ Correction expires or disappears                                        | Re-submit through the approved route as directed; do not reuse stale values without checking the original screenshot or accepted record. |
| ⏱️ Record has wrong identity, map, mode, time, Credits, Free XP, or Damage | Preserve screenshot and response; send both to the authorized recordkeeper.                                                              |
| 🧮 Calculator says the total differs                                       | Stop score publication and follow Chapter 3 / Appendix K regression checks; never change a raw input merely to force a match.            |
| 🏆 Need official totals or Doubloons                                       | Use the approved results process; the screenshot bot is not a verified live leaderboard.                                                 |

After recovering from a service failure, repeat the test tied to that failure, check logs, and confirm no duplicate or corrupted result before resuming automated intake.

> **✅ 🧾 Done when:** The failure is recorded, automated processing stops safely, and the approved manual route produces the required evidence fields and audit trail.

## 📣 2.9 — Release boundary

> <span style="color:#244c70">⚓ **Quick hint:** Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</span>


The packaged bot user manual and archived bot code are not proof of production readiness. Appendix O contains the actual test evidence, failure observations, target-runtime status, and release verdict; Appendix G lists the gates that must pass. Do not publish “production-ready” until the exact release build passes the required Windows/Node 24 OCR, interaction, security, and Discord smoke tests.  
**✅ 🧾 Done when:** The exact release version and approval are recorded, applicable security and regression gates pass, and the tool’s stated limits match the evidence.

<a id="chapter-3-scoring-workbook-operations-manual"></a>
# 🧮 Chapter 3 — Scoring & Workbook Operations Manual

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


This chapter defines the safe data-entry and validation procedure. The complete equation, numerical inputs, multipliers, default-value semantics, and worked examples live only in Appendix K; reference them instead of restating their mathematics here.

## 🧮 3.1 — Identify and preserve the authoritative workbook

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


> 🧮 1. 🔎 Use `test27xlsm_detailed_audit_polished_regression.xlsm` as the designated canonical workbook. It is currently unavailable in the accessible files; `test27xlsm.xlsm` and its repaired copy are historical evidence only and must not be used for live certification.
>
> 🧮 2. ✏️ Retain an untouched copy and use a separate working copy for approved repairs or experiments. Do not rename tabs, move cells, overwrite formula cells, or change macros as part of routine data entry.
>
> ⚙️ 3. 🧾 Confirm the filename, version, sheet set, input/output cell map, calculation mode, and saved baseline in the approved event-settings record and validation record before entering live results.
>
> 🧮 4. 🛑 The separate test27xlsm_formula_repaired_copy.xlsm is a validation artifact, not automatically the approved replacement. It restores 44 formula cells based on neighboring-row patterns; its formula-project bytes were left unchanged, but the repair still needs desktop Excel and regression acceptance.
>
> ⏱️ 5. 📋 Do not assume worksheet names from an archived example match the active file. The archived workbook uses Event1-Damage, Event2-Kills, Event3-Race, Event4-GrandYolo, and Tourney Totals; verify the actual tabs and ranges before use.
>
> **✅ 🧾 Done when:** The designated workbook/version is recorded, an untouched copy is preserved, and the file is marked approved or not yet certified according to release-gate evidence.

## 👥 3.2 — Enter participant and game data

> 📣 1. 📋 Open the round sheet specified by the approved event setup.
>
> 👥 2. 🧾 Enter only participant identity supported by the record, class/code, tier, Damage, Kills, and the declared Race/time metric in the intended input cells.
>
> 👥 3. ✏️ Tie each observation to the correct participant and game row. Confirm the row count and formula coverage include every active participant/game.
>
> 📸 4. 📸 Enter the raw Damage value exactly as shown in the original screenshot, using the official post-battle Damage statistic required by the approved scoring method. Do not edit the screenshot value to force a calculated result.
>
> ⚙️ 5. ✅ Check class/tier codes against the approved mapping; blank or unsupported values can produce zero-weight results in an archived calculator, so do not assume a blank is harmless.
>
> ✏️ 6. 🛑 Never type a correction into a calculated total. Fix the verified input value or log a formula-change request with expected value and regression test.
>
> 🏆 7. 🔢 Recalculate; inspect the round result, participant dblns, aggregation, and progression output in that order. Save the test inputs and expected/actual results.
>
> **✅ 🧾 Done when:** Every entered value is tied to the correct evidence and participant row, supported class/tier values are used, formulas remain intact, and the result trail is saved.

## 🧮 3.3 — Operate the standalone HTML calculator

> <span style="color:#244c70">⚓ **Quick hint:** Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</span>


The supplied HTML calculator is a local draft/testing tool. It uses local browser storage, has no verified role-based login or server-side synchronization, and does not update Discord. Treat its outputs as provisional until the same inputs and formula behavior pass comparison with the designated workbook.

> ✏️ 1. 🖥️ Open the approved HTML file/version and confirm the page identity before editing.
>
> 👥 2. 📋 Select the correct round tab: Round 1 — Damage, Round 2 — Kills, Round 3 — Race, or Round 4 — Grand YOLO. The reviewed interface labels seven game rows per player; verify this assumption against the approved event configuration before entering active data.
>
> 👥 3. ✅ Work one game row at a time; check player identity, class/code, tier, and the round-specific metric.
>
> 🏆 4. 📊 Check row outputs and round totals, then inspect Tournament Totals and Overview. Summary averages or displays are descriptive only. The participant dblns result is an individual scoring output; recurring bracket advancement follows the official match result.
>
> 👥 5. ✅ Preserve a JSON Export backup before major edits. If importing a JSON backup, first export the current state, import only a matching calculator backup, then verify roster, round tabs, settings, totals, and display mode.
>
> 👥 6. ✅ Reset to 1 is the control-level reset; the described increment/decrement step is 0.1. The full-site reset is destructive: it restores seed roster/results, pool values and settings, clears legacy browser state, and returns the desktop layout. Export first, then verify the reset result.
>
> ✅ 7. 🧾 Print output only as a local review record; printing does not establish official acceptance.
>
> 🎚️ 8. 📖 The detailed meaning and arithmetic effect of any multiplier or control belongs in Appendix K, not in a duplicated explanation here.

🧮 Calculator control reference: identify the selected round, input fields, reset controls, backup/export actions, and results before comparing outputs.

> **✅ 🧾 Done when:** The exact calculator version is identified, backups precede destructive changes, outputs stay within the documented validation boundary, and provisional output is not misrepresented as official.

## 🧮 3.4 — Compare HTML and workbook results

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


> 👥 1. 🔎 Load identical participant rows, round metrics, class/tier values, settings, and defaults into both systems.
>
> 🧯 2. 🧾 Compare the saved baseline first, including round outputs and the default `Totals!G12`/`Totals!H12` example. Check unrounded intermediate values against the validation record.
>
> ⏱️ 3. 🧪 Change one input at a time: Damage, Kills, Race/time, tier, class code, multiplier/control, blank/zero values, added rows, no-entry rounds, reset state, and final aggregation.
>
> 🧮 4. 🧾 Compare unrounded values first; compare displayed rounding separately. Record formula/version, input, expected result, actual result, difference, and pass/fail.
>
> ✏️ 5. 🧾 Do not change input data or introduce ad hoc correction factors to force equality. Any formula change requires an approved change record and a regression run.

🔗 The end-to-end scoring procedure is also summarized in Chapter 7; detailed equation inputs and multiplier semantics are in Appendix K (the scoring-equation reference).

> **✅ 🧾 Done when:** Both systems use matching inputs/settings; unrounded and displayed results are compared separately; each case records expected/actual values, difference, and pass/fail.

## 🎯 3.5 — Apply the current validation boundary

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


The untouched workbook matches the HTML formula harness on the saved baseline and settings-only tests but contains missing dependent formulas that diverge after some data mutations. The repaired copy restores 44 formula cells and matches the limited mutation cases recorded in Appendix O in the available formula engine. Those results do not establish parity under all possible inputs or certify desktop Excel/VBA.

Keep the workbook release gate open until desktop Excel recalculates correctly, macros compile in the target Office version (including the reported Office 2010 issue), the complete regression matrix passes, and the approved file/version is recorded. Appendix O holds the evidence; Appendix K documents the equation; the internal reconciliation register identifies affected cases.

> **✅ 🧾 Done when:** Known formula and environment limitations are stated plainly, and certification remains blocked until required Excel/VBA and regression gates pass.

## 📣 3.6 — Publish official results only after verification

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


> 👥 1. 📸 Confirm that required participant records have readable evidence and match the approved event process (Chapter 2; the approved event rules).
>
> ⚙️ 2. 🔢 Calculate with the designated workbook version and documented settings.
>
> 🧯 3. ✅ Review missing rows, unsupported codes, formula errors, totals, rounding, and tie handling.
>
> ⏱️ 4. 🗂️ Save a dated result snapshot and retain input evidence under the published retention policy.
>
> 🏆 5. 📊 Publish only the approved participant output and progression status; describe the HTML calculator as mathematically equivalent only for the exact formulas and inputs actually tested, never as universally equivalent while the open gates remain.  
> **✅ 🧾 Done when:** The published result matches the designated approved scoring path, evidence and rounding checks are complete, and a dated output snapshot is retained.

<a id="chapter-4-training-room-setup-match-operations-guide"></a>
# ⚙️ Chapter 4 — Training Room Setup & Match Operations Guide

> <span style="color:#244c70">⚓ **Quick hint:** Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</span>


## ⚙️ 4.1 — Before creating the room

> <span style="color:#244c70">⚓ **Quick hint:** Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</span>


> 👥 1. 📋 Open the approved fixture and verify the match/game ID, host, intended participants, map, battle mode, timer, lineup display, allowed roster composition, and spectator permission.
>
> ⚙️ 2. 🔎 Confirm which lineups should be visible for the selected format; use the approved event rules and the matching situation under Appendix B if the rules documents differ.
>
> 👥 3. 📋 Confirm that all participants have the correct client state and can be invited. If the assigned host cannot host, use the fixture's named fallback (as stated in the approved event rules).
>
> **✅ 🧾 Done when:** The host, map/mode, lineup rules, bans, timer, visibility, spectators, and restart procedure are known from approved settings before room creation.

## ✅ 4.2 — Create, configure, and verify

> ⚙️ 1. 📋 Host creates the Training Room and applies the fixture's room settings.
>
> ⚙️ 2. 🛠️ Use a concise room name containing the matchup, match ID, and game number where supported (as stated in the approved event rules).
>
> 🤖 3. 💬 Invite the opponent and only authorized observers (as stated in the approved event rules).
>
> 👥 4. 📋 Verify mode, map, timer, sides/spawns, player slots, roster, ship/class restrictions, lineups, and spectator settings against the fixture (as stated in the approved event rules).
>
> 👥 5. ✅ Both representatives complete their checks; resolve objections before ready-up (as stated in the approved event rules).
>
> ⚙️ 6. 🛠️ Start only after both sides confirm the room matches the published settings and the referee has addressed any active dispute.
>
> **✅ 🧾 Done when:** The live room matches the approved checklist, each team confirms lineup/readiness, and discrepancies are resolved before battle start.

## 🔄 4.3 — Manage a fault or restart

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


> 👥 1. 🛠️ Participant reports a qualifying load/disconnect, incorrect room setting/side/spawn, bugged spawn, or confirmed platform fault promptly to the opponent and official (as stated in the approved event rules).
>
> ⏱️ 2. 🧾 The referee records the request time and game-clock time, verifies evidence, applies the published request cutoff and quota, then grants or denies the restart with a reason (the approved event rules and the approved event-settings record).
>
> ⏱️ 3. 🔁 Keep the restart completion window distinct from attendance and between-game clocks.
>
> 🔄 4. 🛑 Do not change ship/competitive setup during a restart except the narrow reconnect/replacement accommodations in the approved event rules.
>
> 🤖 5. 🧾 Recheck the approved setup, ready both sides, and preserve the decision/result record.
>
> **✅ 🧾 Done when:** The issue meets an authorized restart trigger, the request is within the applicable cutoff/quota, and the reason and decision are recorded.

## 📸 4.4 — Evidence and interface verification

After the match, each participant supplies a readable screenshot meeting the approved event rules; enable and preserve replays for the published retention period, which is at least 48 hours in the detailed rules document. The scorekeeper validates the official record under the approved event rules. Use the optional individual-mechanics drill in the controlled Training Room experiment that holds the ship, build, target, map, range, angle, and exposure time steady while changing one variable at a time to test damage types, aim uptime, saturation, consumable timing, and safe brawling entries without changing official settings. Log actual post-battle Damage and personal frags separately; do not treat fire chance, a potential citadel, or time spent in secondary range as realized damage.

ℹ️ Interface limitation: the PDFs describe rules for Training Rooms and refer to a separate tutorial, but they do not reproduce a complete, current click-by-click tutorial. This chapter therefore defines the procedural checklist; test the exact client version before adding screenshots, button labels, or coordinate-specific steps (the required release gates in Appendix G).  
**✅ 🧾 Done when:** Evidence is readable and linked to the correct match; UI options not verified in the active client are marked unverified.

<a id="chapter-5-individual-game-strategy-guide"></a>
# 🎯 Chapter 5 — Individual Game-Strategy Guide

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


Use this chapter to make the next in-game decision; it is not a tier list or a promise of damage. Official match results determine recurring-format bracket advancement. Participant dblns is a separate scoring output used for awards or seeding only where published rules and settings expressly provide. For tactical procedures, see Chapter 6 and Appendix I; for damage-system procedures, see Chapter 8 and Appendix P. Appendix K defines the scoring calculation, Appendix L supplies public descriptive benchmarks, and Appendix M treats performance claims as testable hypotheses.

## ⏱️ 5.1 — Prepare the ship and identify a useful firing window

> ⚙️ 1. 🔍 Check event legality, the selected ship's actual build, range, ammunition, consumables, armor, concealment, and viable retreat route. The supplied general ship guide focuses on solo Random Battles and may not describe tournament or Clan Battles priorities; event settings and the current client take precedence.
>
> ⚙️ 2. 🎯 Read the minimap, target direction/speed, likely loaded guns, cover, torpedo lanes, and how long the target will remain exposed.
>
> 📣 3. 🎯 Choose repeatable opportunities over a low-probability highlight salvo; the personal objective is realized output under the approved score, not a speculative damage estimate.
>
> **✅ 🧾 Done when:** The player selects a workable position and target window based on range, line of fire, target behavior, and exposure cost.

## 🎯 5.2 — Select a target and ammunition

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


Before firing, compare hit probability, angle, armor, shell travel time, target HP, saturation state, reload window, and exposure cost. Use Appendix I for target-selection prompts and Appendix P for penetration, overpenetration, and saturation mechanics. A broadside cruiser may offer higher-variance citadel potential; an angled battleship may offer steadier direct/fire damage only if the ammunition can interact with its armor. Choose based on the current shot, not a universal AP/HE rule.

🎯 Damage decision workflow: select a realistic shot, observe the result, change the aim point or target, and verify actual damage after battle.

> **✅ 🧾 Done when:** The selected target, ammunition, and aim point fit the target’s aspect/armor and the actual firing opportunity; the next action uses observed results.

## ⏱️ 5.3 — Preserve aim uptime while avoiding unnecessary exposure

During reload, plan the next rudder/speed change, turret alignment, angle, and exit path. Maneuver to disrupt incoming aim without constant unpredictable zigzags that spoil your own lead. Under sustained fire, begin opening distance while there is still room to turn; do not expose a flat broadside simply to dodge one salvo. Use Appendix I for tactical prompts and Appendix P for damage-control, repair, HP, and reload mechanics.

> **✅ 🧾 Done when:** The player balances useful firing time against incoming risk and repositions or disengages when continued exposure has a worse expected trade.

## ⏱️ 5.4 — Apply damage-over-time and manage health

Use fires, flooding, DCP, Repair Party, and Adrenaline Rush according to the actual ship and threat state. Assess active effects, duration, likely follow-up damage, cooldown, repairability, remaining HP, and expected future firing cycles; do not use an inflexible rule such as always saving DCP until multiple fires. Appendix P centralizes detailed mechanics and limits.

> **✅ 🧾 Done when:** Fire/flooding and repair decisions reflect current effects, ship capability, remaining HP, and expected future threat rather than a fixed rule.

## 🎯 5.5 — Adapt the role to a personal damage opportunity

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


⏱️ 🐟 Destroyer: use concealment, detection edges, terrain, gun/consumable cooldowns, and torpedo geometry to create short, survivable damage windows (see Appendix I). Do not chase a low-HP target through multiple loaded opponents solely for a possible finish.

⏱️ 🛟 Cruiser: maintain a kiting/cover path, exploit quality broadside windows, and use radar/hydro only within the ship's actual current range (see Appendix I). Avoid a risky broadside for a speculative citadel.

⏱️ 🛳️ Battleship: align guns while repositioning, favor penetrable broadside windows over the nearest target by habit, and spend remaining HP before the endgame removes the firing opportunity (see Appendix I).

🧯 🛡️ Against a stronger ship: compare armor interactions, arcs, concealment, speed, reload timing, terrain, and exit options; avoid mirroring a larger ship's brawl by default (see Appendix I for tactics and Appendix P for mechanics).

> **✅ 🧾 Done when:** The action fits the ship’s class and the current team situation while preserving a realistic opportunity for useful personal output.

## 🎯 5.6 — Commit to a brawl only when the setup supports it

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


Brawling can layer main guns, automatic secondaries, torpedoes where fitted, armor, and damage-over-time, but the ship's real build and threat geometry determine whether it is viable. Start from a position where you can still contribute, identify an isolated or constrained target, and close only after reviewing incoming crossfire, torpedoes, hydro/radar, HP, DCP, and escape routes. Use Appendix I for tactical prompts and Appendix P for mechanics; follow the controlled-brawling flow below and verify skills, upgrades, ranges, and names in the current client.

Controlled-brawling flow: observe and set up, identify a favorable entry, close at an angle, convert range into damage, then disengage or reset when the trade turns poor.

> **✅ 🧾 Done when:** The target is isolated or constrained, the entry trade and weapon capability are favorable, and a viable exit remains; otherwise the player delays or declines the brawl.

## 📸 5.7 — Review individual performance using evidence

After each battle, record the official post-battle Damage statistic required by the approved scoring method. Count realized damage—not potential or expected future damage. Submit the screenshot through Section 2.3; keep Kills, Damage, Race/time, and other inputs separate under the active workbook specification. For controlled learning, use the Training Room experiment that holds the ship, build, target, map, range, angle, and exposure time steady while changing one variable at a time; compare repeated scenarios and use means and medians where benchmarks permit (Appendix L).

> **✅ 🧾 Done when:** The review uses actual post-battle records and comparable trials, and separates observed performance from assumptions or unverified explanations.

## 🧭 5.8 — Keep claims, mechanics, and event rules separate

The performance statements collected in the performance-claim tests are not presumed true or false merely because a player believes them. Test them against matched personal samples and current public ship data, controlling for ship/tier, mode, map, build, target availability, and sample size. The results are descriptive and do not validate the scoring formula. Event-specific ship legality, maps, and settings remain in the approved event-settings record and the approved rules, not in this coaching section.  
**✅ 🧾 Done when:** The player can distinguish event policy, verified game mechanics, and performance hypotheses, and does not use one category as proof of another.

<a id="chapter-6-competitive-tactics-procedure"></a>
# ⚓ Chapter 6 — Competitive Tactics Procedure

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


Use this chapter as a repeatable decision route for individual output. It is tactical guidance, not an event-rule override or a guarantee of damage; the approved workbook and Event Settings Sheet remain controlling.

## 🧭 6.1 — Set the objective and prepare the ship

> 🧮 1. 🎯 Confirm the active event format, legal ship/build, and the approved scoring objective under Section 1.1 and the approved event rules before choosing a risk or target.
>
> 🎯 2. 🛠️ Check weapon range, shell types, armor scheme, concealment, turret arcs, consumables, reload cycle, and a viable exit route for the ship actually being used.
>
> ⏱️ 3. 🗺️ Read range, target direction/speed, cover, likely enemy reload status, torpedo lanes, and the time a target will remain exposed; favor repeatable firing windows over speculative highlight shots.
>
> **✅ 🧾 Done when:** The objective, ship/build, position, and risk limits are clear before committing to a target or maneuver.

## 🎯 6.2 — Select a target and commit a salvo

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


> ⏱️ 1. 🔭 Estimate realistic hit probability and damage per hit, accounting for target angle, armor, remaining HP, saturation, shell flight time, and the number of salvos likely to fit in the exposure window.
>
> 🏆 2. 💥 Consider a finishing opportunity only when the active scoring definition awards value for a kill; do not abandon a reliable damage opportunity for an unsupported kill bonus.
>
> ⏱️ 3. ⚖️ Compare likely realized output against exposure, incoming crossfire, travel/reposition time, loss of firing lanes, and the chance of being sunk before later salvos.
>
> ✏️ 4. 📝 After the shot, observe the actual result and adjust the aim point, ammunition, or target; do not treat estimated fire/flood ticks as credited damage before they are recorded.
>
> **✅ 🧾 Done when:** A target is chosen for a defensible tactical opportunity, shot value is considered, and observed impact informs the next decision.

## 🛡️ 6.3 — Preserve aim uptime while evading

> ⏱️ 1. ⏱️ Use reload time to plan rudder, speed, angle, turret alignment, and the next firing opportunity; avoid chaotic turns during the actual aiming window.
>
> ⚙️ 2. 🛠️ ↗️ Under sustained fire, begin opening distance while there is room to turn, and preserve an angle that avoids unnecessary broadside exposure.
>
> ⏱️ 3. 🧭 Reposition behind cover or break detection when the expected damage from continuing to fire is outweighed by the risk and lost future firing time.
>
> **✅ 🧾 Done when:** The player maintains useful fire when practical, avoids predictable damage, and breaks contact or repositions when survival and future output require it.

## 🚢 6.4 — Apply the class-specific route

> 🔥 1. 🐟 Destroyer: use concealment edges, terrain, detection, gun reloads, and torpedo geometry to create short, survivable opportunities; do not chase a low-HP target through several ready opponents solely for a finish.
>
> ⏱️ 2. 🛟 Cruiser: preserve a kiting or cover path, exploit good broadside windows, and use radar/hydro only within the ship’s actual current capability; avoid a risky broadside for a low-probability citadel.
>
> ⏱️ 3. 🛳️ Battleship: align the guns while repositioning, favor penetrable high-value targets over the nearest target by habit, and spend useful firing time before the endgame closes the opportunity.
>
> 🎯 4. 📐 Against a stronger hull, compare armor interactions, gun arcs, concealment, speed, reload timing, terrain, and exit options instead of copying the opponent’s close-range plan.
>
> **✅ 🧾 Done when:** The action reflects class capabilities and threat geometry rather than copying an opponent’s preferred engagement.

## 🔥 6.5 — Use controlled aggression for brawling

> 🎯 1. 👀 Set up at a range where the ship can still contribute and observe enemy deployment, island lanes, loaded guns, torpedo threats, and retreat paths.
>
> ⏱️ 2. 🪤 Identify an isolated, constrained, distracted, or retreating target and assess the time required to enter effective main-battery or secondary range.
>
> 🎯 3. ⚓ Commit only when the entry trade is favorable; approach at an appropriate angle, keep useful turret arcs, exploit the ship’s actual secondaries/armor/hydro/torpedoes, and maintain an exit.
>
> 🔄 4. 🚪 Disengage or reset the position when crossfire, consumable state, remaining HP, or lost firing opportunity makes the close-range trade poor. The measure is realized output before exposure ends, not merely entering secondary range.
>
> **✅ 🧾 Done when:** The push begins only when target, entry trade, consumable state, and exit route justify it; the player disengages when the trade deteriorates.

## 🧪 6.6 — Train, record, and improve

> ⚙️ 1. 🧰 In a Training Room, hold the ship/build, target, map/mode, range, target aspect, and exposure interval as constant as possible; change one variable per pair of trials.
>
> 🏆 2. 📊 Record ship/tier/class, ammunition, target angle, game time/exposure, personal damage, personal frags, and approved `dblns` output; compare matched cases rather than single highlights.
>
> 🤖 3. 🧠 Use both mean and median when interpreting public benchmarks, and treat ship-level averages as descriptive context—not proof that scoring weights are correct.

🔗 Full tactical reference: Appendix I contains detailed target choice, evasion, class roles, HUD use, brawling, and practice material.  
**✅ 🧾 Done when:** Matched trials keep relevant conditions stable, change one variable at a time, and record actual outcomes without treating averages as proof of formula correctness.

<a id="chapter-7-scoring-equation-workbook-verification-procedure"></a>
# 🧮 Chapter 7 — Scoring Equation & Workbook Verification Procedure

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


This chapter explains how to use, verify, and release a score result. The scoring-equation and multiplier reference in Appendix K contains the full input definitions, numerical meanings, multiplier effects, and controlled examples.

## 📋 7.1 — Follow the authorized scoring path

> 🧮 1. 📁 Identify the canonical workbook and matching calculator/formula version recorded in the approved event-settings and validation records. The designated file `test27xlsm_detailed_audit_polished_regression.xlsm` is missing; `test27xlsm.xlsm` is historical evidence only.
>
> 👥 2. 🧾 Preserve original evidence record for every participant/game input, including player identity, round, Damage, Kills, Race/time where applicable, ship class, tier, and any other input required by the selected round.
>
> ✏️ 3. 🧮 Enter data only in designated input cells/fields. Do not overwrite formulas, force a total, apply an ad hoc correction factor, or infer a missing input from a displayed average.
>
> 🏆 4. 🔢 Inspect each round output, participant-level `dblns`, aggregation, and individual scoring display in that order. Determine recurring-format bracket advancement from the verified official match outcome and Appendix A, Decision D21.
>
> **✅ 🧾 Done when:** Every input and output follows the documented scoring path, is traceable to evidence, and uses the exact workbook/formula version recorded for the event.

## 🔎 7.2 — Compare HTML and Excel correctly

> 👥 1. 🧬 Load identical participant rows, metrics, settings, defaults, class/tier values, and round selection into the HTML calculator and the workbook.
>
> 🧯 2. 🧪 Compare the saved baseline first, including round totals and the default `Totals!G12`/`Totals!H12` example; check intermediate unrounded values before displayed rounding.
>
> ⏱️ 3. 🔁 Change one input at a time—Damage, Kills, Race/time, class, tier, multiplier/control, blank/zero values, row count, reset state, and aggregation—and record expected/actual results and differences.
>
> ⚙️ 4. ✅ Treat outputs as mathematically identical only for the cases where both paths use the same formulas, inputs, settings, and rounding and the comparison has passed. The current evidence shows the saved baseline/settings-only match, but missing dependent formulas in the untouched workbook cause some mutated cases to diverge; see Appendix O.
>
> **✅ 🧾 Done when:** The parity record separates baseline from dynamic-input cases and marks a case passed only when identical inputs/formulas produce matching unrounded and displayed results.

## 📐 7.3 — Worked display example (baseline only)

For the recorded baseline, `Totals!G12 = 2325.157080536649`. The display calculation is `Totals!H12 = 0.54 × Totals!G12 / 100 = 12.5558482348979`, which rounds to `\$12.56` at two decimal places. This demonstrates the recorded H12 display, not proof that every possible dynamic input currently agrees between the untouched workbook and HTML.

💡 Interpret `Totals!G12` as the total feeding the display calculation and `Totals!H12` as the derived display value shown by this baseline; do not confuse a currency-style estimate with the participant’s underlying `dblns` output or bracket decision.

> **✅ 🧾 Done when:** The recorded baseline reproduces the documented display value and rounding, and is explicitly treated as one example—not proof of universal parity.

## 🔒 7.4 — Decide whether the result can be released

> ⚙️ 1. 🧾 Keep the run record: workbook/calculator version, input dataset, settings, formula identity, expected and observed outputs, rounding, and pass/fail.
>
> 🧮 2. 🛑 Hold certification if any required formula is missing, a result differs, a class/tier code is unsupported, or desktop Excel/VBA has not passed the intended environment checks.
>
> 🧮 3. 🧰 Keep the repaired workbook as a validation artifact until desktop Excel recalculation, macro compilation, and the complete regression matrix establish that it is an approved replacement.
>
> 👥 4. 📣 Publish a participant result only after the approved workbook/version and event settings are identified and the release gates that apply have passed.

🔗 Full equation and multiplier reference: Appendix K contains numeric input definitions, multiplier explanations, examples, and regression cases.  
**✅ 🧾 Done when:** Required formulas, input checks, desktop Excel/VBA checks, regression tests, and approval records pass before any result is certified or published.

<a id="chapter-8-damage-combat-mechanics-procedure"></a>
# 💥 Chapter 8 — Damage & Combat Mechanics Procedure

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


Use this procedure to connect the game’s damage systems to observable individual output. This is the operational summary; detailed mechanics, values, exceptions, and refresh notes remain in Appendix P.

## 🔥 8.1 — Identify the damage mechanism

> ⏱️ 1. 💣 Classify the event as direct shell damage, torpedo damage, fire, flooding, or a combination; distinguish damage already recorded from potential future damage-over-time.
>
> ✏️ 2. 🧱 For shell hits, distinguish a citadel/critical penetration, an ordinary section hit, an over-penetration, and damage affected by saturation; the correct category depends on ship type, armor geometry, section state, and shell behavior.
>
> 🔥 3. 🌊 For fire/flood effects, check which effects are active, their remaining duration, the ship’s current speed/visibility risk, and the expected follow-up exposure before making a consumable decision.
>
> **✅ 🧾 Done when:** The observed result is classified by mechanism and recorded damage is kept separate from potential future damage-over-time.

## 🎯 8.2 — Choose ammunition and aim point

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


> ⏱️ 1. 🔭 Check target aspect, armor thickness/angle, range, ship type, shell travel time, and the intended impact section before selecting AP, HE, or SAP where available.
>
> ⚖️ 2. 🎯 Prefer a high-probability, useful impact over a visually appealing but unlikely citadel attempt; move the aim point when repeated hits produce poor results or the section is saturated.
>
> ⏱️ 3. 🔁 After each salvo, inspect the observed damage and penetration indicators, then adjust ammunition or target selection for the next available firing window.
>
> **✅ 🧾 Done when:** Ammunition and aim point follow target aspect, armor interaction, range, and observed hit feedback; the choice is reviewed after the salvo.

## 🧯 8.3 — Manage damage-over-time, repair, and survival

> 🔥 1. 🔥 Assess fire/flood count and expected duration alongside incoming threats, reload cycles, remaining HP, and the ship’s available Damage Control Party and Repair Party capability.
>
> 🔥 2. 🛠️ Do not apply an absolute rule that a single fire must always be ignored or always extinguished; decide from the actual ship, current effect, expected future damage, and consumable state.
>
> 🔥 3. ❤️ Account for the trade between remaining alive to create more firing cycles and staying exposed to exploit current output; low HP has no value if the next unavoidable salvo ends the opportunity.
>
> **✅ 🧾 Done when:** Consumable use reflects active effects, remaining HP, future exposure, and actual ship capabilities instead of an absolute single-fire rule.

## ⚓ 8.4 — Apply combat mechanics to close-range decisions

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


> 🔥 1. 🛡️ Before a push, check armor scheme, effective angle, secondary range/build, hydro, torpedoes, turret handling, heal/DCP state, incoming crossfire, and the retreat route.
>
> 🧭 2. 🧭 Set up at a workable range, identify a favorable isolated or constrained target, then close only when entry risk is justified; avoid an opening rush into several ready opponents.
>
> ⏱️ 3. 🚪 Leave or reset the engagement when multiple threats can focus the ship, aim/fire uptime falls, the exit is lost, or the next close-range exchange is unlikely to repay the HP spent.
>
> **✅ 🧾 Done when:** The decision accounts for armor/angle, weapon range, consumables, crossfire, and an exit route before committing.

## 🧪 8.5 — Verify mechanics in controlled practice

> ⚙️ 1. 🧰 Fix the ship/build, target, range, aspect, map/mode, and exposure interval as closely as possible.
>
> ⏱️ 2. 🧪 Change one factor at a time: ammunition, aim point, section saturation, DCP timing, maneuver timing, or brawl-entry trigger.
>
> 🧮 3. 📊 Record realized post-battle damage and relevant personal metrics, and keep game-mechanics observations separate from the scoring formula’s approved input/weight rules.

🔗 Full combat-mechanics reference: Appendix P contains detailed mechanics, values, brawling traits/builds, tests, and the evidence-refresh policy.  
**✅ 🧾 Done when:** Trials record the chosen mechanic, controlled conditions, post-battle output, and uncertainty; observations stay separate from the tournament scoring formula.

<a id="appendix-a-decision-register-d01d52"></a>
# Appendix A — Decision register D01–D52

> <span style="color:#244c70">⚓ **Quick hint:** Complete the record at the point of action so the next operator can verify what was decided and why.</span>


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

### D21 — Match-result advancement and tie-breaks

**Decision:** in the detailed recurring format, the verified match result (win/loss/forfeit) determines bracket advancement. Resolve tied standings in this order: (1) head-to-head result, (2) record among the tied teams, (3) a team metric/point differential declared in advance, (4) an extra deciding game when feasible, and (5) an auditable random draw only when expressly authorized in the published rules. The participant dblns output is an individual scoring metric, not the default bracket key. In the Pilot Event, apply only the announced individual Damage awards unless a separate bracket is explicitly published before signup.

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

**Decision:** publish award eligibility, recipients, values, and distribution before play. Keep awards separate from bracket progression, which uses official match results under D21. If the HTML interface calculates awards, record its approved equation/version under D52 and consult I02; do not assume HTML/Excel equivalence. Define completion/misconduct conditions and do not treat game currency as cash unless explicitly approved.

### D51 — Training/support materials

**Decision:** quick-start plus full reference. Provide a short participant checklist and a detailed guide, common glossary, Training Room pre-ready checklist, score-report sample, restart/dispute flow, Discord function map, and FAQ. The step-by-step game-client tutorial must be verified against the current client; a source that merely refers to an external guide does not prove its detailed instructions.

### D52 — Master policy and Event Settings Sheet

Keep stable policy in the master rules; record variable choices in an approved, dated T01 and complete each field or mark it “not used.” R-01 governs exceptions. Use Section 1.1 and Appendix A, Decision D21, for match-result advancement and tie-breaks; use D20 for seeding and D50 for awards. T01 plus RC01–RC02/RG03/RG13–RG17 control workbook and HTML validation.

<a id="appendix-b-situational-examples-s01s31"></a>
# Appendix B — Situational examples S01–S31

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


Use these examples only when the stated circumstances apply. R-01 keeps conflicting options separate until the event settings or an authorized ruling resolves them.

## S01 — Drop-in pilot versus recurring registration

A pilot may accept drop-ins until its published cutoff if space remains. That exception does not replace registration rules for recurring events (D04).

## S02 — Visible pilot lineups versus hidden detailed-format lineups

Use visible lineups only when the pilot settings expressly require them. If the governing documents conflict or the settings are silent, pause and seek a ruling under D44 (D26).

## S03 — Pilot roster-fill method versus recurring-format bot rules

A pilot's bot-fill method does not automatically carry into a recurring series. Apply that event's approved roster and bot limits (D07, D28).

## S04 — Individual Damage awards versus match-result bracket advancement

A raw-Damage lead may qualify for a separate published individual award, but recurring bracket movement follows the verified official match result and the D21 tie-break hierarchy. Correct disputed results under D44.

## S05 — Standard timer versus a format-specific shorter or special-mode game

Do not ready up when the room timer or mode differs from the fixture. Correct the setting and record any resulting impact (D27).

## S06 — Normal no-show period versus a shorter authorized period

Use the grace period published for this event. A shorter period applies only if it was approved and announced before registration or play, not merely because an older guide used it (D34–D36).

## S07 — Separate restart clocks and quotas

Keep attendance waits, restart request cutoffs, restart completion windows, and restart quotas separate. Apply this series' quota and log official-ordered fault restarts correctly (D34–D39).

## S08 — Individual screenshots versus a team-only result form

Each player supplies evidence unless approved event settings explicitly allow one team submission. If the exception is absent or evidence is incomplete, request correction and keep the result provisional (D41–D43).

## S09 — Replay requirement omitted from a quick-start

A short handout does not cancel the replay rule. Report missing evidence, handle disputes under D43, and update the handout to point to the full requirement (D41, D45, D51).

## S10 — Bot-assisted workflow versus manual fallback

If the bot fails, use the published manual fallback before the deadline, preserve the timestamp, and reconcile the entry with system logs when service returns (D16).

## S11 — Optional broadcast versus an authorized observer match

Broadcast approval applies only to the designated match. It does not authorize spectator access elsewhere; apply the event's observer and stream conditions (D32, D48).

## S12 — Ordinary rule update versus emergency mid-event action

Ordinary amendments apply prospectively, not to completed games. An urgent security, platform, or operational exception needs a recorded reason, limited scope, and impartial review (D15, D49).

## S13 — Pilot attendance flexibility versus prize eligibility

Partial attendance earns an award only if that pilot's published conditions allow it. Do not carry pilot eligibility into a recurring season without a separate rule (D50).

## S14 — Fixed map rotation versus a declared pick/ban format

Follow the published map rotation unless this event explicitly adopted pick/ban or random selection, with its order, deadlines, and fallback (D30).

## S15 — Host readiness versus opponent confirmation

The host's setup check is not enough. Both team representatives must verify their lineup and room settings before ready-up (D25, D33).

## S16 — Pilot ranking versus later bracket progression

A pilot's damage ranking does not seed a later bracket unless the next event's published seeding rules expressly say it does (D20–D21, D50).

## S17 — HTML calculator versus Excel workbook discrepancy

If HTML and Excel produce different dblns values for the same inputs, pause publication of the affected individual score or award. This mismatch does not itself change a verified match winner. Preserve the inputs and screenshots, reconcile workbook version, formula, aggregation, and rounding, then verify parity before release (D21, D52, RC02, RG03, RG13–RG17).

## S18 — Race field is described as elapsed time, but the calculation may reward larger values

Selected working policy C01: Round 3 stores positive elapsed seconds and targets 1 / elapsed_seconds. Lower time scores better. The historical formula conflicts with this target; RG13 remains open until the designated workbook and calculator pass lower-time/higher-score and invalid-input tests.

## S19 — HTML class mapping differs from editable workbook entries

Selected policy C02: DD=4, CA=3, BB=2 in both systems. Blank/unsupported classes block scoring; the canonical implementation must derive or validate label and weight as a pair.

## S20 — Class preference controls are visible but do not affect the archived formula

Selected policy C03: retire/hide S10:S12 from participant-facing scoring controls because the historical formulas do not use them.

## S21 — A displayed Doubloon pool versus the sum of calculated participant results

A pool used as a scoring factor does not necessarily guarantee that participant outputs sum to the displayed pool. Confirm the formula's behavior in the authoritative workbook; handle Round 4's separate pool control under C04.

## S22 — A Race field entered as elapsed seconds versus a higher-is-better score

C01 sets the target: positive elapsed seconds converted to 1 / seconds, so lower time scores better. Verify this in the designated workbook and calculator before using Round 3 results.

## S23 — Round 4 pool input displayed but not used by the archived formula

Selected policy C04: retire/hide the Round 4 pool control; the historical formula did not use it. Adding a pool effect later requires a separately approved formula change and full regression tests.

## S24 — Damage-share term affects more than the damage component

The archived expression places the damage-share factor outside the combined per-game terms, so it scales the full expression. Confirm that scope against the approved workbook (Appendix K).

## S25 — Two tier-related controls have different meanings

Rounds 1–3 use tier power as an exponent in a denominator; Round 4 uses tier weight within a component. Do not treat the controls as interchangeable; their meanings belong in Appendix K.

## S26 — Known class code versus blank or unsupported class code

Recognized DD, CA, and BB examples map to numeric weights, but blank, invalid, or extra codes need an explicit rule. Decide the accepted values and test the mapping in both applications (C02).

## S27 — Overview averages versus the authoritative dblns output

Overview averages and inferred class labels are descriptive only. They cannot replace the verified match result for bracket advancement or the validated participant `dblns` output for an individual scoring purpose expressly declared by the rules (D21).

## S28 — Conflicting historical H12 displays

Earlier displays of \$12.49, \$9.87, and \$10.02 were not reproduced against the current saved baseline. The recorded raw H12 is 12.5558482348979, displayed as \$12.56; reproduce that fixture in the designated workbook before treating it as canonical (RC26).

## S29 — Default settings, resets, saved state, and migration

Source inspection found reset and migration handlers, but browser interaction was not verified. Test first use, save/reload, individual resets, whole-site reset, and legacy-state migration before release (RC27).

## S30 — In-game currency and the workbook's dollar estimate

Selected policy C05: the participant-facing dollar estimate is OFF by default. H12 is an internal historical diagnostic only because 0.54 × dblns ÷ 100 has no verified conversion basis; future public display requires a verified basis and separate organizer approval.

## S31 — Archived workbook evidence versus required authoritative workbook and environment

Archived copies match the designated workbook byte-for-byte, but that does not prove Excel/VBA compilation or runtime behavior. Validate the designated file in the target Excel version and keep the release gates open until those tests pass (Appendix O, RG15).

<a id="appendix-c-exclusion-register-x01x07"></a>
# Appendix C — Exclusion register X01–X07

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


> 🎯 Purpose: Screen public materials for details that must not carry over.
>
> 📚 Contents: X01–X07 cover event branding, server/region identifiers, historical restrictions and numbers, event-only mechanics, implementation identifiers, credentials, and unsupported claims.
>
> 🧭 Use: Check before release; remove identifying details without losing reusable procedures.

This is the **single complete exclusion checklist** for public/general versions. Comparative PDFs and older archive files are evidence sources, not automatic policy authorities. Convert a relevant historic variation into a labeled Appendix B situation when it helps explain a conflict; never promote it to a default rule.

Exclude the following:

- **X01 — Event identity:** names/acronyms, logos, branding, promotion, season/iteration labels, historical dates, named people/winners, and sponsor provisions.

- **X02 — Server/region identifiers:** server, region, channel, role, staff or voice-room names; invite/message URLs; account/server IDs; transfer rules; region-only procedures.

- **X03 — Specific game restrictions:** historic maps/ships/bans, tiers/classes/compositions, factions, race/rally mechanics, map/mode sequences, and event gimmicks.

- **X04 — Unapproved historic values:** roster/bot/substitute counts, account/win-rate thresholds, timers, grace/restart limits, prizes, stream delays, ratings, and other unapproved figures.

- **X05 — Event-only systems:** named scoring/rating formulas, contests, brackets, permanent-ban lists, historic sanctions, overlays, and event-specific publication rules.

- **X06 — Implementation secrets:** bot commands/names, webhooks, tokens, private identifiers, credentials, and server-specific deployment details. Rotate any live exposed credential; use D16 for automation design.

- **X07 — Unsupported tutorial claims:** do not imply the PDFs contain current click-by-click Training Room instructions; they reference additional help but omit those steps.

The bot, game-strategy guide, scoring workbook/calculator, and this manual remain separate deliverables. Appendix I provides a focused tactical reference because it supports scoring interpretation and match operations; it does not replace the standalone game-strategy guide.

<a id="appendix-d-operating-templates-and-checklists-t01t07"></a>
# Appendix D — Operating templates and checklists T01–T07

> <span style="color:#244c70">⚓ **Quick hint:** Complete the record at the point of action so the next operator can verify what was decided and why.</span>


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
# Appendix E — Glossary G01–G26

> <span style="color:#244c70">⚓ **Quick hint:** Use the defined term consistently; if two documents differ, follow the explicitly named governing source.</span>


> 🎯 Purpose: Keep recurring tournament terms consistent.
>
> 📚 Contents: G01–G26 define rulings, appeals, records, brackets, teams, evidence, scoring, roles, and related terms.
>
> 🧭 Use: Reuse these definitions in notices, forms, and companion manuals.

- **G01 — Adjudication:** applying a rule to disputed facts.

- **G02 — Appeal:** request for independent review of a ruling.

- **G03 — Battle/game:** one instance of play.

- **G04 — Bracket:** pairing and advancement structure.

- **G05 — Captain/team representative:** designated team contact for administration.

- **G06 — Default win/loss:** result assigned under a published non-compliance rule.

- **G07 — Event Settings Sheet:** dated list of approved variable settings.

- **G08 — Forfeit:** loss or no-credit consequence under the governing rule.

- **G09 — Match/series:** contest between opponents, comprising one or more games.

- **G10 — No-show:** failure to meet the applicable attendance/readiness requirement.

- **G11 — Official result:** result validated and entered by the authorized recordkeeper.

- **G12 — Pilot Event:** expressly designated simplified format.

- **G13 — Replay:** client-created recording used to help verify a game.

- **G14 — Restart/remake:** authorized new attempt following a qualifying fault.

- **G15 — Round/stage:** a defined group of matches or competition phase.

- **G16 — Situational example:** non-default dialogue explaining an alternate case.

- **G17 — Training Room:** custom game-client room for organized matches or scenarios.

- **G18 — Waitlist:** ordered eligible entrants awaiting a place.

- **G19 — AP:** armor-piercing ammunition; effectiveness depends on penetration, impact angle, and fuze behavior.

- **G20 — HE:** high-explosive ammunition; damage depends on penetration, impact location, and possible fire/module effects.

- **G21 — DD / CL-CA / BB:** destroyer / light-or-heavy cruiser / battleship.

- **G22 — DPM:** theoretical damage per minute; actual output also depends on hit chance, armor interaction, saturation, and firing downtime.

- **G23 — Adrenaline Rush (AR):** commander skill that improves reload as ship HP falls; see I06 for the current reference values and risk caveat.

- **G24 — Damage saturation:** reduced damage to a repeatedly damaged non-citadel compartment; see I04.

- **G25 — Full Alternative Battle Interface:** client HUD mode that exposes additional in-battle information; exact fields may vary by client/settings, so verify locally.

- **G26 — `dblns`:** the calculated individual scoring output from the validated scoring system; not the default recurring-format bracket-advancement key; calculation detail belongs in Appendix K.

<a id="appendix-f-sources-and-evidence-register-src-01src-32"></a>
# Appendix F — Sources and evidence register SRC-01–SRC-32

> <span style="color:#244c70">⚓ **Quick hint:** Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</span>


> 🎯 Purpose: Trace claims to the material used and distinguish evidence from policy.
>
> 📚 Contents: SRC-01–SRC-32 identify supplied rules, guides, archives, manuals, software assets, game references, and statistics, with scope notes.
>
> 🧭 Use: Follow reference IDs; inclusion does not make an older rule current.

## F1 — User-supplied sources

- **SRC-01 — Y1: `yolo_event.docx`.** Pilot Event rule document. Used for pilot-specific concepts of simplified attendance/team formation, declared visible lineups, pilot room setup, individual damage placement, screenshots, and pilot-only restart/late-arrival rules. Those values are not defaults for the recurring format.

- **SRC-02 — Y2: `yolo_rules_xmpl.docx`.** Detailed recurring-format rule source. Used as the recurring-format baseline for registration, roster assignment, individual damage/prize distinctions, hidden lineups, room setup, score reporting, replays, no-shows, restart limits, sportsmanship, staff impartiality, and rule publication.

- **SRC-03–SRC-06 — C1–C4: `trainingroom1.pdf` through `trainingroom4.pdf`.** Comparative rule PDFs used to identify procedures and alternatives. Applicable YOLO rules govern conflicts; verify historical quotations against page images because the PDFs are image-based.

- **SRC-07 — C5: `training5.pdf`.** Separate comparative rules PDF used only for independently relevant general procedures; exclude its event-only restrictions and identifiers.

- **SRC-08 — Project archives:** supportFiles.zip and txts.zip. Supporting evidence for later implementation, scoring, and documentation reconciliation; not automatic policy authorities.

## F2 — External sources consulted (accessed 28 October 2026)

- SRC-09 — [<u>Discord Community Guidelines</u>](https://discord.com/guidelines): platform behavior/content rules.

- SRC-10 — [<u>World of Warships Player Support, replay guide</u>](https://wargaming.net/support/en/products/wows/article/15038/?lang=en&redirect_lang=en): replay location, opening, and overwrite risk.

- SRC-11 — [<u>Discord, Using Webhooks and Embeds</u>](https://discord.com/safety/using-webhooks-and-embeds): webhook behavior; keep secrets out of browser code and public files.

- SRC-12 — [<u>World of Warships Wiki, Game Modes</u>](https://wiki.worldofwarships.com/Ship:Game_Modes): configurable Training Room capabilities; verify current UI before publishing instructions.

- SRC-13 — [<u>World of Warships, historical Training Room documentation (Update 0.7.0, January 2018)</u>](https://worldofwarships.eu/en/news/game-updates/dasha-in-training-070/): historical background, not a current UI specification.

- SRC-14 — [<u>Discord Community Server Guidelines</u>](https://support.discord.com/hc/en-us/articles/360035969312-Community-Server-Guidelines): published rules, moderation, and welcoming communities.

- SRC-15 — [<u>Digital.gov, “Short and simple”</u>](https://digital.gov/guides/plain-language/principles/short-simple): remove unnecessary wording and duplicated concepts; keep terminology stable.

- SRC-16 — [<u>U.S. Department of Labor, Plain Language guidance (including Quick Reference)</u>](https://www.dol.gov/general/plainwriting): concise headings, paragraphs, and secondary references.

- SRC-17 — [<u>World of Warships Wiki, “Ship: Armor Penetration”</u>](https://wiki.worldofwarships.com/Ship:Armor_Penetration): AP/HE interaction, penetration, overpenetration, ricochet, and large-caliber AP damage limits against destroyers.

- SRC-18 — [<u>World of Warships Wiki, “Ship: Damage Saturation”</u>](https://wiki.worldofwarships.com/Ship:Damage_Saturation): compartment damage and saturation behavior.

- SRC-19 — [<u>World of Warships Wiki, commander skill list, “Adrenaline Rush”</u>](https://wiki.worldofwarships.com/Ship:List_of_Commander_Skills): current listed surface-ship reload effect; recheck in port because balance may change.

- SRC-20 — [<u>World of Warships Wiki, “Ship: Controls”</u>](https://wiki.worldofwarships.com/Ship:Controls): alternative interface, target/ship information, and control references.

- SRC-21 — [<u>World of Warships Wiki, “Ship: Gunnery and Aiming”</u>](https://wiki.worldofwarships.com/Ship:Gunnery_and_Aiming): shell flight time and leading moving targets.

- SRC-22 — [<u>World of Warships Support, “How Do You Earn and Spend Credits, Doubloons, and XP?”</u>](https://wargaming.net/support/en/products/wows/article/15477/?redirect_lang=en): actual game-economy rewards include several kinds of battle contribution; these are distinct from a custom tournament calculator.

- SRC-23 — [<u>World of Warships Wiki, “Ship: Damage System”</u>](https://wiki.worldofwarships.com/Ship:Damage_System): damage sources and damage-over-time mechanisms.

- SRC-24 — [<u>WoWS Numbers NA, destroyers</u>](https://na.wows-numbers.com/ships/tree/type,destroyer/): ship-level Average Damage and Avg. frags by tier.

- SRC-25 — [<u>WoWS Numbers NA, cruisers</u>](https://na.wows-numbers.com/ships/tree/type,cruiser/): ship-level Average Damage and Avg. frags by tier.

- SRC-26 — [<u>WoWS Numbers NA, battleships</u>](https://na.wows-numbers.com/ships/tree/type,battleship/): used only to identify the single Tier II example, Mikasa; not a tier-wide battleship average.

- SRC-27 — [<u>World of Warships Wiki, “Ship: Fire”</u>](https://wiki.worldofwarships.com/Ship:Fire): current fire causes, duration, fire zones, detection effects, and repair eligibility; live mechanics may change.

- SRC-28 — [<u>World of Warships Wiki, “Ship: Flooding”</u>](https://wiki.worldofwarships.com/Ship:Flooding): flooding causes, active zones, duration, speed reduction, damage and repair eligibility.

- SRC-29 — [<u>World of Warships Wiki, “Ship: Consumables”</u>](https://wiki.worldofwarships.com/Ship:Consumables): Damage Control Party and Repair Party behavior.

- SRC-30 — [<u>World of Warships Wiki, “Ship: Secondary Armament”</u>](https://wiki.worldofwarships.com/Ship:Secondary_Armament): automated secondaries, target designation, current skill/upgrades, and reload/range effects.

## F3 — Consolidated package inputs

- **SRC-31 — `Tournament_Bot_User_Manual_Procedural_v2.1_package(1).zip`:** supplied bot/user manual, Markdown, Word/PDF outputs, README, and five figures; the Markdown informed task coverage without being duplicated wholesale.

- **SRC-32 — `Tournament_Operations_Manual_v2.3_Package.zip` and `Tournament_Operations_Manual_v2.3.md`:** supplied operations baseline. The valid package Markdown was byte-identical to the accessible standalone Markdown.

**Evidence limits:** this is a policy synthesis, not legal advice or software/event certification. The comparative PDFs are image-based; OCR supported discovery only, so inspect page images before quoting historical wording. Verify live game/Discord interfaces before publishing click-by-click instructions.

<a id="appendix-g-release-gates-and-outstanding-work-rg01rg24"></a>
# Appendix G — Release gates and outstanding work RG01–RG24

> <span style="color:#244c70">⚓ **Quick hint:** Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</span>


> 🎯 Purpose: Set the evidence required before release or readiness claims.
>
> 📚 Contents: RG01–RG24 cover policy approval, credentials, score parity, regression, Excel/VBA, OCR/runtime, Discord tests, package hygiene, and publication.
>
> 🧭 Use: Record an owner and dated evidence for each gate; open critical gates block the affected release.

Do not mark this manual or a companion deliverable ready until its applicable gate is closed.

## Priority 0 — security

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


- **RG01 — DOCUMENTATION SCAN PASS / SOURCE SECURITY OPEN:** The generated documentation package passed its scoped secret-pattern scan with zero concrete token/webhook-pattern hits. This does not cover the unavailable RC3 source, nested source assets, historical reader, or live credential state. Obtain and scan the exact RC3 source, remove browser-side secret/posting paths, and have the authorized credential owner revoke/regenerate exposed credentials before any bot/UI/source bundle is distributed. Keep the full gate OPEN until evidence is attached (D16, RG18).

## Priority 1 — policy and evidence

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


- **RG02 — KNOWN SOURCE RULES RECONCILED / EVENT CONFIGURATION OPEN:** Pilot and recurring source baselines are separated. The Event Settings Record explicitly tracks the Pilot special-mode label conflict, recurring Race-event placement, and recurring team/bot composition. Do not publish these choices until verified and approved for the specific event.

- **RG03 — OPEN / BLOCKING:** `test27xlsm_detailed_audit_polished_regression.xlsm` is the designated authority but is unavailable. Prior default/settings-only parity and four mutations apply only to a historical sample and separate formula-repaired copy. Repeat the full matrix on the exact canonical file, then verify in desktop Excel; do not certify live scores meanwhile.

- **RG04 — GUIDE PREPARED / CURRENT-CLIENT TEST OPEN:** The Training Room Host and Referee Guide is prepared. Verify actual installed-client controls, access, lineup visibility, spectator permissions, replay behavior, restart workflow, and screenshots before treating it as tested click-by-click instruction (RG21).

- **RG05 — EVENT SETTINGS RECORD PREPARED / EVENT-SPECIFIC VALUES OPEN:** Known source baselines and conflicts are recorded. The organizer must select the format, resolve the listed ambiguities, enter the actual date/time/time zone, map/stage schedule, ship limits, prize values, channel/contact routes, and approved settings version before signup or announcement (D52).

- **RG06 — PROCEDURE DOCUMENTED / RUNTIME TEST OPEN:** Evidence intake, OCR review, corrections, retention, result confirmation, and a manual Discord fallback are documented in the participant and maintainer guides. Test the approved live workflow, permissions, attachments, correction audit trail, retention, bot failure, and fallback before production use.

## Priority 2 — companion manuals

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


- **RG07 — DRAFT RULESETS PREPARED:** The Pilot and Recurring Tournament rulesets are delivered as v1.1 drafts and aligned with known source baselines. Complete the format-specific unknowns in the Event Settings Record and obtain organizer approval before issue.

- **RG08 — SCORING GUIDE PREPARED / IMPLEMENTATION OPEN:** The v1.1 scoring guide documents equations, selected C01–C06 policies, regression cases, invalid-input handling, and historical limits. The canonical workbook and calculator implementation remain unavailable/unverified; do not certify scores.

- **RG09 — SECURITY GUIDE PREPARED / SOURCE BUNDLE OPEN:** The v1.1 maintainer security/release guide and source-acquisition record are included. The exact RC3 bundle is missing; no sanitized RC3 source is approved or included. Never distribute the archived browser-side webhook reader or a credential-bearing artifact.

- **RG10 — GUIDE PREPARED / TESTED SCREENSHOTS OPEN:** The v1.1 Training Room guide is delivered with setup, ready-up, restart, replay, and closeout checks. Current-client screenshots and actual click-by-click verification remain outstanding.

## Priority 3 — publication

> <span style="color:#244c70">⚓ **Quick hint:** Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</span>


- **RG11 — DOCUMENTATION CROSS-CHECK PASS FOR KNOWN SOURCES / EVENT VALUES OPEN:** Recurring bracket advancement uses verified match outcomes while individual Damage determines declared awards; Pilot drop-in/visible-lineup rules remain separate from recurring registration/hidden-lineup rules. The Event Settings Record tracks unresolved source ambiguities. Repeat this check after event-specific settings are populated.

- **RG12 — DOCUMENT QA PASS / EVENT PUBLICATION OPEN:** Final Word/Markdown/PDF internal navigation and print layout were checked; the final PDF was rendered and inspected. The automated DOCX accessibility audit reports zero findings for the master and eight companion Word files, but this is structural QA, not full WCAG/legal conformance. Actual event fields and authorized sign-off remain blocking under RG05/RG22.

- **RG13 — OPEN / BLOCKING:** Implement C01 in the exact designated workbook and calculator: numeric positive finite elapsed seconds and the metric `1 / seconds` for Round 3. Invalid values block certification. The canonical workbook is unavailable, so formula parity and invalid-input behavior cannot be certified.

- **RG14 — OPEN / BLOCKING:** Verify Round 4 terms, aggregation, zero-total DamageShare, invalid time, class mapping, retired S10:S12, and retired Round-4 F8 behavior in the canonical workbook and approved calculator. Keep legacy cell addresses for audit compatibility.

- **RG15:** OPEN. Run the authoritative source and formula-repaired copy in the target Excel version, including Office 2010 if it remains the intended runtime; compile VBA, recalculate formulas, and run fixed regression cases. The VBA binary was preserved byte-for-byte in the repaired copy, but this does not prove that compilation or runtime behavior succeeds.

- **RG16:** Record current WoWS Numbers ship-level benchmarks and repeatable test scenarios, but do not claim public averages prove a score coefficient; see Appendix L.

- **RG17 — POLICY SPECIFICATION RESOLVED / IMPLEMENTATION OPEN:** C01–C06 are selected governing policies in v3.15. Apply and test inverse-time Round 3 scoring, fixed DD/CA/BB weights, retired S10:S12/F8 controls, suppression of the unverified dollar estimate, and C06 audit/change controls in the exact approved implementation.

- **RG18 — DOCUMENT SCAN PASS / LIVE CREDENTIAL RESPONSE OPEN:** Generated documentation/index/readme/PDF artifacts passed the scoped secret-pattern scan with zero concrete pattern hits. Obtain and scan the exact RC3/source assets, remove browser-side webhook/posting paths, and have the authorized issuer revoke/regenerate any exposed live credential. Attach non-secret evidence; document scan does not prove rotation.

- **RG19 — Archived OCR regression:** archive-source npm test passed 32/32 under Linux Node v24.22.1; the reported-screenshot test failed by 60 damage (expected 87373, extracted 87313); the four-image run timed out at 120 seconds and is inconclusive. The archived package is not the latest RC3 source.

- **RG20 — RC3 TARGET RUNTIME OPEN / NO-GO:** Obtain the exact missing RC3 source and run full Windows Node 24 acceptance, native Tesseract comparison, frozen screenshot fixtures, single/multi-image tests, retries/timeouts, and live Discord smoke tests. Historical v1 tests do not certify RC3.

- **RG21 — CURRENT-CLIENT WALKTHROUGH OPEN:** Complete setup, team composition, mode/map/timer, lineup visibility, observers, replay retention, ready-up, fault/restart, and closeout in the installed client; record build/date/screenshots/tester. The v1.1 guide is a draft, not proof of a successful walkthrough.

- **RG22 — APPROVAL / NO-GO:** C01–C06 are selected policies, not organizer signatures. Fill a dated Event Settings Record, resolve source ambiguities, assign PUB01/PUB02/PUB09, identify the approved scoring build, record real approval/effective times, and obtain authorized sign-off before publication.

- **RG23 — HISTORICAL REPAIRED-COPY EVIDENCE ONLY:** A separate historical validation copy restored per-player total formulas and matched four controlled HTML mutations in the formula engine. Repeat row-by-row in desktop Excel on the exact designated workbook; do not treat the historical copy as accepted.

- **RG24 — HISTORICAL REPAIRED-COPY EVIDENCE ONLY:** A separate copy restored Tourney Totals!H4:H11 and E5:E11. Verify every row and H12 in desktop Excel and HTML on the designated workbook before release; do not promote the historical repaired copy by implication.

<a id="appendix-h-publication-approval-pub01pub09"></a>
# Appendix H — Publication approval PUB01–PUB09

> <span style="color:#244c70">⚓ **Quick hint:** Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</span>


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
# Appendix I — Competitive tactics reference I01–I13

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


These are quick prompts, not a second tactics chapter. Follow Chapters 5–6 for the procedure, Chapter 8 for combat mechanics, and Appendix K for the scoring equation.

## I01 — Governing objective: individual scoring output and match-result progression

Improve the personal inputs the approved equation actually uses. The validated scoring workbook supplies individual scoring outputs for declared purposes; normal recurring bracket advancement follows the official match result and D21 tie-breaks.

## I02 — Score-calculator reference and limits

Treat HTML as a calculator mirror, not the authority. If it differs from Excel, stop bracket movement and follow Chapter 7 and RC02; tactics cannot settle a scoring mismatch.

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
# Appendix J — Reconciliation register RC01–RC33 (status and action)

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


A resolved entry closes only the issue described; it does not certify the software or close unrelated release gates. Related scenarios are in Appendix B.

## RC01 — Match-result advancement authority

**Resolved as working policy:** recurring bracket advancement uses official match results and D21 tie-breaks; individual dblns is used for scoring/awards or declared seeding only. Organizer ratification and canonical workbook implementation remain open.

## RC02 — HTML calculator versus Excel workbook

**Partially verified:** default outputs and tested settings-only changes match within 1e-9. The original workbook diverges after data changes because formulas are missing. A separate copy restores 44 formulas and matches four controlled mutations in the available formula engine. **Next:** test in desktop Excel and complete K11; formula-engine parity is not runtime certification.

## RC03 — Pilot participation versus recurring registration

**Resolved:** pilot drop-in rules and recurring registration are separate. Record the chosen format in T01.

## RC04 — Visible versus hidden lineups

**Resolved by format:** the pilot may use visible lineups; the detailed format expects hidden lineups until organized. State the rule in T01.

## RC05 — Roster fill and bot limits

**Partly resolved:** roster sizes, minimum players, substitutes, and bot use are format-specific. Publish each in T01 before registration.

## RC06 — Performance awards versus progression key

**Resolved:** raw damage/kills count only as the approved equation or a separate award rule defines them. Recurring bracket movement follows the official match result and D21 tie-breaks.

## RC07 — Timers and special modes

**Configurable:** put each fixture's timer and mode in T01/T03; do not reuse historical settings silently.

## RC08 — Attendance, between-game, and restart clocks

**Separated:** publish distinct start points and deadlines for no-show waits, between-game waits, restart requests, and restart completion.

## RC09 — Restart quota versus official fault

**Baseline set; event settings required:** publish team restart limits, series-length exceptions, and treatment of official/platform-fault restarts.

## RC10 — Individual evidence versus coordinated submission

**Resolved to baseline:** each player provides readable post-game evidence. A representative can coordinate submission but cannot replace individual evidence without an approved exception.

## RC11 — Replay requirements omitted from quick-starts

**Resolved in manual:** enable replays and retain them at least 48 hours. Quick-starts must point to D41/D45.

## RC12 — Automation versus manual fallback

**Policy set; implementation open:** test bot failure, manual submission, correction, cancellation, and recovery in the intended environment.

## RC13 — Broadcast scope versus observer permissions

**Separated:** a broadcast does not grant general spectator access. Name permitted roles and matches in event settings.

## RC14 — Ordinary changes versus emergency action

**Working policy:** ordinary changes are prospective; documented emergency exceptions require review. Approve C06 before final publication.

## RC15 — Pilot participation and award eligibility

**Format-specific:** partial pilot attendance carries into no other event automatically. Publish each event's award conditions.

## RC16 — Fixed map rotation versus pick/ban

**Configurable:** choose a map-selection method in T01 and publish order, deadlines, and fallback.

## RC17 — Room host versus mutual verification

**Resolved:** host configures the room; both teams check their own lineup and settings before ready-up (T03).

## RC18 — Pilot ranking and later-stage setup

**Resolved in principle:** no pilot carryover unless the next stage's settings specify it. T01 defines eligible rounds, aggregation, and cutoffs.

## RC19 — Round pool values and total allocation

**Partly verified:** archived Historical Rounds 1–3 use the pool as a factor; their outputs need not sum to the displayed pool. Selected C04 retires/hides the Round 4 pool control because it is not read by the observed legacy formula. Verify implementation against the designated workbook when it is available.

## RC20 — Round 3 Race field semantics and direction

**Historical behavior recorded; selected policy now documented (C01):** increasing Round 3's metric from 70 to 140 raised the archived score from 113.821138 to 129.032258. The selected target instead treats the input as positive elapsed seconds and scores `1 / seconds`, so lower time scores better. The designated workbook is missing; implementation and parity testing remain OPEN.

## RC21 — Round 4 pool control

**Selected policy C04; historical behavior observed:** changing F8 from 500 to 999 did not affect Round 4 or season scores in the historical copy. Retire/hide the control in the next approved UI/workbook; implementation remains OPEN until the designated workbook is received and tested.

## RC22 — Round 4 damage-share scope

**Archived expression verified:** the damage-share factor scales the combined expression, not just the damage term. Compare with the approved workbook before changing it.

## RC23 — Tier-related controls

**Meanings distinguished:** Rounds 1–3 use tier power as a denominator exponent; Round 4 uses tier weight inside a component. Keep the controls separate and test each independently (Appendix K).

## RC24 — Ship-class code coverage

**Selected policy C02; implementation OPEN:** DD=4, CA=3, BB=2. Blank and unsupported labels are invalid and block scoring. The canonical implementation must derive the weight from the label or validate label and numeric weight as a pair.

## RC25 — Overview aggregates versus progression output

**Resolved:** averages and inferred class labels are descriptive; label them so they cannot be mistaken for the participant dblns scoring output or the official match-result advancement decision.

## RC26 — Default state and H12 display

**Baseline reproduced; runtime check open:** the saved state gives G12 = 2,325.157080536649 and raw H12 = 12.5558482348979, displayed as \$12.56. Earlier \$12.49, \$9.87, and \$10.02 displays were not reproduced from this state. Confirm the fixture in desktop Excel; later-row changes expose RC32–RC33.

## RC27 — Defaults, reset behavior, saved settings, and migration

**Code inspected; UI tests open:** test first use, save/reload, individual reset, full-site reset, and legacy-state migration in a browser.

## RC28 — Dollar display versus award value

**Selected policy C05; implementation check OPEN:** the archived display uses `0.54 × dblns ÷ 100`, which does not establish cash or current store value. The default participant-facing release suppresses this display; H12 is an internal historical diagnostic only. Any future public display requires a verified basis, separate organizer approval, and the exact disclaimer from Appendix N.

## RC29 — Workbook and Office compatibility

**Canonical authority identified; file/runtime unavailable:** `test27xlsm_detailed_audit_polished_regression.xlsm` is the designated workbook but is not present in the accessible files. `test27xlsm.xlsm` is historical comparison evidence only and must not replace it. Excel/Office 2010 compilation, recalculation, and full regression remain OPEN (RG15).

## RC30 — Class coefficient mapping between HTML and archived workbook

**Selected policy C02; divergence observed in historical copy:** default weights DD=4, CA=3, BB=2 agree. Excel reads the numeric weight cell; changing only a label can leave the Excel weight unchanged while HTML recalculates it. The approved implementation must derive or validate the pair and pass parity tests.

## RC31 — Visible class-preference controls versus formula inputs

**Selected policy C03; historical behavior observed:** changing S10:S12 from 1 to 8, 9, and 10 did not change results. Retire/hide the controls in a future approved UI/workbook. Do not imply an effect unless a later policy and full regression expressly approve one.

## RC32 — Missing per-player event totals

**Defect confirmed; separate copy repaired:** formulas were missing from Event1-Damage!AE17:AE23, Event2-Kills!AE16:AE23, Event3-Race!AE16:AE23, and Event4-GrandYolo!AS18:AS23. Four controlled mutations then matched HTML outputs, season totals, and H12 within 1e-9. Verify in desktop Excel; the original file remains unchanged.

## RC33 — Missing participant-summary formulas

**Defect confirmed; separate copy repaired:** Tourney Totals!H4:H11 lacked dollar-display formulas and E5:E11 lacked class-label formulas. Verify all participant rows, class mapping, and H12 after desktop recalculation; cached formula-engine values do not certify runtime behavior.

<a id="appendix-k-scoring-equation-inputs-and-multiplier-reference-k01k13"></a>
# Appendix K — Scoring equation, inputs, and multiplier reference K01–K13

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


> 🎯 Purpose: Keep the full Doubloon equation and multiplier explanations in one place.
>
> 📚 Contents: K01–K13 cover score authority, round formulas, inputs, damage/kills/time, class/tier controls, multipliers, aggregation, rounding, examples, and parity tests.
>
> 🧭 Use: Follow Chapter 7 for operations; use this appendix to interpret values and test expected outputs.

**Scope and authority.** This is the only appendix that explains scoring equations, numeric inputs, or multiplier effects. The designated authority is `test27xlsm_detailed_audit_polished_regression.xlsm`; it was not found in the accessible files. `test27xlsm.xlsm` is a historical sample only. The source's default and settings-only results match the HTML formula harness; the source's missing formulas make its dynamic behavior incomplete. A separate formula-repaired copy matches four isolated data-mutation cases within 1e-9, but desktop Excel/VBA runtime validation remains open (RC29/RG15).

## K01 — Score authority and input boundary

The validated workbook provides individual scoring outputs only after the exact file and formulas are verified. Recurring bracket advancement follows official match results and D21 tie-breaks. No public statistic, tactical opinion, or interface display substitutes for that result. HTML behavior remains provisional until RG03/RG13–RG17 close.

## K02 — Rounds 1–3: damage, kills, and Race/time

Archived formula shape (historical evidence only; canonical implementation unverified):

Score = 2 × OverallMultiplier × Pool × Σgames\[ClassWeight × (PlayerMetric ÷ AllPlayersMetricTotal) ÷ Tier^TierPower\]

The target metric is damage for Round 1, kills for Round 2, and `1 / elapsed_seconds` for Round 3; the selected policy requires positive finite elapsed time, so lower time scores better. The sum spans the games included by that sheet. Shares are calculated against the total metric across the included participant-game entries. The formula does **not** guarantee that total allocated scores equal the displayed pool.

## K03 — Round 4: combined score

Archived formula shape (historical evidence only; canonical implementation unverified):

Score = OverallMultiplier ÷ 3 × Σgames\[ClassWeight × DamageShare × (100/Tier × TierWeight + Damage/(Tier × 1,000) × DamageWeight + Kills × 10/Tier × KillsWeight + 5,000/Time × TimeWeight)\]

DamageShare = Player's total Round-4 damage ÷ All players' total Round-4 damage.

The historical HTML and archived workbook place DamageShare outside the sum of the four inner terms, so it scales the complete per-game expression. This is an observed legacy shape only; verify against the designated workbook before certification, and do not treat it as approval of the future formula design.

## K04 — Numerical inputs and their locations

| **Input**             | **Rounds 1–3**                     | **Round 4**                                               | **Interpretation**                                                                   |
|-----------------------|------------------------------------|-----------------------------------------------------------|--------------------------------------------------------------------------------------|
| Overall multiplier    | C10 / setting                      | C10 / setting                                             | Scales the resulting score for that round.                                           |
| Doubloon pool         | F8 / setting                       | Visible control, not read by the observed Round-4 formula | In Rounds 1–3 it scales the result. Selected C04 retires/hides the unused Round-4 control; canonical implementation check remains open. |
| Per-game class weight | Numeric class-weight entry         | Numeric class-weight entry                                | Scales that game’s contribution.                                                     |
| Tier                  | Per-game tier entry                | Per-game tier entry                                       | Appears in the denominator of the relevant terms.                                    |
| Tier power            | G10 exponent                       | Not the same control as Round-4 Tier weight               | Changes how strongly tier affects Rounds 1–3.                                        |
| Damage                | Metric in Round 1                  | A term in Round 4 and part of DamageShare                 | Changes Round-1 share and, in Round 4, both the separate term and the share.         |
| Kills                 | Metric in Round 2                  | A term in Round 4                                         | The Round-2 score uses the all-player kill total; Round 4 uses a separate kill term. |
| Race/time             | Metric in Round 3                  | 5,000 ÷ time term                                         | Legacy formula behavior conflicts with selected C01 target semantics. The target is positive elapsed seconds converted to `1 / seconds`; canonical formula implementation and invalid-input tests remain OPEN.             |
| Tier weight           | Not used as the Round 1–3 exponent | G10 in the 100/Tier term                                  | Scales that Round-4 component only.                                                  |
| Damage weight         | Not used                           | AJ10 in Damage/(Tier × 1,000)                             | Scales that Round-4 component only.                                                  |
| Kills weight          | Not used                           | AJ11 in Kills × 10/Tier                                   | Scales that Round-4 component only.                                                  |
| Time weight           | Not used                           | AJ12 in 5,000/Time                                        | Scales that Round-4 component only.                                                  |
| DamageShare           | Not used separately                | AS15 ÷ AS24                                               | Player’s total Round-4 damage as a fraction of all players’ total.                   |
| Round-4 division      | Not used                           | Whole summed score divided by 3                           | Reduces the summed Round-4 result to one-third.                                      |
| Season total          | Sum across sheets                  | Sum across sheets                                         | Tourney Totals adds the four round results.                                          |
| Dollar display        | Display-only conversion            | Display-only conversion                                   | Archived formula is 0.54 × Doubloons ÷ 100; it does not establish real cash value.   |

## K05 — How a control changes output

The project’s interface requirements specify a default of **1**, step size **0.1**, a reset-to-1 control for each setting, and one whole-site reset. These are requirements, not proof that every supplied version implements them correctly. Test current defaults, legacy-setting migration, saved/reloaded values, and every reset under RC27. The default participant-facing release must not expose the legacy H12 dollar estimate.

When a variable multiplies the entire score, changing it from 1.0 to 1.5 increases the affected score by 50%, all else held constant. A 0.1 step is a 10% change from a starting value of 1.0 only for a directly linear factor; at other starting values, compute the relative change from the actual old and new values. An exponent or a term-specific factor does not affect the whole equation in the same way.

## K06 — Class-weight controls and tiers

Selected policy C02 maps DD = 4, CA = 3, and BB = 2; blank and unsupported class values block scoring rather than silently receiving zero. The canonical implementation must derive or validate class weight and label together. The historical workbook stores per-game numeric class-weight entries; seeded entries agree, but changing the class label alone does not change the weight used by Excel. Selected C02 requires formula-derived weights or strict label/weight-pair validation (RC24, RC30); implementation remains open.

Selected policy C03 retires S10:S12 from participant-facing scoring controls because the historical formula does not use them. Do not assume that changing them changes the result. Likewise, do not treat the Rounds 1–3 tier exponent as interchangeable with the Round-4 Tier weight; their locations and roles differ (RC23).

## K07 — Controlled Rounds 1–3 example

A historical seven-game case gives one participant 20,000 damage per game: 140,000 total personal damage against 3,780,000 damage across all players/games; class coefficient 4; tier 2; pool 500; overall setting 1; tier power 1. Under the archived Round-1 formula:

2 × 1 × 500 × \[4 × (140,000 ÷ 3,780,000) ÷ 2\] = 74.074.

Holding the other terms and the denominator fixed, applying the same class coefficient of 5 to all seven contributions would produce 92.593; increasing the pool from 500 to 600 yields 88.889; changing the overall setting from 1.0 to 1.5 yields 111.111. Raising tier from 2 to 4 with tier power 1 halves the score to 37.037. These are controlled sensitivities, not predictions for a full event rerun: a player’s metric can also change the shared denominator.

## K08 — Controlled Round-4 example

For illustration, suppose seven games each use class coefficient 4, tier 2, damage 20,000, one kill, time 70, all four Round-4 term settings at 1, and the archived personal DamageShare 140,000 ÷ 2,779,000. The archived equation gives approximately **64.148** for the combined result. With this same base and fixed DamageShare, changing one term setting from 1 to 2 changes the total approximately as follows:

| **Setting changed**                        | **Example result** | **Change**                               |
|--------------------------------------------|--------------------|------------------------------------------|
| Overall setting 1 → 1.5                    | 96.222             | +50% overall                             |
| Class coefficient 4 → 5 on all seven games | 80.185             | +25% overall                             |
| Tier weight 1 → 2                          | 87.657             | +23.510                                  |
| Damage weight 1 → 2                        | 68.850             | +4.702                                   |
| Kills weight 1 → 2                         | 66.499             | +2.351                                   |
| Time weight 1 → 2                          | 97.733             | +33.585                                  |
| Tier 2 → 3 with other factors/share fixed  | about 53.96        | lower contribution from tier-based terms |

Increasing the example’s per-game damage from 20,000 to 25,000 also changes DamageShare. If other participants’ damage remains fixed, the example total becomes about **80.4** under the archived equation. This illustrates why a complete recomputation matters: the player’s own contribution and the shared denominator both move.

These examples reveal the relative influence of the current equation’s terms; they do not establish that the current settings are balanced or that they match the missing designated workbook.

## K09 — Aggregates, unrounded values, and dollar display

The historical workbook’s Tourney Totals aggregates the four round sheets into `dblns`. It also displays summary fields such as average damage, tier, kills, and class weight; these are descriptive aggregates, not alternate bracket-advancement outputs. The archived dollar display uses the factor shown in K04; do not represent it as a cash conversion or prize obligation.

## K10 — Saved default baseline and limits

The saved values in the older workbook inside supportFiles.zip are approximately:

| **Component**        | **Saved total (dblns)** |
|----------------------|-------------------------|
| Event 1 — damage     | 666.666667              |
| Event 2 — kills      | 499.166667              |
| Event 3 — Race/time  | 662.601626              |
| Event 4 — combined   | 496.722121              |
| Season total         | 2,325.157081            |
| H12 display estimate | \$12.56                 |

The uploaded/archive-identical workbook’s H12 calculation is 12.5558482348979 and displays as \$12.56; the HTML formula harness returns the same value for the saved seed. The project history also contains other values from different checks; this is the best-supported saved baseline, not proof of dynamic correctness or parity with the designated canonical workbook `test27xlsm_detailed_audit_polished_regression.xlsm`. Later-row input mutations fail because of RC32–RC33.

## K11 — Required score-calculator regression matrix

Test all defaults; zero metric totals; blank/unsupported and allowed classes; tier changes; one-at-a-time setting changes; individual/site resets; legacy migration; changed damage/kill numerators and denominators; lower/higher Round 3 metrics; nonpositive Round 4 time; save/reload; all round totals; season dblns; and H12. Record input cells, exact formulas, unrounded/displayed outputs, and HTML values. The source formula coverage is incomplete; the repaired copy passes the four tested mutations but the full matrix and Excel runtime remain open.

## K12 — Mathematical parity: same inputs, same formulas, same results

**Meaning of “identical.”** The HTML formula harness was derived from the calculator's scoring functions; the workbook uses corresponding spreadsheet expressions. When the same seed, settings, inputs, class weights, tiers, and aggregation are supplied **and all required formulas are present**, the tested paths produce the same unrounded results. This was verified against the formula-repaired validation copy, not by claiming the untouched source file is already complete.

**Default example:** with the saved nine-participant/seven-game seed and default settings, both implementations produce Round 1 666.666666667, Round 2 499.166666667, Round 3 662.601626016, Round 4 496.722121187, and total G12 = 2,325.157080536649. Both produce H12 = 0.54 × G12 ÷ 100 = 12.5558482348979, displayed as \$12.56. In Round 1, one participant's seven 20,000-damage games total 140,000; with a 3,780,000 all-player damage denominator, class coefficient 4, tier 2, pool 500, overall setting 1, and tier power 1, both calculate 2 × 1 × 500 × \[4 × (140,000 ÷ 3,780,000) ÷ 2\] = 74.074074 (see K07).

**Dynamic examples after formula restoration:**

| **Mutation**                           | **Participant dblns** | **Season total** | **H12**      | **HTML/Excel formula-engine result** |
|----------------------------------------|-----------------------|------------------|--------------|--------------------------------------|
| Round 1 damage 40,000 -\> 80,000 (F17) | 83.769633508          | 2,328.647481933  | 12.574696402 | Match within 1e-9                    |
| Round 2 kills 3 -\> 6 (F16)            | 56.537102473          | 2,326.932698911  | 12.565436574 | Match within 1e-9                    |
| Round 3 metric 80 -\> 100 (F16)        | 44.804943994          | 2,325.166501257  | 12.555899107 | Match within 1e-9                    |
| Round 4 damage 22,000 -\> 44,000 (F18) | 50.246816613          | 2,328.141293318  | 12.571962984 | Match within 1e-9                    |

**Important limit:** before the repair, those same four mutations failed because the source workbook did not recalculate row totals in the missing formula ranges (RC32–RC33). The supplied source file remains unchanged; the copy repairs those 44 cells, preserves the VBA binary, and requests full recalculation on open. Therefore it is accurate to say the **tested formula logic is mathematically equivalent**, but not yet accurate to say the original workbook as delivered is fully equivalent for arbitrary edits or that Excel/VBA runtime has passed. Complete K11 and RG15 before release.

## K13 — Dynamic-input parity boundary

The default and settings-only examples are recorded in K12. The critical distinction is whether dependent totals recalculate after an input changes.

When Player 3's first-game Round 1 Damage changed from 40,000 to 80,000, the untouched source workbook produced 84.656085 for that player's output while the HTML produced 83.769634. Missing participant-total formulas left shared denominators stale. After restoring 44 missing formula cells in a separate validation copy, that case and three other isolated damage/kills/Race mutations matched the HTML formula harness within 1e-9 (O09–O10).

**Conclusion:** the HTML and formula-repaired workbook are mathematically equivalent for the tested formula paths. The untouched uploaded workbook is not fully equivalent under arbitrary edits until formula coverage is complete and it passes the regression matrix in desktop Excel. Formula-engine agreement does not prove VBA compilation, browser UI behavior, or Office-version compatibility (RC29/RG15).

<a id="appendix-l-wows-numbers-individual-ship-statistics-benchmarks-l01l05"></a>
# Appendix L — WoWS Numbers individual ship-statistics benchmarks L01–L05

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


> 🎯 Purpose: Provide descriptive ship-statistics context for practice and test design.
>
> 📚 Contents: L01–L05 explain the WoWS Numbers method, tier/type summaries, ship observations, limitations, and repeatable scenarios.
>
> 🧭 Use: Treat averages as context, not proof of scoring weights or individual outcomes.

## L01 — Method and limits

Accessed 28 October 2026. Values below are the WoWS Numbers NA **per-ship “Average Damage” and “Avg. frags” fields** visible on the destroyer/cruiser pages, then summarized as an **unweighted arithmetic mean and median across the ships listed for each tier/type**. They are not weighted by ship battle volume, do not isolate tournament modes, do not control player experience or battle conditions, and are not measures of a particular participant. Win-rate and other team-outcome metrics are deliberately omitted. Source pages: SRC-24–SRC-26.

## L02 — Summary by tier/type

| **Sample**                      | **Ships (n)** | **Mean damage** | **Median damage** | **Damage range** | **Mean Avg. frags** | **Median Avg. frags** |
|---------------------------------|---------------|-----------------|-------------------|------------------|---------------------|-----------------------|
| Tier II destroyers              | 12            | 19,981          | 19,939            | 12,742–35,757    | 1.209               | 1.24                  |
| Tier III destroyers             | 12            | 22,112          | 20,002            | 15,506–36,001    | 1.026               | 0.90                  |
| Tier IV destroyers              | 11            | 26,226          | 23,648            | 19,475–44,026    | 1.067               | 0.97                  |
| Tier II cruisers                | 16            | 22,090          | 19,177            | 13,095–35,026    | 1.204               | 1.01                  |
| Tier II battleship: Mikasa only | 1             | 22,820          | 22,820            | 22,820–22,820    | 1.24                | 1.24                  |

## L03 — Per-ship observations included in the summary

**Tier II destroyers — SRC-24**

| **Ship**         | **Average damage** | **Avg. frags** |
|------------------|--------------------|----------------|
| Smith            | 19,715             | 1.22           |
| Longjiang        | 18,182             | 0.99           |
| Tátra            | 18,944             | 1.06           |
| Storozhevoi      | 12,742             | 0.81           |
| Curtatone        | 35,757             | 2.23           |
| V-25             | 20,163             | 1.26           |
| Enseigne Gabolde | 23,914             | 1.46           |
| Medea            | 21,127             | 1.30           |
| Tachibana Lima   | 20,501             | 1.28           |
| Umikaze          | 15,281             | 0.87           |
| Sampson          | 13,064             | 0.76           |
| Tachibana        | 20,383             | 1.27           |

**Tier III destroyers — SRC-24**

| **Ship**         | **Average damage** | **Avg. frags** |
|------------------|--------------------|----------------|
| Vampire          | 25,637             | 1.20           |
| Campbeltown      | 21,463             | 0.94           |
| Phra Ruang       | 18,498             | 0.75           |
| Romulus          | 18,066             | 0.79           |
| Derzki           | 16,589             | 0.82           |
| Nazario Sauro    | 36,001             | 1.78           |
| G-101            | 18,540             | 0.86           |
| Fusilier         | 22,797             | 1.03           |
| Valkyrie         | 22,917             | 1.10           |
| Wickes           | 15,506             | 0.73           |
| Wakatake         | 16,236             | 0.70           |
| Almirante Villar | 33,089             | 1.61           |

**Tier IV destroyers — SRC-24**

| **Ship**   | **Average damage** | **Avg. frags** |
|------------|--------------------|----------------|
| DD 214     | 44,026             | 1.96           |
| Shenyang   | 27,344             | 1.00           |
| Klas Horn  | 20,985             | 0.78           |
| Izyaslav   | 19,475             | 0.78           |
| Turbine    | 28,742             | 1.17           |
| V-170      | 23,295             | 0.94           |
| Bourrasque | 25,836             | 1.04           |
| Wakeful    | 23,301             | 0.96           |
| Clemson    | 23,119             | 0.97           |
| Serrano    | 28,709             | 1.24           |
| Isokaze    | 23,648             | 0.90           |

**Tier II cruisers — SRC-25**

| **Ship**              | **Average damage** | **Avg. frags** |
|-----------------------|--------------------|----------------|
| Almirante Abreu       | 32,111             | 1.92           |
| Emden                 | 20,350             | 1.09           |
| Almirante Barroso     | 35,026             | 2.07           |
| Méndez Núñez          | 32,335             | 1.82           |
| Novik                 | 14,768             | 0.74           |
| Nino Bixio            | 20,048             | 1.04           |
| Gelderland            | 24,047             | 1.34           |
| Jurien de la Gravière | 16,274             | 0.75           |
| Weymouth              | 16,273             | 0.77           |
| Chikuma               | 14,896             | 0.71           |
| Port Jackson          | 34,138             | 1.97           |
| Diana Lima            | 27,358             | 1.63           |
| Albany                | 17,965             | 0.98           |
| Diana                 | 18,305             | 0.91           |
| Dresden               | 16,445             | 0.89           |
| Chester               | 13,095             | 0.64           |

**Tier II battleship — SRC-26**

| **Ship** | **Average damage** | **Avg. frags** |
|----------|--------------------|----------------|
| Mikasa   | 22,820             | 1.24           |

## L04 — What the observed data can and cannot say

- Within this displayed sample, the mean and median damage for destroyers rise from Tier II through Tier IV, but the mean frags do not rise monotonically. This is a descriptive association, not proof that tier alone causes higher output.

- Tier II destroyers and cruisers have close median damage, while the cruiser mean is higher; a few high-damage cruiser rows move the mean upward. This makes the median useful alongside the mean.

- One Tier II battleship row cannot establish a battleship-class average. Do not compare that one ship against a class-wide mean.

- These observations **do not validate** the calculator’s class or tier settings. Use them to create representative regression cases; deciding formula coefficients requires the authoritative workbook, approved policy, and reproducible test inputs.

## L05 — Suggested individual test scenarios

Use comparable sample groups rather than an average alone:

- Same ship and mode, fixed tier context, varying range/angle to test hit quality and damage per salvo.

- Same ship, similar battle count and player, varied target class and armor angle to test ammo selection.

- Personal damage and personal frags tracked separately, not folded into win-rate or team-result measures.

- Record target tier, own tier, ship/class, damage, frags, time metric, hits where available, and survivability; never infer a causal class coefficient from the public table alone.

<a id="appendix-m-performance-claim-evidence-cards-m01m07"></a>
# Appendix M — Performance-claim evidence cards M01–M07

> <span style="color:#244c70">⚓ **Quick hint:** Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</span>


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

**Testable interpretation:** a tier disadvantage is believed to remove meaningful damage opportunities. **Test:** record personal damage and frags by own tier and opponent tier spread for the same ship where possible; note armor interactions, penetration limits, concealment, range, and survival. The current public summary does not supply a controlled bottom-tier dataset, so this belief is neither established nor disproved by Appendix L.

## M06 — “You have to division to increase your win rate.”

**Testable interpretation:** playing in a division is assumed to change a personal performance statistic. The requested individual-output analysis excludes team-performance records, and the calculator’s inputs must come from its approved formula. Do not add division membership as a scoring factor unless the approved policy and workbook expressly define it.

## M07 — “It's impossible to carry in World of Warships.”

**Testable interpretation:** one player’s influence is considered too small to matter. This manual does not infer team outcomes from an individual ship average. Examine personal damage, frags, shot quality, survival-adjusted firing time, and the exact approved score output; do not confuse a personal metric with a guarantee of a particular battle outcome.

<a id="appendix-n-user-decisions-needed-before-score-sign-off-c01c06"></a>
<a id="appendix-n-resolved-scoring-policies-and-implementation-checks-c01c06"></a>
# Appendix N — Resolved scoring policies and implementation checks C01–C06

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


> 🎯 Purpose: Record the selected working policies for C01–C06 and the tests needed to implement them safely.
>
> 📚 Contents: C01–C06 cover Round 3 Race-field meaning, class mapping, inactive preferences, Round 4 pool control, dollar display, and mid-event changes.
>
> 🧭 Use: The selected outcomes below govern this draft. They require formal organizer ratification before an event is published; formula/UI changes remain subject to release gates.

Decision status for v3.15: C01–C06 are RESOLVED AS SELECTED WORKING POLICY. The option lists below remain only as decision history. These selections do not claim the designated workbook or calculator implements them, and they are not a signed organizer approval.

## N.0 — Source-conflict defaults for format-specific drafts

- **Recurring Race:** Treat the Race competition as a separate side-event, not a numbered weekly match. Under a 12-week template, schedule it one hour before the regular event on weeks 3, 6, 9, and 12. “Big Race” in the weekly map rotation is a map name. Race damage contributes to its declared Race/season total and Race award; it does not change that night’s ordinary match score. The actual calendar and this policy require organizer ratification.
- **Pilot special mode:** Do not announce the special Ocean mode until the host verifies the exact mode label in the installed client. If it cannot be verified, omit the special-mode match only through an explicit organizer-approved schedule change; use only verified Standard Battle settings in the interim.
- **Recurring teams and ships:** Later stages must publish equal total team sizes of 6 or 9 slots, with 2–3 human players per side and bots filling declared remaining slots. The source’s Round 1 “2v6 against bots” wording does not define both sides clearly; Round 1 remains unscheduled until the organizer signs an exact per-side roster. Use an explicit published ship allowlist; an unlisted ship is not approved.

## C01 — What does the Round 3 Race field mean?

- **A.** Preserve the archived calculation and define the input as a higher-is-better Race score, not raw elapsed seconds.

- **B.** Confirm the input is elapsed seconds and approve a formula change so less time produces the intended better result.

- **C.** Keep the current calculation temporarily, but rename and define the field before use.

**Historical nonbinding recommendation (superseded by selected policy C01):** B if source data is truly elapsed seconds.

**SELECTED POLICY C01 — Option B.** Store Round 3 Race input as positive finite elapsed seconds, expressed as a numeric seconds value. Use the per-game metric 1 / elapsed_seconds; lower valid time produces a larger metric and therefore a better normalized Round 3 share. Blank, text, zero, negative, malformed, or non-finite values block certification until corrected. Do not treat a countdown or text time as seconds without an explicit conversion. This Round 3 policy does not replace the separate historical Round 4 term 5,000 / time; that term remains subject to its own formula verification.


## C02 — Which class-weight mapping governs?

- **A.** Use the workbook's per-game numeric entries as the source of truth and make the HTML mirror them.

- **B.** Approve one fixed map between each permitted class code and numeric value.

- **C.** Approve separate mappings by round and record each in T01.

**Historical nonbinding recommendation (superseded by selected policy C02):** follow saved entries only if they remain authoritative; selected policy now requires a fixed, validated mapping.

**SELECTED POLICY C02 — Option B.** Use one shared class mapping in both systems: DD = 4, CA = 3, BB = 2. Blank, unknown, unsupported, or unmapped classes block scoring; never silently assign zero. The implementation must derive the weight from the class label or validate the label and numeric weight as a pair. Any new class requires an approved mapping and regression tests before signup.


## C03 — What should happen to the visible class-preference controls S10:S12?

- **A.** Hide/remove them because archived formulas do not use them.

- **B.** Approve formula changes that make them active, then test the workbook and HTML.

- **C.** Retain them as reference-only controls with a visible note that they do not affect the score (historical recommendation; superseded by selected policy C03 in v3.15).

**SELECTED POLICY C03 — Option A.** Retire S10:S12 from participant-facing scoring controls because the archived formulas do not use them. Preserve historical cell addresses/data for audit and formula-reference compatibility; do not delete or rewrite legacy cells to imply an effect. The approved interface must hide or visibly mark these controls NOT USED, and tests must confirm that changes to legacy values do not affect certified scores.


## C04 — What should happen to the Round 4 pool control?

- **A.** Hide it if it is not part of the approved equation.

- **B.** Keep it visible but clearly label it “reference only; not applied by current archived formula” (historical recommendation; superseded by selected policy C04 in v3.15).

- **C.** Approve a formula revision to apply it, then rerun the full regression matrix.

**SELECTED POLICY C04 — Option A.** Retire the Round 4 pool control F8 from participant-facing Round 4 settings because the archived Round 4 formula does not use it. Preserve historical cell addresses for audit compatibility; hide or mark F8 NOT USED for Round 4, and test that changing it has no Round 4 effect. Do not apply this rule to F8 in Rounds 1–3, where the pool is part of the archived expression. Any future Round 4 pool effect requires a separately approved formula revision and full regression.


## C05 — How should the dollar estimate be presented?

- **A.** Keep it and label it explicitly as an illustrative estimate (historical alternative; NOT selected for the default release).

- **B.** Remove it from participant-facing displays (selected policy C05).

- **C.** Replace it with a verified, organizer-approved conversion basis and cite that basis.

**SELECTED POLICY C05 — Option B.** The default participant-facing release must not display the legacy H12 dollar estimate. The inherited factor 0.54 × dblns / 100 has no verified conversion basis, so the historical $12.56 is a test display only—not cash value, official store price, award valuation, or prize commitment. Keep H12 as an internal historical diagnostic only. If a future release establishes a verified basis and an authorized organizer separately approves a public-facing estimate, the label must read exactly: “Illustrative estimate only—not cash value, official store price/conversion, award valuation, or prize obligation.”


## C06 — What is the change policy after the event starts?

- **A.** Permit changes after start whenever organizers announce them, following the broad historic wording.

- **B.** Freeze ordinary rules after start; allow only safety, security, or platform emergencies.

- **C.** Apply changes prospectively to future games, prohibit retroactive changes, and allow documented emergency exceptions (historical recommendation; selected policy C06 follows this option).

**SELECTED POLICY C06 — Option C.** Ordinary rules and settings freeze when the event begins. An approved change may apply prospectively to future/unplayed games only; it must never retroactively recalculate or change a completed game result. Emergency action is limited to safety, security, or critical platform incidents and may pause, cancel, or restart affected unplayed games. Record the reason, scope, authorizer, decision/effective timestamps and time zone, affected games, notices to both representatives, and independent review where feasible. A factual input correction is not a policy change: retain the original value, proposed and accepted values, evidence, reviewer, reason, and timestamp in an append-only audit trail.


## Required file for validation — not a policy choice

Required file for validation — NOT AVAILABLE: the designated authority is test27xlsm_detailed_audit_polished_regression.xlsm. The accessible test27xlsm.xlsm is historical comparison evidence only. Obtain the exact designated file before final formula checks; do not certify the older sample as its replacement.

<a id="appendix-o-validation-results-release-status-and-completed-work"></a>
# Appendix O — Validation results, release status, and completed work

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


> 🎯 Purpose: Separate completed checks from unverified work.
>
> 📚 Contents: O01–O10 record workbook identity, baseline and settings checks, formula gaps, repaired-copy results, HTML tests, bot/runtime status, security, and release limits.
>
> 🧭 Use: Do not confuse harness agreement with verified desktop Excel, VBA, live Discord, Windows/Node, or full regression.

## O01 — Workbook and calculator comparison

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


**Historical source identity:** the archived `/mnt/data/test27xlsm.xlsm` is 1,139,897 bytes and has SHA-256 `6faca9a1a773ab98ca056bce6e33ae9fad0f2c8b8c440803cd915125c8571446`. It is byte-identical to two historical archive copies and contains a VBA project. This is not the designated canonical workbook; a VBA project’s presence does not prove compile or runtime success.

**Saved baseline:** compared the HTML calculator's formula structure/settings/seed with workbook formulas and outputs through a formula harness and in-memory workbook recalculation. All input values and default class-weight entries in the nine-player/seven-game seed matched. Round totals matched within floating-point tolerance: Event 1 = 666.666667; Event 2 = 499.166667; Event 3 = 662.601626; Event 4 = 496.722121; combined dblns = 2,325.157080536649; H12 = 12.5558482348979, displayed as \$12.56. No workbook file was saved or modified.

**Setting-only test:** varied all four rounds independently: Round 1 pool/overall/tier-power = 725/1.2/1.5; Round 2 = 640/0.8/0.5; Round 3 = 350/1.25/1.7; Round 4 overall/tier/damage/kills/time = 1.4/0.6/2.0/1.5/0.4 (its visible pool was also set to 1,000). All per-player round scores and participant dblns totals matched the HTML formula harness within 1e-9.

**Limit:** artifact-tool formula-engine checks are not desktop Excel/Office runtime tests. The source file's dynamic tests fail due to missing formulas; the repaired copy passes the four controlled mutations but still needs Excel/VBA regression (O10/RC29/RG15).

## O02 — HTML interaction checks

> <span style="color:#244c70">⚓ **Quick hint:** Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</span>


**Performed:** inspected HTML source, control handlers, calculation functions, and default/seed state. **Not performed:** actual browser clicks, save/reload, reset UI, or end-to-end browser network behavior. Headless browser navigation was blocked by ERR_BLOCKED_BY_ADMINISTRATOR; therefore RC27 remains open.

## O03 — Archived bot source test

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


**Performed:** on the older archived package only, using Linux Node v24.22.1, npm test passed **32/32**. The package is discord-image-ocr-bot v1.0.0 and is not the latest RC3 source described by the governing plan1.txt roadmap.

**Failed:** npm run test:reported-screenshot reported expected Damage 87373 versus actual 87313 (difference 60); all other listed required fields matched. No required fields were missing and the ambiguity object was empty, but the exact-field gate failed.

**Inconclusive:** npm run test:four-images did not finish within 120 seconds and timed out while processing the first fixture. Do not treat it as a pass or a code diagnosis.

## O04 — Governing bot roadmap and target runtime

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


plan1.txt is the roadmap authority; its newest RC3 section says targeted implementation is complete in a separate RC3 work copy, focused tests passed, but full Windows Node 24 OCR acceptance has not run on that source. Production status remains NO-GO. The RC3 attached package and its full acceptance evidence were not present in supportFiles.zip; do not substitute the older bundled package's passing unit tests for RC3 release evidence.

## O05 — Credential exposure and safe distribution

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


**Observed:** the archived HTML image-reader contains a browser-side webhook/posting path. **Not verified:** revocation of any live webhook, secure replacement behavior, or final-package secret scan. Apply the procedure in §2.6–§2.7 and keep RG01/RG18 open until an operator records evidence of rotation, source removal, and a clean distribution scan.

## O06 — Scope of verification

> <span style="color:#244c70">⚓ **Quick hint:** Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</span>


- **Passed:** archive inventory; file SHA-256 identity; default/H12 parity; non-default settings-only parity; formula-error scan; old archived bot unit tests 32/32; sanitized-bundle scans; and four dynamic-input mutations on the formula-repaired workbook copy matched HTML exactly in the available formula engine.

- **Failed on untouched source:** four data-input mutation tests due to missing per-player total formulas and missing summary formulas; the old bot's reported-screenshot exact-match test differs by 60 Damage.

- **Confirmed inactive controls:** Round 4 pool F8 and class-preference controls S10:S12 do not affect the current score formulas.

- **Timed out:** four-image OCR pipeline, stopped while processing its first fixture at 120 seconds.

- **Blocked / not run:** actual Excel/Office recalculation; Office 2010 VBA compilation; Windows Node 24 acceptance of the latest RC3 source; native Windows Tesseract comparison; live Discord smoke test; browser UI/reset/reload tests; current-client Training Room walkthrough; actual credential revocation/rotation; organizer sign-off.

## O07 — Release verdict

> <span style="color:#244c70">⚓ **Quick hint:** Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</span>


The compendium remains a procedural working draft and is NOT APPROVED for event publication, score certification, or live deployment. C01–C06 are resolved as selected working policy in v3.15, but organizer ratification and implementation tests remain open. The designated workbook is unavailable; Excel/VBA runtime, the complete K11 matrix, current Windows Node 24 OCR acceptance, native Windows Tesseract comparison, live Discord smoke test, credential rotation, event-specific settings, and PUB01–PUB09 human sign-offs remain open. Do not declare the integrated package fully release-ready until those gates close.

## O08 — Input identity, baseline, and setting-only results

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


- **File identity:** historical `test27xlsm.xlsm` is byte-identical to two archived copies; it is not the designated canonical workbook. The designated `test27xlsm_detailed_audit_polished_regression.xlsm` remains unavailable.

- **Input parity:** all nine seeded participant records across seven games in each of four event sheets matched the HTML seed values; all default numeric class-weight entries matched the DD=4, CA=3, BB=2 mapping.

- **Default outputs:** R1 666.666666667; R2 499.166666667; R3 662.601626016; R4 496.722121187; G12 = 2,325.157080536649; H12 = 12.5558482348979 -\> display \$12.56.

- **Round settings tested:** R1 pool 725, overall 1.2, tier power 1.5; R2 pool 640, overall 0.8, tier power 0.5; R3 pool 350, overall 1.25, tier power 1.7; R4 overall 1.4, tier weight 0.6, damage weight 2.0, kills weight 1.5, time weight 0.4. Event outputs and participant dblns rows matched within 1e-9.

- **No source file was modified.** The tests were in-memory.

## O09 — Data-mutation failures and missing formulas

> <span style="color:#244c70">⚓ **Quick hint:** Historical material provides context only; do not present it as current validation or approval.</span>


Four isolated input changes demonstrated that saved-default parity is insufficient:

| **Test**  | **Input change**                              | **Affected participant output: workbook vs HTML** | **Season total: workbook vs HTML** | **H12: workbook vs HTML** |
|-----------|-----------------------------------------------|---------------------------------------------------|------------------------------------|---------------------------|
| R1 damage | Player 3, first-game damage 40,000 -\> 80,000 | 84.656085 vs 83.769634                            | 2,335.739091 vs 2,328.647482       | 12.612991 vs 12.574696    |
| R2 kills  | Player 2, first-game kills 3 -\> 6            | 57.142857 vs 56.537102                            | 2,332.299938 vs 2,326.932699       | 12.594420 vs 12.565437    |
| R3 Race   | Player 2, first-game metric 80 -\> 100        | 44.909021 vs 44.804944                            | 2,326.705667 vs 2,325.166501       | 12.564211 vs 12.555899    |
| R4 damage | Player 4, first-game damage 22,000 -\> 44,000 | 44.314022 vs 50.246817                            | 2,325.766652 vs 2,328.141293       | 12.559140 vs 12.571963    |

Values are unrounded formula outputs. These are failures in the untouched source workbook: each input change left a missing row total stale. The same mutations match the HTML harness when run against the separate formula-repaired copy (O10).

Formula inspection found these absent formulas:

- Event1-Damage!AE17:AE23

- Event2-Kills!AE16:AE23

- Event3-Race!AE16:AE23

- Event4-GrandYolo!AS18:AS23

- Tourney Totals!H4:H11 (individual dollar display)

- Tourney Totals!E5:E11 (derived class label)

The workbook cells contain saved values, but those values do not recompute from edits when formulas are absent. The total denominators sum these cached per-player values, so later input changes can alter formula numerators without correctly updating the shared denominator.

Additional observed behaviors:

- Changing Round 3's first metric from 70 to 140 raised Player 1's Round 3 score from 113.821138 to 129.032258. If this input is raw elapsed time, the direction is likely contrary to the intended race result; C01 is resolved as selected working policy; implementation remains unverified until canonical parity tests pass.

- Changing Round 4 time from 70 to 140 reduced Player 1's Round 4 score from 64.147775 to 61.748831, because the current formula uses the reciprocal 5/time term.

- Changing Round 4 pool F8 from 500 to 999 did not affect Round 4 or season output.

- Changing S10:S12 did not affect scoring. Changing a class label from DD to CA without changing its numeric weight left the workbook score unchanged, while HTML recalculated using the CA coefficient; updating both fields restored parity.

- The formula error scan found no visible \#REF!, \#DIV/0!, \#VALUE!, \#NAME?, or \#N/A values. This scan does not detect missing formulas.

**Disposition:** RC32–RC33 are repaired in a separate formula-repaired copy but remain source-file defects for audit purposes. The original was not modified; xl/vbaProject.bin is byte-identical in the copy. Run desktop Excel, Office compatibility, and the complete K11 matrix before accepting it for production.

## O10 — Formula-repaired copy: dynamic parity result

> <span style="color:#244c70">⚓ **Quick hint:** Historical material provides context only; do not present it as current validation or approval.</span>


A separate copy, /mnt/data/test27xlsm_formula_repaired_copy.xlsm, restores 44 missing formula cells inferred from adjacent, intact formula rows: AE17:AE23 for Round 1; AE16:AE23 for Rounds 2 and 3; AS18:AS23 for Round 4; H4:H11 for participant display conversions; and E5:E11 for derived class labels. The original test27xlsm.xlsm was not changed. The repaired copy preserves xl/vbaProject.bin byte-for-byte and enables automatic full recalculation on open.

**Controlled data mutations:** after those formulas were restored, the available formula engine produced the same participant score, season total, and H12 as the HTML scoring harness for all four cases: Round 1 damage 40,000 -\> 80,000; Round 2 kills 3 -\> 6; Round 3 metric 80 -\> 100; and Round 4 damage 22,000 -\> 44,000. Each of the 12 reported comparisons per test matched within 1e-9. The detailed outputs are in K12. This establishes the current formula logic's mathematical parity for the default fixture, tested setting variants, and these four data mutations.

**Still open:** no desktop Excel or Office 2010 instance was available to verify recalculation, macro compilation, UI interaction, and saved/reopened behavior. The full K11 matrix—including random cases, zero/blank inputs, all classes/tiers, resets, and Round 3 semantics—has not been completed. The repaired copy is a validation candidate, not a certified production release.

**Inherited validation baseline (operations v2.3):** includes fire/flooding, armor/saturation, consumable and controlled-brawling material; historical `test27xlsm.xlsm`; a separate formula-repaired copy restoring 44 cells while preserving the VBA binary; and baseline plus four input-mutation comparisons against the HTML formula harness. These are historical results only. The designated canonical workbook, desktop Excel/VBA, and full regression matrix remain open (RC02/RC29/RC32–RC33; RG03/RG15/RG23–RG24).

<a id="appendix-p-damage-fires-flooding-and-secondary-brawling-mechanics-p01p11"></a>
# Appendix P — Damage, fires, flooding, and secondary brawling mechanics P01–P11

> <span style="color:#244c70">⚓ **Quick hint:** Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</span>


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
# Appendix Q — Organizer and Technical-Maintainer Instructions

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


Purpose: Appendix Q is the staff-only runbook for preparing, operating, verifying, approving, publishing, and closing an event. Chapters 1–8 remain the main participant-facing instruction path. This appendix coordinates organizer and technical-maintainer actions; it does not replace approved event rules, the event-settings record, or an authorized ruling.

## Q1 — Roles, authority, and change control

> 🧭 1. 📋 Name the event owner, referee or escalation contact, scorekeeper, publication approver, and technical maintainer. Record the assigned roles in the approved event-settings record.
>
> 🗂️ 2. 🧾 Record the exact versions of the rules, settings, workbook, calculator, and deployed bot/build that govern the event. Record the owner, approver, approval time, effective time, and any later change.
>
> ⚖️ 3. 🛑 If approved rules, dated settings, workbook behavior, or official records conflict, pause the affected action and obtain an authorized ruling. Preserve each source; do not combine incompatible instructions.
>
> **✅ 🧾 Done when: every required role has a named owner, the governing versions and effective dates are recorded, and the escalation path is clear.**

## Q2 — Prepare and approve the event

> 📅 1. 🎯 Select the governing format and document model before opening registration. Keep pilot exceptions separate from recurring-event rules.
>
> 🧾 2. 📝 Complete the approved event-settings record. Fill every applicable field or mark it “not used”; assign each setting a value, version, approver, and effective time.
>
> 🧪 3. ✅ Walk through the end-to-end workflow: room setup, lineup verification, screenshot intake, corrections, official record entry, incident/restart logging, score review, and fallback handling.
>
> 🚦 4. 🔒 Review Appendix G for release gates and Appendix H for publication approval. Do not announce the event or release a setting that still requires an approval or has an open blocking gate.
>
> 📣 5. 📋 Publish the approved rules, schedule, time zone, check-in window, required evidence, support routes, dispute contact, and settings version.
>
> **✅ 🧾 Done when: the event owner and approver have signed off on the same dated settings, the workflow has been rehearsed, and participants can find the current rules and contacts.**

## Q3 — Match-day operations and exceptions

> 📣 1. 📋 Confirm the official announcement, schedule, room host, participant identity mapping, escalation contacts, and current settings version before the first match.
>
> ⚙️ 2. 🧾 Verify the Training Room against the fixture: mode, map, timer, sides/spawns, player slots, lineup legality/visibility, and observer permissions. Resolve objections before ready-up.
>
> ⏱️ 3. 🛑 Keep attendance, between-game, request-cutoff, and restart-completion clocks distinct. Apply only the published threshold for the specific situation.
>
> 🚨 4. 🧾 Log faults, restart requests, rulings, disputes, corrections, and timestamps. If a rule or setting is ambiguous, pause the affected match or bracket action and escalate; do not improvise a new command or rule.
>
> 📸 5. 🗂️ Preserve the original screenshots, replay evidence when required, incident record, correction history, and final official record.
>
> **✅ 🧾 Done when: each match used the approved settings, exceptions have a documented ruling, and evidence and final results can be traced to the correct match and participants.**

## Q4 — Workbook and scoring maintenance

> 🧮 1. 📂 Identify the authoritative workbook by exact filename, version, formula set, and approved event-settings record. Keep the untouched baseline separate from test or repaired copies.
>
> 📸 2. 🗂️ Preserve original screenshots, raw entries, participant identity, round, class/tier values, and input provenance. Never alter evidence to force a match with an expected score.
>
> 🧪 3. 📊 Compare Excel and HTML using the same data, settings, inputs, aggregation, and display precision. Inspect round results, participant-level `dblns`, aggregate totals, and the final displayed value.
>
> 🧮 4. 🔍 Keep unrounded outputs in test records and explain display rounding separately. Use Appendix K for the equation and multiplier meanings; use Appendix O for the last recorded validation evidence and limits.
>
> 🛑 5. ✅ Do not certify or publish a score while formulas are missing, outputs disagree, unsupported values appear, or the target desktop Excel/VBA environment has not passed the required tests, including Office 2010 when that is the required runtime.
>
> **✅ 🧾 Done when: the exact governing file is identified, same-input parity is demonstrated, raw evidence is retained, rounding is documented, and all score-release prerequisites are satisfied.**

## Q5 — Discord, bot, and evidence handling

> 🤖 1. 🧪 Verify the exact deployed bot/build fingerprint, runtime, configured channels, approved test account, and required permissions before declaring the workflow ready.
>
> 🔐 2. 🛡️ Keep tokens, webhooks, private configuration, and participant records out of public channels, screenshots, and distributable packages. Limit access to the people who need it.
>
> 📸 3. 🧪 Run an authorized smoke test from screenshot intake through field extraction, one-at-a-time correction, structured record output, logging, and duplicate-post checks.
>
> 🧯 4. 🛠️ Test failure messages, unavailable dependencies, ambiguous OCR, retry/cancel paths, and the documented manual fallback. When OCR is uncertain, verify against the original screenshot; never infer an unreadable value from the desired score.
>
> 🗂️ 5. 🧾 Keep original images, OCR results, participant corrections, accepted data, workbook results, awards, and bracket decisions as separate traceable records.

🛡️ 🔒 Maintainer-only: Do not use the archived score_report_imgToDiscord.html for live participant data; it exposes a browser-side webhook/posting path. Before using any replacement reader, revoke or regenerate the exposed webhook, remove browser-side posting, use an approved secure send path if needed, require explicit participant review before sending, inspect the exact replacement file, and pass the applicable secret-scan and release checks in Appendices G, J, and O.

> **✅ 🧾 Done when: the tested build and permissions are recorded, normal and failure paths work in the target environment, sensitive values remain protected, and every accepted value can be traced to its evidence.**

## Q6 — Publication, archive, and closeout

> 🧮 1. 📋 Reconcile each participant’s accepted evidence and raw inputs with the official workbook result, aggregation, and bracket/award output. Record corrections and authorized rulings.
>
> 🚦 2. ✅ Close the applicable Appendix G release gates and complete the Appendix H publication-approval record. Open blocking gates stop the affected release.
>
> 📣 3. 🔒 Publish only the approved rules/settings version, verified standings, awards, and appeal instructions. Include the effective date and the path for reporting an error.
>
> 🗂️ 4. 🧾 Archive the issued documents, settings, workbook/build identifiers, evidence index, test results, corrections, disputes, approvals, and final results under the approved retention policy.
>
> **✅ 🧾 Done when: published materials match the approved version, all released results are traceable, required approvals are recorded, and the event record is archived.**

## Q7 — Internal reference map

📋 Appendix A holds decision history; Appendix B contains situational examples; Appendix C records exclusions; and Appendix D supplies operating templates and checklists.

🔗 Appendix F records sources and evidence. Appendix G tracks release gates, Appendix H records publication approval, and Appendix J tracks reconciliation and defect status.

🧮 Appendix K explains scoring equations and multipliers; Appendix M tests performance claims; Appendix N records the selected C01–C06 policies and implementation acceptance checks; Appendix O records validation evidence and release status; Appendix P covers damage and combat mechanics.

🧭 Chapters 1–8 remain the main reading path for the tournament rules, participant workflow, match procedures, tactics, scoring, and combat guidance. This appendix coordinates staff actions but does not override approved rules or participant-facing instructions.

> **✅ 🧾 Done when: staff can identify the governing procedure, evidence record, approval gate, and escalation route for the task without treating a reference appendix as authorization to bypass a rule.**

## Q8 — Companion release documents and required hand-off

The following companion documents are included in the v3.15 release-materials package. Their draft labels are intentional; they do not become approved event rules until the dated Event Settings Record and the applicable PUB01–PUB09 approval fields are completed by authorized people.

- 📋 📁 **Event Settings and Publication Approval Record** — one copy per event/stage; records selected format, exact settings, authority/build identity, approvals, effective time, and release disposition.
- 🛡️ 📘 **Pilot Event Ruleset** — participant-facing rules for the attendance-based Pilot, retaining Pilot-only lineup, timing, restart, evidence, and individual Damage-award rules.
- 🏆 📘 **Recurring Tournament Ruleset** — registration, roster/lineup visibility, match outcomes, D21 tie-breaks, restart/forfeit handling, individual awards, replays, and disputes for the recurring format.
- 👥 📋 **Participant Quick Start** — participant identity, original screenshot/evidence, score review, corrections, dispute route, and closeout.
- ⚙️ 🎮 **Training Room Host and Referee Guide** — room preflight, two-side confirmation, clocks, restart decisions, and match closeout. Exact installed-client clicks remain unverified pending a live walkthrough.
- 🧮 ✅ **Scoring Workbook and Validation Guide** — selected C01–C06 policies, input validation, score provenance, and the target regression matrix. It is not certification of the unavailable canonical workbook.
- 🤖 🔐 **Discord Bot Maintainer Security and Release Guide** — source identity, local OCR requirements, credential safety, acceptance testing, and manual fallback. The exact RC3 source package and actual credential-rotation evidence remain unavailable.
- 🚦 🧾 **Release Gate Closure Record** — evidence checklist for each technical, security, event-configuration, accessibility, print-layout, and approval gate.

- 📦 🔐 **Source Bundle Status and Acquisition Record** — Documents that the exact RC3 source bundle is unavailable and sets acquisition, hashing, secret-scan, credential-response, and release-evidence requirements.
- 🚦 📋 **Completion and Open-Gates Report** — Records C01–C06 selections, completed document checks, remaining runtime and human-approval blockers; outgoing hyperlink checks were excluded by instruction.

**Required hand-off:** keep the package at NO-GO until the designated canonical workbook and exact RC3 source are supplied; the applicable target-runtime tests, source/secret scan, credential response, current-client walkthrough, internal-navigation/accessibility/print checks, event settings, and human sign-offs are attached to the record. Do not include an unsanitized source archive in a public release.

> **✅ 🧾 Done when:** Each companion has a named owner and version; event-specific values agree with the signed settings record; participants receive only their rules and quick-start documents; maintainers receive the staff guides; and every required release gate has an evidence link or is clearly recorded as blocking.

