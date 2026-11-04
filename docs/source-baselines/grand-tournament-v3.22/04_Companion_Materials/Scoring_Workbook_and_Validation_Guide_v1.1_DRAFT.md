# Scoring Workbook and Calculator Validation Guide

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
**Version:** v1.1 (released within the v3.22 documentation package; legacy filename retained)  
**Audience:** Scorekeepers, workbook maintainer and calculator validator  
**Status:** PRODUCTION DOCUMENTATION RELEASE (v3.22) — published under the user-directed release-gate waiver. Technical behavior not tested remains unverified; event-specific templates must be completed before use as a particular event notice or authorization.

Defines how to accept individual performance inputs, calculate the match outcome under the published scoring method, interpret participant-level `dblns` outputs, and produce repeatable validation evidence. It is a procedure and target specification, not proof that the unavailable canonical workbook implements it.

## 1. Authority and safety boundary

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
> **Documentation release disposition — RELEASED UNDER USER-DIRECTED GATE WAIVER.** The designated workbook test27xlsm_detailed_audit_polished_regression.xlsm was not available in the accessible files. The accessible test27xlsm.xlsm and its formula-repaired copy are historical evidence only. Formula parity and desktop Excel behavior remain unverified; this guide is a procedural reference, not a score certification.

Never overwrite the source evidence to make an output match. Keep original workbook, test copy, raw input fixture, accepted output, and formula-repair experiments separate.

## 2. Approved purpose of outputs

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
| Record | Meaning | Must not be confused with |
| --- | --- | --- |
| Match outcome | Verified outcome for a specific recurring match, calculated from individual performance across the applicable published metrics (including Damage and Kills) under the approved scoring method; published forfeit/void rules apply where performance scoring does not. | A single raw Damage/Kills value, overview average, or unverified calculator display. |
| Individual `dblns` | A participant-level calculated performance output from the validated scoring system. Its contribution to the match outcome is governed by the approved formula; preserve it for audit, and use it for an additional award or seeding purpose only when the format settings expressly authorize that use. | A standalone replacement for the full match-outcome calculation, unless the published formula expressly specifies it. |
| Overview averages | Descriptive aggregate fields. | A substitute for the approved performance-based match-outcome calculation, a prize guarantee, or an official result. |
| H12 historical diagnostic | Default OFF in participant-facing release; archived factor 0.54 × dblns / 100 is not a verified conversion. | Cash, official store price, prize valuation or obligation. |

## 3. Selected scoring policies

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</div>
C01 — Round 3 Race: store positive finite elapsed seconds as a numeric seconds value; the target metric is 1 / elapsed_seconds, so lower elapsed time creates a larger normalized Round-3 share. Reject blank, text, zero, negative, malformed, or non-finite values. Because Round 3 uses normalized shares, a constant scale factor applied uniformly to every metric would cancel, but the target formula specification remains 1 / seconds. Do not confuse this with Round 4’s separate historical 5,000 / time term.

C02 — Class mapping: use DD = 4, CA = 3, BB = 2 in both implementations. Unknown/blank classes are invalid—not weight zero. The implementation must derive the coefficient from the class code or enforce paired label/weight validation.

C03 — S10:S12 class-preference controls: retire/hide from participant-facing scoring; preserve historical cell addresses and data for audit compatibility. Do not delete or rewrite old sample cells to simulate an effect; test that legacy values do not affect certified scores.

C04 — Round 4 pool: retire/hide F8 from participant-facing Round-4 settings because the historical Round-4 formula does not reference it; preserve the cell for audit compatibility. This does not retire the pool control in Rounds 1–3. Test that changing Round-4 F8 has no Round-4 effect.

C05 — Dollar estimate: OFF by default in participant-facing views. Keep H12 only as an internal historical diagnostic because 0.54 × dblns / 100 has no verified conversion basis. Any later public display requires a verified basis, separate organizer approval, and the exact label: “Illustrative estimate only—not cash value, official store price/conversion, award valuation, or prize obligation.”

C06 — After event start: ordinary rules/settings freeze; changes apply only prospectively to future/unplayed games, never retroactively to completed match results. Safety/security/critical platform emergencies may pause, cancel, or restart affected unplayed games and require reason, scope, authorizer, decision/effective timestamps and time zone, affected games, notice to both representatives, and independent review where feasible. Input corrections are separately audited and preserve original and accepted values.

## 4. Archived equation shape (reference only)

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the verified match outcome for bracket advancement. Calculate that outcome from individual performance across the published game metrics (such as Damage and Kills) using the approved scoring method and tie-break rules.</div>
Rounds 1–3 archived shape: Score = 2 × OverallMultiplier × Pool × Σgames[ClassWeight × (PlayerMetric ÷ AllPlayersMetricTotal) ÷ Tier^TierPower]. Target PlayerMetric: Damage for Round 1; Kills for Round 2; 1 / elapsed_seconds for Round 3. The formula shape is not proof of canonical implementation or a guarantee that weighted totals sum to the displayed pool.

Round 4 historical shape: Score = OverallMultiplier ÷ 3 × Σgames[ClassWeight × DamageShare × (100/Tier × TierWeight + Damage/(Tier × 1,000) × DamageWeight + Kills × 10/Tier × KillsWeight + 5,000/Time × TimeWeight)]. DamageShare is player Round-4 damage divided by all players’ Round-4 damage. The visible Round-4 pool control is not part of this archived expression. Verify against the designated workbook before certification.

> **Formula caution**: The historical sample has missing formulas in per-player totals and summary cells. A separate repaired copy is not the designated workbook and was not tested in desktop Excel here. Use the equations above as a target/review reference only, not as a declaration of the live spreadsheet’s behavior.

## 5. Mandatory regression matrix

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
| Area | Case(s) | Pass criterion |
| --- | --- | --- |
| Round 1 | Double one player’s Damage while holding others fixed; verify numerator and shared denominator. | Exact formula outputs match canonical workbook and calculator within predeclared numeric tolerance. |
| Round 2 | Change kills; test zero total kills and invalid/blank input. | Valid inputs calculate consistently; invalid/zero-denominator case is handled explicitly, not silently. |
| Round 3 / C01 | Compare time 70 vs 140; also blank, text, 0, negative, and non-finite. | With other inputs fixed, 70 seconds gives higher metric than 140; invalid values block certification. |
| Class / C02 | DD→CA→BB; blank, unknown, whitespace, case variants, and changing label without weight. | DD=4, CA=3, BB=2 in both systems; invalid class blocks score; label and numeric weight cannot diverge. |
| C03 / C04 | Change legacy S10:S12 and Round-4 pool F8. | Retired controls hidden/inert; no UI advertises an unimplemented scoring effect. |
| Round 4 | Change each term separately; zero total DamageShare; invalid Time; alter Damage and denominator. | Formula, error handling, aggregation and boundaries match the validated spec. |
| Totals / H12 | All participant rows; missing-row fixtures; seed display; dollar label. | No stale formulas; values recompute; H12 label clearly says illustrative-only. |
| Defaults / interaction | First use, each 0.1 step, individual reset, site reset, save/reload, legacy migration. | Expected settings persist/reset correctly in actual browser. |
| Runtime | Desktop Excel and Office 2010 if still a required target. | VBA compiles, formulas recalculate on open/edit/save, no broken references, fixed tests pass. |

## 6. Run sequence and evidence

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
1. Obtain the exact designated workbook. Record filename, version, file size, and SHA-256; ensure it is the one named in the approved settings record.
2. Preserve a read-only copy. Create a separate test copy and never modify the source as part of testing.
3. Run the untouched default fixture, then one-variable mutations and invalid-input boundaries. Record exact input cells, expected result source, unrounded value, displayed value, formula, and tolerance.
4. Run workbook and calculator with identical accepted individual-performance inputs. Compare row outputs, round totals, participant-level `dblns`, aggregation, rounding, and H12. Verify that the match outcome is calculated from the approved metrics and formula, follows the published tie-break rules, and matches the saved official result record.
5. Open/compile/recalculate in the actual required Excel environment, including Office 2010 if it remains a target. Test save/reopen and UI/macro paths.
6. Archive raw fixtures, logs, version/hash, discrepancies, corrections and reviewer sign-off. A formula engine or browser result is not a substitute for the target-runtime test.

## 7. Current status

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Treat this as practical guidance, not an event rule; verify game mechanics against current evidence.</div>
> **Open / blocking**: No certification is possible until the designated workbook is provided. Historical source tests showed missing formulas in Event1-Damage!AE17:AE23, Event2-Kills!AE16:AE23, Event3-Race!AE16:AE23, Event4-GrandYolo!AS18:AS23, Tourney Totals!H4:H11 and E5:E11. The repaired copy matched four controlled mutations in a formula engine but has not passed desktop Excel/Office 2010 acceptance.

## 8. Definition of done

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use the designated source of truth; compare identical inputs and formulas, and do not certify untested parity.</div>
> **Scoring gate passes when**: The exact designated workbook is fingerprinted; all formula and invalid-input tests, C01–C06 behavior, resets, H12 suppression, and post-start change/audit-trail tests pass; workbook and calculator match on the full suite; target Excel/VBA runtime succeeds; independent reviewer signs the evidence; and the approved event settings record names the accepted version.
