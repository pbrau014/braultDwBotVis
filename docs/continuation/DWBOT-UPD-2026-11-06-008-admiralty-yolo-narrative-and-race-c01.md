# DWBOT update — Admiralty × YOLO narrative and Race C01 implementation

**Date:** 2026-11-06  
**Branch:** `main`  
**Status:** Changes committed; exact-head CI/browser verification pending. The narrative materials are proposals/mock documentation, not an event approval.

## 1. User directive

The full user request is preserved verbatim in both `plan1.txt` and `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt` under the 2026-11-06 directive entry. The request asked for the Admiralty, CBStrat, Discord messages and YOLO source folders to be reconciled into a coherent mock tournament narrative, public participant materials, tactical instruction, scoring explanation, Pilot/season/playoff/Grand YOLO coverage, web research and a clear warning that tournament configurations frequently change.

## 2. Source intake and provenance

- Source archive `yoloPaperWork(1).zip`: 22,976,255 bytes; SHA-256 `b7598ed96d9af8ff1bd564e7aed945621800e2299e2f262d86541c62f34cf7b2`.
- ZIP integrity test passed; 19 members; safe path check before extraction.
- Three Discord text sources were preserved verbatim under `dwbotStuff/discordMsgs/`.
- Exact source hashes, boundaries, archive composition and conflicts are recorded in `04_Companion_Materials/Admiralty_YOLO_Source_Reconciliation_and_Visual_Provenance_v0.1.md`.
- Existing source imagery is reused from `dwbotStuff/`: Admiralty organization chart, two alternate concept boards, CBStrat infographic and YOLO score example. The alternate Admiralty boards are explicitly labeled non-canonical because their names and chronology differ from the handbook PDF.

## 3. Documentation created or updated

- `04_Companion_Materials/Admiralty_YOLO_Mock_Tournament_Field_Guide_v0.1_PROPOSAL.md` — participant-facing narrative, fictional Admiralty cast, governance-to-tournament roles, Pilot and recurring formats, CBStrat tactical principles adapted to low-tier mixed bot/human play, WoWS terminology, scoring explanations, Discord operations, playoff proposal and Grand YOLO distinction.
- `04_Companion_Materials/Admiralty_YOLO_Mock_Tournament_v0.1.html` — responsive navy/gold editorial companion using exact repository imagery, accessible navigation/focus, print styling and reduced-motion handling.
- `04_Companion_Materials/Admiralty_YOLO_Source_Reconciliation_and_Visual_Provenance_v0.1.md` — source authority, archive hash, per-file hashes, contradictions and tactical adaptation boundaries.
- `04_Companion_Materials/Season_Logistics_and_Grand_YOLO_Finale_Blueprint_v0.2_PROPOSAL.md` — version header corrected and extended with narrative, tactical teaching, source conflicts and web research.
- Updated `README_AND_INDEX.json`, `Companion_Material_Crosswalk_v3.19.md`, `Scoring_Workbook_and_Validation_Guide_v1.1_DRAFT.md` and `SOURCE_BUNDLE_STATUS_AND_ACQUISITION_RECORD.md`.
- The participant guide clearly distinguishes source rules, current DWBOT policy, proposals and fictional mock story. It states that tournament configurations frequently change and requires event-specific current settings.

## 4. Reconciled rule distinctions

- Pilot is drop-in, visible-lineup, simplified format; recurring weekly YOLO uses weekly individual registration, a new random draft and different team/bot composition. They are not interchangeable.
- Weekly bracket advancement follows verified match wins. Individual damage drives the announced damage awards and cumulative Grand YOLO damage standings. This reconciles the short Discord summary with the recurring rules without changing the source text.
- The recurring source has a Race side-event for the lower 50% by cumulative damage every third week. “Big Race” is also a map name and is not the same thing.
- The source conflicts on the Ocean special-mode label/duration: Pilot five minutes, recurring map table ten minutes, Race narrative thirty minutes. Event-specific mode/duration must be approved before announcement.
- Recurring Round 1 includes 2v6 and a later 3v9 option; later rounds include 6v6 or 9v9 with two or three humans per side. Publish the chosen lineup in each event's settings.
- The YOLO source does not define a complete separate playoff field/bracket. The existing top-eight, 6-of-12 and single-elimination model remains proposal only.
- Grand Yolo Round 4 workbook sheet is an individual score formula, not the same thing as the season-ending Grand YOLO event or a team bracket formula.
- The supplied `test27xlsm.xlsm` is an archival sample, not the designated canonical workbook.

## 5. Scoring C01 implementation

The current policy C01 specifies Race performance share as inverse elapsed seconds so lower time scores better. The supplied archival workbook and Discord texts use raw elapsed seconds, which rewards slower times. Historical sources remain unchanged as provenance.

Code changes:
- Core `src/tournament.js`: `2c1c1faf22ed0c519d2a11e901bd83720e755d2c`
- HTML `dwbotStuff/yolo_tournament_scoreCalculator.html`: `561d792388f101eb5fa8ff61b6b63c65c3e3bad1`
- Tests `tests/tournament.test.js`: `38da9fb1c3db28cb5c254e2023ba198785f4a39e`

A regression test compares 60 seconds against 120 seconds with equal class/tier and asserts the faster time earns more. The randomized parity harness now models Race using inverse-time shares in both the core and HTML calculator. Exact-head CI and browser validation remain pending; no pass is claimed until logs confirm success.

## 6. External research

The public guide links Wargaming and the World of Warships Wiki for game/class/detection terminology; WoWs Tournaments for event logistics and changing restrictions; WoWS Numbers for optional public statistics; DevStrike as community guidance; and Turnio/ScoreLeader for general tournament formats and brackets. The current King of the Sea XIX NA event listing was used only as an example of event-specific dates, signup windows, team size, map pool and ship restrictions—not as YOLO policy.

## 7. Release and authority boundaries

- The mock story's characters and dialogue are fictional.
- No actual event dates, prizes, eligibility cutoffs, ship lists, channel permissions or organizer appointments were created.
- The proposed playoff defaults remain unapproved.
- Current bot intake remains one configured channel; the suggested multi-channel Discord map is only a proposal.
- The canonical scoring workbook and event-specific signed settings are still required before live scoring/prize/bracket certification.
- Exact-head CI/browser checks must be completed before declaring the Race implementation verified.
