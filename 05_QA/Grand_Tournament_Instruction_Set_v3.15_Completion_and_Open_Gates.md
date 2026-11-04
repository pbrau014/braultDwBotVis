# v3.15 Completion and Open-Gates Report

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


**Prepared:** 2026-10-29  
**Status:** DOCUMENTATION RECONCILED / EVENT AND SYSTEM RELEASE NO-GO

## 1. C01–C06 selected policies

> <span style="color:#244c70">⚓ **Quick hint:** A polished document is not release approval; keep blockers visible until the required evidence exists.</span>


| ID | Selected decision | What is resolved | What remains unverified |
|---|---|---|---|
| C01 | Round 3 stores positive finite elapsed seconds; score metric is 1 / seconds; lower valid time scores better. Invalid/malformed times block certification. | The target meaning, direction and invalid-input behavior are explicit. | The canonical workbook and calculator are unavailable for implementation/parity tests; historical formula conflicts with this target. |
| C02 | Shared mapping DD=4, CA=3, BB=2; blank/unknown classes block scoring. | Mapping and invalid-value policy are explicit. | Canonical formula derivation or label/weight paired validation must be implemented and regression-tested. |
| C03 | Retire/hide S10:S12 from participant-facing scoring; preserve historic addresses/data. | UI policy is explicit. | Canonical workbook/UI must be tested to prove those values do not affect score. |
| C04 | Retire/hide Round 4 F8 pool control; preserve cell for audit; Rounds 1–3 pool control remains active. | Scope difference between Round 4 and Rounds 1–3 is explicit. | Canonical workbook/UI must verify F8 has no Round 4 effect and still works in Rounds 1–3. |
| C05 | No participant-facing H12 dollar estimate by default; keep H12 as internal historical diagnostic. | Unverified conversion is suppressed; $12.56 is documented as a historical test display, not a cash/prize value. | If future display is desired: verify basis and get separate organizer approval first. |
| C06 | Freeze ordinary rules/settings after event start; ordinary changes affect future/unplayed games only, never completed results. Emergency pause/cancel/restart requires scoped and timestamped record; factual corrections preserve old/new evidence in an audit trail. | Change control and audit requirements are explicit. | Actual workflow needs implementation and test in the approved tools. |

## 2. Reconciled source policies for format drafts

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


- **Performance-based progression vs awards:** recurring advancement uses the verified match outcome calculated from accepted individual-performance metrics (including Damage and Kills) under the approved scoring method, aggregation, rounding, and published tie-breaks. Participant-level `dblns` remains a traceable output whose contribution is governed by the approved formula; extra award or seeding uses must be expressly published. Pilot placement remains individual total Damage for the announced Pilot awards; any Pilot bracket requires its own performance-based outcome calculation and tie-breaks published before signup.
- **Pilot special Ocean mode:** source names conflict. Do not announce the special mode until the installed client confirms its exact label. If it cannot be confirmed, an organizer must approve omitting that game; use only verified Standard Battle settings in the interim.
- **Recurring Race:** treat Race as a separate side-event, not as the regular weekly match. Template schedule is weeks 3, 6, 9, and finale week 12 if using a 12-week season, one hour before the regular event. “Big Race” in the map rotation is a map name. Race damage goes to Race/cumulative season totals and declared Race awards, not the ordinary score for that evening. Organizer must ratify and publish actual dates.
- **Recurring teams:** later stages use equal 6- or 9-slot teams with 2–3 humans per side and bots filling declared slots. The source’s Round 1 “2v6 against bots” does not define both side compositions; Round 1 is not schedulable until the organizer signs an exact per-side roster table.
- **Ships:** use an explicit published allowlist; unlisted ships are not approved. The source supplies tier/role restrictions but has blank allowed/banned lists, which must be filled before registration.

## 3. Publication approval record

> <span style="color:#244c70">⚓ **Quick hint:** Do not announce or issue the event until required settings, ownership, approvals, and release gates are complete.</span>


The approval record has PUB01–PUB09, known source baselines, selected policy defaults, version information, and explicit blockers. The record is complete as a **NO-GO approval worksheet**, not as a signed approval. Actual event name/date/time, accountable owner, authorized organizer, independent appeal/review contact, effective time, final settings, canonical scoring build identity, and real signatures were not supplied. Do not invent names, fill an approval by inference, or backdate a signature.

## 4. Completed documentation QA

> <span style="color:#244c70">⚓ **Quick hint:** Apply the declared clock and restart rule for this event; record the trigger, time, and decision.</span>


- Updated the master and eight companion Word guides; matching Markdown copies and a source-bundle acquisition/status record are included.
- Master policy references and C05 wording were reconciled with the default-off policy.
- The event settings record now records source-derived settings and specific conflicts, rather than hiding them in generic placeholders.
- Internal Word/PDF/Markdown navigation, two-icon conventions, rendered page layout and automated document-structure accessibility checks were retested in the final package. The structural checker reported zero high/medium/low findings for the nine Word files; this is not a legal/WCAG certification. Outgoing hyperlinks were not checked by instruction.
- Documentation-only package scan can detect common secret/token patterns, but cannot establish that credentials were revoked or that absent source code is safe.

## 5. Real-world/system gates still open (hard blockers)

> <span style="color:#244c70">⚓ **Quick hint:** Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</span>


1. Obtain the exact canonical `test27xlsm_detailed_audit_polished_regression.xlsm`; do not substitute older `test27xlsm.xlsm`. Run the complete formula, invalid-input, H12-hidden, C01–C04, dynamic participant-row, and workbook/HTML parity matrix in desktop Excel, including Office 2010/VBA compatibility where required.
2. Obtain the exact RC3 source bundle. Inspect all source, builds, source maps, and assets; remove browser-side webhook/posting paths; scan the complete bundle.
3. Have the authorized credential issuer revoke/rotate any exposed live credential and retain non-secret evidence. A clean documentation scan is not credential-rotation evidence.
4. Run Windows Node 24/OCR acceptance against frozen fixtures, native Windows Tesseract comparisons, multi-image/timeouts, and live Discord workflow tests on the exact RC3 build. Historical older-version unit-test results are not proof of RC3.
5. Verify Training Room setup in the actual installed client, including game mode labels, roster/bot setup, lineup visibility, spectator access, replay, ready-up, restart, and closeout. Record client build, test date, tester, screenshots, and result.
6. Complete actual event dates/times/time zone, approved maps/stages, Round 1 roster, allowed/banned ship list, award recipients/prizes, channels and support contacts. Attach the selected Pilot or Recurring ruleset and ensure it matches the signed Event Settings Record.
7. Obtain real PUB01/PUB02/PUB09 assignments and signature/effective timestamps. Do not mark the event approved until the authorized organizer signs.

## 6. Decision

> <span style="color:#244c70">⚓ **Quick hint:** Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</span>


**Document preparation: substantially complete. Policy specification C01–C06: resolved. Event issue, scoring certification, bot deployment and live operation: NO-GO until the blockers above have real evidence and authorized sign-off.**
