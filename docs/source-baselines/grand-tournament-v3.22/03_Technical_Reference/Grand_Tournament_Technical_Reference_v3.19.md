**Package release:** v3.22 production documentation release. Publication content and filenames retain the v3.19 lineage, with v3.21 policy and formatting updates included.

**Prepared:** 29 October 2026.

**Status:** PRODUCTION DOCUMENTATION RELEASE (v3.22) — accepted under the user-directed release-gate waiver. This status applies to the documentation package; it does not claim that unrun technical tests passed or that any specific event or runtime build is approved.

**Content-control rule:** Substantive policy is preserved from v3.15. Editorial wording, document placement, and navigation may change; no event values, signatures, technical test results, or approvals have been invented. See the source manual retained in the release package for the complete baseline.

# Technical Reference

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
## Start here
This document consolidates scoring, workbook/calculator verification boundaries, technical evidence, reconciliation, and resolved scoring-policy records from the v3.15 source. Policy decisions describe intended behavior; they do not prove that a workbook, HTML calculator, or bot implements it.

**v3.22 documentation-release disposition:** At the user's direction, previously identified workbook, runtime, source-intake, credential-rotation, live-test, event-settings, and organizer-signature gates are waived as prerequisites for publishing this documentation package. These items remain not tested or not supplied; they are not recorded as passed and do not certify a live scoring implementation or authorize a specific event instance.

## Scoring and discrepancy decision path
1. Identify the approved build and event settings.
2. Validate inputs and compare identical formulas, precision, and aggregation rules. Invalid inputs cannot receive certified scores.
3. If outputs differ, retain evidence and hold the affected score for authorized review. Do not publish it until resolved.


**Validation boundary:** a displayed result is not proof of formula correctness. Identify the exact workbook/calculator build, preserve inputs, and compare outputs before making a parity claim.

## Evidence labels
Policy, planned test, completed test, and verified implementation are distinct states. Waived or missing tests are not passes.

**Document map:** Scoring, examples, evidence, reconciliation, C01–C06 policies, and validation records; operations are in the Event Operations Manual.


**Evidence discipline:** historical results, static inspection, and live runtime tests are different evidence classes; label each by what was actually performed.

### Contents
- [🧮 Chapter 3 — Scoring & Workbook Operations Manual](#section-1)
- [🧮 Chapter 7 — Scoring Equation & Workbook Verification Procedure](#section-2)
- [Appendix B — Situational examples S01–S31](#section-3)
- [Appendix E — Glossary G01–G26](#section-4)
- [Appendix F — Sources and evidence register SRC-01–SRC-32](#section-5)
- [Appendix J — Reconciliation register RC01–RC33 (status and action)](#section-6)
- [Appendix K — Scoring equation, inputs, and multiplier reference K01–K13](#section-7)
- [Appendix L — WoWS Numbers individual ship-statistics benchmarks L01–L05](#section-8)
- [Appendix N — Resolved scoring policies and implementation checks C01–C06](#section-9)
- [Appendix O — Validation results, release status, and completed work](#section-10)

---

<a id="section-1"></a>
# 🧮 Chapter 3 — Scoring & Workbook Operations Manual

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
This chapter defines the safe data-entry and validation procedure. The complete equation, numerical inputs, multipliers, default-value semantics, and worked examples live only in Appendix K; reference them instead of restating their mathematics here.

## 🧮 3.1 — Identify and preserve the authoritative workbook

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
> 🧮 1.  Use `test27xlsm_detailed_audit_polished_regression.xlsm` as the designated canonical workbook. It is currently unavailable in the accessible files; `test27xlsm.xlsm` and its repaired copy are historical evidence only and must not be used for live certification.
>
> 🧮 2.  Retain an untouched copy and use a separate working copy for approved repairs or experiments. Do not rename tabs, move cells, overwrite formula cells, or change macros as part of routine data entry.
>
> ⚙️ 3.  Confirm the filename, version, sheet set, input/output cell map, calculation mode, and saved baseline in the approved event-settings record and validation record before entering live results.
>
> 🧮 4.  The separate test27xlsm_formula_repaired_copy.xlsm is a validation artifact, not automatically the approved replacement. It restores 44 formula cells based on neighboring-row patterns; its formula-project bytes were left unchanged, but the repair still needs desktop Excel and regression acceptance.
>
> ⏱️ 5.  Do not assume worksheet names from an archived example match the active file. The archived workbook uses Event1-Damage, Event2-Kills, Event3-Race, Event4-GrandYolo, and Tourney Totals; verify the actual tabs and ranges before use.
>
✅ **Done when:** The designated workbook/version is recorded, an untouched copy is preserved, and the file is marked approved or not yet certified according to release-gate evidence.

## 👥 3.2 — Enter participant and game data

> 📣 1.  Open the round sheet specified by the approved event setup.
>
> 👥 2.  Enter only participant identity supported by the record, class/code, tier, Damage, Kills, and the declared Race/time metric in the intended input cells.
>
> 👥 3.  Tie each observation to the correct participant and game row. Confirm the row count and formula coverage include every active participant/game.
>
> 📸 4.  Enter the raw Damage value exactly as shown in the original screenshot, using the official post-battle Damage statistic required by the approved scoring method. Do not edit the screenshot value to force a calculated result.
>
> ⚙️ 5.  Check class/tier codes against the approved mapping; blank or unsupported values can produce zero-weight results in an archived calculator, so do not assume a blank is harmless.
>
> ✏️ 6.  Never type a correction into a calculated total. Fix the verified input value or log a formula-change request with expected value and regression test.
>
> 🏆 7.  Recalculate; inspect the round result, participant dblns, aggregation, and progression output in that order. Save the test inputs and expected/actual results.
>
✅ **Done when:** Every entered value is tied to the correct evidence and participant row, supported class/tier values are used, formulas remain intact, and the result trail is saved.

## 🧮 3.3 — Operate the standalone HTML calculator

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
The supplied HTML calculator is a local draft/testing tool. It uses local browser storage, has no verified role-based login or server-side synchronization, and does not update Discord. Treat its outputs as provisional until the same inputs and formula behavior pass comparison with the designated workbook.

> ✏️ 1.  Open the approved HTML file/version and confirm the page identity before editing.
>
> 👥 2.  Select the correct round tab: Round 1 — Damage, Round 2 — Kills, Round 3 — Race, or Round 4 — Grand YOLO. The reviewed interface labels seven game rows per player; verify this assumption against the approved event configuration before entering active data.
>
> 👥 3.  Work one game row at a time; check player identity, class/code, tier, and the round-specific metric.
>
> 🏆 4.  Check row outputs, round totals, participant-level `dblns`, aggregation, and the resulting match-outcome calculation in that order. Summary averages and inferred labels are descriptive only. The verified match outcome used for bracket advancement must be calculated from the applicable individual-performance metrics using the approved scoring method and published tie-break rules.
>
> 👥 5.  Preserve a JSON Export backup before major edits. If importing a JSON backup, first export the current state, import only a matching calculator backup, then verify roster, round tabs, settings, totals, and display mode.
>
> 👥 6.  Reset to 1 is the control-level reset; the described increment/decrement step is 0.1. The full-site reset is destructive: it restores seed roster/results, pool values and settings, clears legacy browser state, and returns the desktop layout. Export first, then verify the reset result.
>
> ✅ 7.  Print output only as a local review record; printing does not establish official acceptance.
>
> 🎚️ 8.  The detailed meaning and arithmetic effect of any multiplier or control belongs in Appendix K, not in a duplicated explanation here.

🧮 Calculator control reference: identify the selected round, input fields, reset controls, backup/export actions, and results before comparing outputs.

✅ **Done when:** The exact calculator version is identified, backups precede destructive changes, outputs stay within the documented validation boundary, and provisional output is not misrepresented as official.

## 🧮 3.4 — Compare HTML and workbook results

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
> 👥 1.  Load identical participant rows, round metrics, class/tier values, settings, and defaults into both systems.
>
> 🧯 2.  Compare the saved baseline first, including round outputs and the default `Totals!G12`/`Totals!H12` example. Check unrounded intermediate values against the validation record.
>
> ⏱️ 3.  Change one input at a time: Damage, Kills, Race/time, tier, class code, multiplier/control, blank/zero values, added rows, no-entry rounds, reset state, and final aggregation.
>
> 🧮 4.  Compare unrounded values first; compare displayed rounding separately. Record formula/version, input, expected result, actual result, difference, and pass/fail.
>
> ✏️ 5.  Do not change input data or introduce ad hoc correction factors to force equality. Any formula change requires an approved change record and a regression run.

🔗 The end-to-end scoring procedure is also summarized in Chapter 7; detailed equation inputs and multiplier semantics are in Appendix K (the scoring-equation reference).

✅ **Done when:** Both systems use matching inputs/settings; unrounded and displayed results are compared separately; each case records expected/actual values, difference, and pass/fail.

## 🎯 3.5 — Apply the current validation boundary

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
The untouched workbook matches the HTML formula harness on the saved baseline and settings-only tests but contains missing dependent formulas that diverge after some data mutations. The repaired copy restores 44 formula cells and matches the limited mutation cases recorded in Appendix O in the available formula engine. Those results do not establish parity under all possible inputs or certify desktop Excel/VBA.

Keep the workbook release gate open until desktop Excel recalculates correctly, macros compile in the target Office version (including the reported Office 2010 issue), the complete regression matrix passes, and the approved file/version is recorded. Appendix O holds the evidence; Appendix K documents the equation; the internal reconciliation register identifies affected cases.

✅ **Done when:** Known formula and environment limitations are stated plainly, and certification remains blocked until required Excel/VBA and regression gates pass.

## 📣 3.6 — Publish official results only after verification

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
> 👥 1.  Confirm that required participant records have readable evidence and match the approved event process (Chapter 2 of the Event Operations Manual; the approved event rules).
>
> ⚙️ 2.  Calculate with the designated workbook version and documented settings.
>
> 🧯 3.  Review missing rows, unsupported codes, formula errors, totals, rounding, and tie handling.
>
> ⏱️ 4.  Save a dated result snapshot and retain input evidence under the published retention policy.
>
> 🏆 5.  Publish only the approved participant output and progression status; describe the HTML calculator as mathematically equivalent only for the exact formulas and inputs actually tested, never as universally equivalent while the open gates remain.  
✅ **Done when:** The published result matches the designated approved scoring path, evidence and rounding checks are complete, and a dated output snapshot is retained.

<a id="chapter-4-training-room-setup-match-operations-guide"></a>

⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ ⚓ 
<a id="section-2"></a>
# 🧮 Chapter 7 — Scoring Equation & Workbook Verification Procedure

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
This chapter explains how to use, verify, and release a score result. The scoring-equation and multiplier reference in Appendix K contains the full input definitions, numerical meanings, multiplier effects, and controlled examples.

## 📋 7.1 — Follow the authorized scoring path

> 🧮 1.  Identify the canonical workbook and matching calculator/formula version recorded in the approved event-settings and validation records. The designated file `test27xlsm_detailed_audit_polished_regression.xlsm` is missing; `test27xlsm.xlsm` is historical evidence only.
>
> 👥 2.  Preserve original evidence record for every participant/game input, including player identity, round, Damage, Kills, Race/time where applicable, ship class, tier, and any other input required by the selected round.
>
> ✏️ 3.  Enter data only in designated input cells/fields. Do not overwrite formulas, force a total, apply an ad hoc correction factor, or infer a missing input from a displayed average.
>
> 🏆 4.  Inspect each round output, participant-level `dblns`, aggregation, and match-outcome calculation in that order. Calculate the verified match outcome from accepted individual-performance metrics (including Damage and Kills) using the approved scoring method, aggregation, rounding, and published tie-break rules. Use that outcome for recurring-format bracket advancement under Appendix A, Decision D21 of the Event Operations Manual.
>
✅ **Done when:** Every input and output follows the documented scoring path, is traceable to evidence, and uses the exact workbook/formula version recorded for the event.

## 🔎 7.2 — Compare HTML and Excel correctly

> 👥 1.  Load identical participant rows, metrics, settings, defaults, class/tier values, and round selection into the HTML calculator and the workbook.
>
> 🧯 2.  Compare the saved baseline first, including round totals and the default `Totals!G12`/`Totals!H12` example; check intermediate unrounded values before displayed rounding.
>
> ⏱️ 3.  Change one input at a time—Damage, Kills, Race/time, class, tier, multiplier/control, blank/zero values, row count, reset state, and aggregation—and record expected/actual results and differences.
>
> ⚙️ 4.  Treat outputs as mathematically identical only for the cases where both paths use the same formulas, inputs, settings, and rounding and the comparison has passed. The current evidence shows the saved baseline/settings-only match, but missing dependent formulas in the untouched workbook cause some mutated cases to diverge; see Appendix O.
>
✅ **Done when:** The parity record separates baseline from dynamic-input cases and marks a case passed only when identical inputs/formulas produce matching unrounded and displayed results.

## 📐 7.3 — Worked display example (baseline only)

For the recorded baseline, `Totals!G12 = 2325.157080536649`. The display calculation is `Totals!H12 = 0.54 × Totals!G12 / 100 = 12.5558482348979`, which rounds to `\$12.56` at two decimal places. This demonstrates the recorded H12 display, not proof that every possible dynamic input currently agrees between the untouched workbook and HTML.

💡 Interpret `Totals!G12` as the total feeding the display calculation and `Totals!H12` as the derived display value shown by this baseline; do not confuse a currency-style estimate with the participant’s underlying `dblns` output or bracket decision.

✅ **Done when:** The recorded baseline reproduces the documented display value and rounding, and is explicitly treated as one example—not proof of universal parity.

## 🔒 7.4 — Decide whether the result can be released

> ⚙️ 1.  Keep the run record: workbook/calculator version, input dataset, settings, formula identity, expected and observed outputs, rounding, and pass/fail.
>
> 🧮 2.  Hold certification if any required formula is missing, a result differs, a class/tier code is unsupported, or desktop Excel/VBA has not passed the intended environment checks.
>
> 🧮 3.  Keep the repaired workbook as a validation artifact until desktop Excel recalculation, macro compilation, and the complete regression matrix establish that it is an approved replacement.
>
> 👥 4.  Publish a participant result only after the approved workbook/version and event settings are identified and the release gates that apply have passed.

🔗 Full equation and multiplier reference: Appendix K contains numeric input definitions, multiplier explanations, examples, and regression cases.  
✅ **Done when:** Required formulas, input checks, desktop Excel/VBA checks, regression tests, and approval records pass before any result is certified or published.

<a id="chapter-8-damage-combat-mechanics-procedure"></a>

<a id="section-3"></a>
# Appendix B — Situational examples S01–S31

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</div>
Use these examples only when the stated circumstances apply. R-01 keeps conflicting options separate until the event settings or an authorized ruling resolves them.

## S01 — Drop-in pilot versus recurring registration

A pilot may accept drop-ins until its published cutoff if space remains. That exception does not replace registration rules for recurring events (D04).

## S02 — Visible pilot lineups versus hidden detailed-format lineups

Use visible lineups only when the pilot settings expressly require them. If the governing documents conflict or the settings are silent, pause and seek a ruling under D44 (D26).

## S03 — Pilot roster-fill method versus recurring-format bot rules

A pilot's bot-fill method does not automatically carry into a recurring series. Apply that event's approved roster and bot limits (D07, D28).

## S04 — Individual Damage awards versus performance-based match-outcome advancement

A raw-Damage lead may qualify for a separate published individual award if the event rules say so. Recurring bracket movement follows the verified match outcome, which is calculated from the full published set of individual-performance metrics under the approved scoring method, with the D21 tie-break hierarchy applied where needed; raw Damage alone is not a substitute for that calculation. Correct disputed inputs or outcomes under D44.

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

If HTML and Excel produce different `dblns` values for the same inputs, pause publication of the affected score and any match outcome that depends on it, and hold bracket movement. The mismatch must be reconciled before the outcome can be certified; do not assume that the previously displayed winner remains valid or silently reverse it. Preserve inputs and screenshots, reconcile workbook version, formula, aggregation, and rounding, obtain any required ruling, then verify parity before release (D21, D52, RC02, RG03, RG13–RG17).

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

Overview averages and inferred class labels are descriptive only. The match outcome used for bracket advancement must come from the published calculation over accepted individual-performance metrics and validated outputs, with the D21 rules applied. Neither an overview average nor an inferred class label can replace that calculation; participant-level `dblns` remains a traceable output whose role is defined by the approved formula and rules.

## S28 — Conflicting historical H12 displays

Earlier displays of \$12.49, \$9.87, and \$10.02 were not reproduced against the current saved baseline. The recorded raw H12 is 12.5558482348979, displayed as \$12.56; reproduce that fixture in the designated workbook before treating it as canonical (RC26).

## S29 — Default settings, resets, saved state, and migration

Source inspection found reset and migration handlers, but browser interaction was not verified. Test first use, save/reload, individual resets, whole-site reset, and legacy-state migration before release (RC27).

## S30 — In-game currency and the workbook's dollar estimate

Selected policy C05: the participant-facing dollar estimate is OFF by default. H12 is an internal historical diagnostic only because 0.54 × dblns ÷ 100 has no verified conversion basis; future public display requires a verified basis and separate organizer approval.

## S31 — Archived workbook evidence versus required authoritative workbook and environment

Archived copies match the designated workbook byte-for-byte, but that does not prove Excel/VBA compilation or runtime behavior. Validate the designated file in the target Excel version and keep the release gates open until those tests pass (Appendix O, RG15).

<a id="appendix-c-exclusion-register-x01x07"></a>

<a id="section-4"></a>
# Appendix E — Glossary G01–G26

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the defined term consistently; if two documents differ, follow the explicitly named governing source.</div>
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

- **G26 — `dblns`:** the participant-level calculated performance output from the validated scoring system; its contribution to the match outcome is governed by the approved formula in Appendix K. Bracket advancement follows the verified match outcome calculated from the published applicable metrics, not a participant score in isolation unless the rules expressly specify otherwise.

<a id="appendix-f-sources-and-evidence-register-src-01src-32"></a>

<a id="section-5"></a>
# Appendix F — Sources and evidence register SRC-01–SRC-32

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
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

<a id="section-6"></a>
# Appendix J — Reconciliation register RC01–RC33 (status and action)

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</div>
A resolved entry closes only the issue described; it does not certify the software or close unrelated release gates. Related scenarios are in Appendix B.

## RC01 — Performance-based match-outcome calculation and advancement authority

**Resolved as working policy; approval and implementation checks remain open:** recurring bracket advancement follows the verified match outcome, calculated from individual performance across the applicable published game metrics using the approved scoring method and D21 tie-breaks. Participant-level `dblns` is a traceable calculation output whose role in the outcome is defined by the approved formula; additional award or seeding use still requires explicit publication. Organizer ratification and canonical workbook implementation remain open.

## RC02 — HTML calculator versus Excel workbook

**Partially verified:** default outputs and tested settings-only changes match within 1e-9. The original workbook diverges after data changes because formulas are missing. A separate copy restores 44 formulas and matches four controlled mutations in the available formula engine. **Next:** test in desktop Excel and complete K11; formula-engine parity is not runtime certification.

## RC03 — Pilot participation versus recurring registration

**Resolved:** pilot drop-in rules and recurring registration are separate. Record the chosen format in T01.

## RC04 — Visible versus hidden lineups

**Resolved by format:** the pilot may use visible lineups; the detailed format expects hidden lineups until organized. State the rule in T01.

## RC05 — Roster fill and bot limits

**Partly resolved:** roster sizes, minimum players, substitutes, and bot use are format-specific. Publish each in T01 before registration.

## RC06 — Performance awards versus progression key

**Resolved:** Damage, Kills, time, and other metrics affect scoring only as defined by the approved equation. The match outcome used for recurring bracket movement is calculated across the full published set of applicable individual-performance metrics and the approved aggregation/rounding rules, with D21 tie-breaks applied where needed; raw Damage or Kills alone do not determine it unless the published rule explicitly says so.

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

**Resolved:** averages and inferred class labels are descriptive. Label them so they cannot be mistaken for participant-level outputs or the verified match outcome calculated from the approved performance-based scoring method and used for bracket advancement.

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

<a id="section-7"></a>
# Appendix K — Scoring equation, inputs, and multiplier reference K01–K13

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
> 🎯 Purpose: Keep the full Doubloon equation and multiplier explanations in one place.
>
> 📚 Contents: K01–K13 cover score authority, round formulas, inputs, damage/kills/time, class/tier controls, multipliers, aggregation, rounding, examples, and parity tests.
>
> 🧭 Use: Follow Chapter 7 for operations; use this appendix to interpret values and test expected outputs.

**Scope and authority.** This is the only appendix that explains scoring equations, numeric inputs, or multiplier effects. The designated authority is `test27xlsm_detailed_audit_polished_regression.xlsm`; it was not found in the accessible files. `test27xlsm.xlsm` is a historical sample only. The source's default and settings-only results match the HTML formula harness; the source's missing formulas make its dynamic behavior incomplete. A separate formula-repaired copy matches four isolated data-mutation cases within 1e-9, but desktop Excel/VBA runtime validation remains open (RC29/RG15).

## K01 — Score authority and input boundary

The validated workbook provides certifiable outputs only after the exact file and formulas are verified. Recurring bracket advancement follows the verified match outcome calculated from accepted individual-performance metrics under the approved scoring method, with D21 tie-breaks applied where needed. No raw statistic, tactical opinion, or interface display substitutes for that calculation. HTML behavior remains provisional until RG03/RG13–RG17 close.

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

The historical workbook’s Tourney Totals aggregates the four round sheets into participant-level `dblns`. It also displays summary fields such as average damage, tier, kills, and class weight; these summaries are descriptive and are not substitutes for the approved performance-based match-outcome calculation. The archived dollar display uses the factor shown in K04; do not represent it as a cash conversion or prize obligation.

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

<a id="section-8"></a>
# Appendix L — WoWS Numbers individual ship-statistics benchmarks L01–L05

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
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

<a id="section-9"></a>
# Appendix N — Resolved scoring policies and implementation checks C01–C06

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
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

<a id="section-10"></a>
# Appendix O — Validation results, release status, and completed work

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
> 🎯 Purpose: Separate completed checks from unverified work.
>
> 📚 Contents: O01–O10 record workbook identity, baseline and settings checks, formula gaps, repaired-copy results, HTML tests, bot/runtime status, security, and release limits.
>
> 🧭 Use: Do not confuse harness agreement with verified desktop Excel, VBA, live Discord, Windows/Node, or full regression.

## O01 — Workbook and calculator comparison

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
**Historical source identity:** the archived `/mnt/data/test27xlsm.xlsm` is 1,139,897 bytes and has SHA-256 `6faca9a1a773ab98ca056bce6e33ae9fad0f2c8b8c440803cd915125c8571446`. It is byte-identical to two historical archive copies and contains a VBA project. This is not the designated canonical workbook; a VBA project’s presence does not prove compile or runtime success.

**Saved baseline:** compared the HTML calculator's formula structure/settings/seed with workbook formulas and outputs through a formula harness and in-memory workbook recalculation. All input values and default class-weight entries in the nine-player/seven-game seed matched. Round totals matched within floating-point tolerance: Event 1 = 666.666667; Event 2 = 499.166667; Event 3 = 662.601626; Event 4 = 496.722121; combined dblns = 2,325.157080536649; H12 = 12.5558482348979, displayed as \$12.56. No workbook file was saved or modified.

**Setting-only test:** varied all four rounds independently: Round 1 pool/overall/tier-power = 725/1.2/1.5; Round 2 = 640/0.8/0.5; Round 3 = 350/1.25/1.7; Round 4 overall/tier/damage/kills/time = 1.4/0.6/2.0/1.5/0.4 (its visible pool was also set to 1,000). All per-player round scores and participant dblns totals matched the HTML formula harness within 1e-9.

**Limit:** artifact-tool formula-engine checks are not desktop Excel/Office runtime tests. The source file's dynamic tests fail due to missing formulas; the repaired copy passes the four controlled mutations but still needs Excel/VBA regression (O10/RC29/RG15).

## O02 — HTML interaction checks

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
**Performed:** inspected HTML source, control handlers, calculation functions, and default/seed state. **Not performed:** actual browser clicks, save/reload, reset UI, or end-to-end browser network behavior. Headless browser navigation was blocked by ERR_BLOCKED_BY_ADMINISTRATOR; therefore RC27 remains open.

## O03 — Archived bot source test

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
**Performed:** on the older archived package only, using Linux Node v24.22.1, npm test passed **32/32**. The package is discord-image-ocr-bot v1.0.0 and is not the latest RC3 source described by the governing plan1.txt roadmap.

**Failed:** npm run test:reported-screenshot reported expected Damage 87373 versus actual 87313 (difference 60); all other listed required fields matched. No required fields were missing and the ambiguity object was empty, but the exact-field gate failed.

**Inconclusive:** npm run test:four-images did not finish within 120 seconds and timed out while processing the first fixture. Do not treat it as a pass or a code diagnosis.

## O04 — Governing bot roadmap and target runtime

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
plan1.txt is the roadmap authority; its RC3 source note says targeted implementation was completed in a separate work copy and focused tests passed, but full Windows Node 24 OCR acceptance was not run on that source. The RC3 attached package and full acceptance evidence were not present in supportFiles.zip; older bundled-package test results are not substitutes. This v3.22 documentation package is released under the user-directed waiver; runtime readiness remains unverified.

## O05 — Credential exposure and safe distribution

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
**Observed:** the archived HTML image-reader contains a browser-side webhook/posting path. **Not verified:** revocation of any live webhook, secure replacement behavior, or final-package secret scan. Apply the procedure in §2.6–§2.7 and keep RG01/RG18 open until an operator records evidence of rotation, source removal, and a clean distribution scan.

## O06 — Scope of verification

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
- **Passed:** archive inventory; file SHA-256 identity; default/H12 parity; non-default settings-only parity; formula-error scan; old archived bot unit tests 32/32; sanitized-bundle scans; and four dynamic-input mutations on the formula-repaired workbook copy matched HTML exactly in the available formula engine.

- **Failed on untouched source:** four data-input mutation tests due to missing per-player total formulas and missing summary formulas; the old bot's reported-screenshot exact-match test differs by 60 Damage.

- **Confirmed inactive controls:** Round 4 pool F8 and class-preference controls S10:S12 do not affect the current score formulas.

- **Timed out:** four-image OCR pipeline, stopped while processing its first fixture at 120 seconds.

- **Blocked / not run:** actual Excel/Office recalculation; Office 2010 VBA compilation; Windows Node 24 acceptance of the latest RC3 source; native Windows Tesseract comparison; live Discord smoke test; browser UI/reset/reload tests; current-client Training Room walkthrough; actual credential revocation/rotation; organizer sign-off.

## O07 — Release verdict

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Verify room configuration and both sides’ readiness before starting; record exceptions as they occur.</div>
The v3.22 documentation package is released under the user-directed gate waiver. This release does not certify scoring, workbook/HTML parity, Excel/VBA behavior, Windows Node 24 OCR, native Tesseract, live Discord, credential rotation, or any specific event instance; those checks remain untested or unsupplied. The package is released as documentation and reusable templates, not as proof of runtime readiness.

## O08 — Input identity, baseline, and setting-only results

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
- **File identity:** historical `test27xlsm.xlsm` is byte-identical to two archived copies; it is not the designated canonical workbook. The designated `test27xlsm_detailed_audit_polished_regression.xlsm` remains unavailable.

- **Input parity:** all nine seeded participant records across seven games in each of four event sheets matched the HTML seed values; all default numeric class-weight entries matched the DD=4, CA=3, BB=2 mapping.

- **Default outputs:** R1 666.666666667; R2 499.166666667; R3 662.601626016; R4 496.722121187; G12 = 2,325.157080536649; H12 = 12.5558482348979 -\> display \$12.56.

- **Round settings tested:** R1 pool 725, overall 1.2, tier power 1.5; R2 pool 640, overall 0.8, tier power 0.5; R3 pool 350, overall 1.25, tier power 1.7; R4 overall 1.4, tier weight 0.6, damage weight 2.0, kills weight 1.5, time weight 0.4. Event outputs and participant dblns rows matched within 1e-9.

- **No source file was modified.** The tests were in-memory.

## O09 — Data-mutation failures and missing formulas

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
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

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
A separate copy, /mnt/data/test27xlsm_formula_repaired_copy.xlsm, restores 44 missing formula cells inferred from adjacent, intact formula rows: AE17:AE23 for Round 1; AE16:AE23 for Rounds 2 and 3; AS18:AS23 for Round 4; H4:H11 for participant display conversions; and E5:E11 for derived class labels. The original test27xlsm.xlsm was not changed. The repaired copy preserves xl/vbaProject.bin byte-for-byte and enables automatic full recalculation on open.

**Controlled data mutations:** after those formulas were restored, the available formula engine produced the same participant score, season total, and H12 as the HTML scoring harness for all four cases: Round 1 damage 40,000 -\> 80,000; Round 2 kills 3 -\> 6; Round 3 metric 80 -\> 100; and Round 4 damage 22,000 -\> 44,000. Each of the 12 reported comparisons per test matched within 1e-9. The detailed outputs are in K12. This establishes the current formula logic's mathematical parity for the default fixture, tested setting variants, and these four data mutations.

**Still open:** no desktop Excel or Office 2010 instance was available to verify recalculation, macro compilation, UI interaction, and saved/reopened behavior. The full K11 matrix—including random cases, zero/blank inputs, all classes/tiers, resets, and Round 3 semantics—has not been completed. The repaired copy is a validation candidate, not a certified production release.

**Inherited validation baseline (operations v2.3):** includes fire/flooding, armor/saturation, consumable and controlled-brawling material; historical `test27xlsm.xlsm`; a separate formula-repaired copy restoring 44 cells while preserving the VBA binary; and baseline plus four input-mutation comparisons against the HTML formula harness. These are historical results only. The designated canonical workbook, desktop Excel/VBA, and full regression matrix remain open (RC02/RC29/RC32–RC33; RG03/RG15/RG23–RG24).

<a id="appendix-p-damage-fires-flooding-and-secondary-brawling-mechanics-p01p11"></a>

---

**Source baseline:** Grand_Tournament_Instruction_Set_v3.15_Policy_Resolved. This role-based publication reorganizes source material; consult the included v3.15 source baseline for audit traceability.
