# Grand Tournament Instruction Set — v3.22 Production Documentation Release

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Release decision:</strong> GO for publication of this documentation package under the user's explicit direction to disregard the prior release blockers. Waived checks remain untested; they are not passes.</div>

**Package status:** PRODUCTION DOCUMENTATION RELEASE — USER-DIRECTED GATE WAIVER. This release includes participant-facing rules, operations procedures, technical references, reusable event templates, and supporting QA records.

## Scope of release

This is a production release of the **documentation package and reusable templates**. The user's instruction waives previously identified technical and administrative gates as prerequisites for publishing this package. It does not convert unavailable sources into verified sources, unrun tests into passed tests, blank forms into event approvals, or documentation into a certification of the running scoring calculator or bot.

## Publications

- `01_Participant/Grand_Tournament_Participant_Guide_v3.19.docx`, `.pdf`, `.md` — participant rules, strategy, tactics, and combat mechanics.
- `02_Operations/Grand_Tournament_Event_Operations_Manual_v3.19.docx`, `.pdf`, `.md` — event operations, governance, bot intake, release procedure, and organizer actions.
- `03_Technical_Reference/Grand_Tournament_Technical_Reference_v3.19.docx`, `.pdf`, `.md` — scoring policy, workbook procedures, equations, validation history, and implementation limitations.
- `04_Companion_Materials/` — reusable participant, organizer, scoring, training, bot-maintenance, event ruleset and release records. Legacy `_DRAFT` filenames are retained to preserve established references; current package release status is governed by this README, `RELEASE_INDEX.json`, and the v3.22 waiver record.

## Governing match-outcome rule

Match outcome is calculated from individual performance across applicable published game metrics, including Damage and Kills, under the approved scoring method. The verified match outcome determines bracket advancement, subject to published tie-breaks. Participant outputs, match outcome, bracket decision, and separately authorized awards must remain distinguishable and traceable. Commands, messages, announcements, interface actions, and staff operations must follow this rule. Conflicting or unverified evidence requires a pause, evidence preservation, and authorized ruling.

## Release-gate disposition

**Release gate: GO FOR DOCUMENTATION PACKAGE — PRIOR GATES WAIVED AT THE USER'S DIRECTION.** The following items are acknowledged as not tested or not supplied and are no longer prerequisites for publishing this documentation package: canonical workbook presence/parity, Score Reporter HTML, Excel/VBA/Office 2010 execution, full scoring/browser regression, exact RC3 source and Windows Node 24/OCR acceptance, native Tesseract comparison, live Discord behavior, credential rotation evidence, current game-client walkthrough, event-specific settings, and formal event sign-off.

This waiver is limited to the documentation package and reusable template publication. It **does not** assert those checks passed. A completed event record, actual signature, live scoring certification, credential rotation, and technical deployment approval are not created or implied. Do not use the historic workbook or archived bot tests as if they were the missing canonical builds.

## Baselines, history, and file naming

`06_Baselines/Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip`, the v3.15 policy-resolved source baseline, and historic reports remain unchanged as historical evidence. Main publication filenames inherited from the source set remain v3.19 for reference stability; the enclosing package, release index, and current release record identify this v3.22 package. Historical `NO-GO`, `NOT TESTED`, or `DRAFT` status statements inside archived source-baseline records remain historical findings and are not the governing package-release decision. Active technical appendices and acceptance rows may also continue to show runtime checks as OPEN/NOT TESTED; those statuses remain accurate for implementation certification and do not reverse the documentation-only GO decision under the waiver.

## Verification and records

- `05_QA/v3.22_Production_Readiness_and_Waiver_Report.md` — release decision, scope, accepted waiver, residual facts, and verification summary.
- `05_QA/v3.22_build_verification.json` — ZIP, manifest, and PDF structural verification.
- `05_QA/v3.22_Internal_Navigation_Check.json` — current internal navigation checks for release PDFs, active Word documents, and Markdown local references; external destinations were not checked by instruction.
- `05_QA/v3.21_Change_and_Verification_Report.md` — historical report for the previous candidate.
- `MANIFEST.sha256` — SHA-256 hashes for all release package files except the manifest itself.

The package archive integrity, manifest hashes, and generated document/PDF structural checks are verified as recorded. The v3.22 automated accessibility screen reported 0 high, 101 medium, and 0 low findings across the 11 active Word documents; medium findings are table-header warnings that include layout/callout tables. They were not blindly auto-fixed as data headers, and the screen is not a full manual WCAG/legal review. The user waived this warning count as a package-release gate. This does not certify the behavior of an untested runtime system.
