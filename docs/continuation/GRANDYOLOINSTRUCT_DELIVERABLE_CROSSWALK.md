# GrandYoloInstruct deliverable identity and render crosswalk — 2026-11-05

## Finding

The current candidate source package contains several related Grand Tournament instruction/document sets, but it does not contain a file or text identifier named `GrandYoloInstruct`, nor an authoritative manifest mapping exactly four deliverables to that label. The four requested outputs therefore cannot be named safely from the current source evidence. No new user-facing guide has been generated under an assumed identity.

## Existing candidate document families

| Family | Current source members | Render evidence in this environment | Interpretation |
|---|---|---|---|
| Complete YOLO Tournament instruction set | `dwbotStuff/yolo_tournament_complete_instruction_set.html`, `.docx`, `.pdf` | Source PDF: 26 pages. LibreOffice re-render of DOCX: 26 pages. | Three formats of one document family; no matching Markdown or plain-text member found. Not the claimed two-page Word/PDF layout. |
| Grand Tournament Instruction Set v3.15 policy-resolved baseline | `05_QA/Grand_Tournament_Instruction_Set_v3.15_Policy_Resolved_Source_Baseline.md`, `.docx`, `.pdf`, plus README, manifest and completion/open-gates records | Source PDF: 77 pages. LibreOffice re-render of DOCX: 77 pages. | Historical policy-resolved master and reading copy; explicitly NO-GO for event publication, score certification or live deployment in its README. |
| v3.19 primary publications | `01_Participant/Grand_Tournament_Participant_Guide_v3.19.*`; `02_Operations/Grand_Tournament_Event_Operations_Manual_v3.19.*`; `03_Technical_Reference/Grand_Tournament_Technical_Reference_v3.19.*` (`.md`, `.docx`, `.pdf` for each) | Participant: 17 pages; Operations: 24 pages; Technical Reference: 29 pages, both source PDFs and LibreOffice DOCX re-renders. | Three role-based publications, not four. Their Markdown sources are the editable content baselines. |
| v1.1 companion materials under v3.22 | Eight companion documents in `04_Companion_Materials/` and `docs/source-baselines/grand-tournament-v3.22/04_Companion_Materials/` | DOCX re-renders range from 3 to 7 pages for the sampled eight; several have PDF companions. | Separate procedures/templates. The crosswalk identifies these as companion material, not an exact four-item set. |

## Relevant authority and limits

- `docs/GRAND-TOURNAMENT-V3.22-DWBOT-ALIGNMENT.md` identifies the v3.22 archive as a tournament-policy/operations reference, not bot source or proof of implementation. It records that the archive's 168 members were not all independently audited.
- `docs/source-baselines/grand-tournament-v3.22/04_Companion_Materials/Companion_Material_Crosswalk_v3.19.md` identifies three primary publications and eight companion materials. The v3.22 publication waiver is for documentation publication only; it does not certify runtime behavior, scoring parity, live Discord or bot release.
- `05_QA/Grand_Tournament_Instruction_Set_v3.15_Readme.md` identifies a different v3.15 package and says it remains NO-GO for event publication, score certification or live deployment until its listed gates close.
- `docs/continuation/TOURNAMENT_LIFECYCLE_ADMIN_GUIDE.md` is a current DWBOT implementation guide for Pilot/Full, event-night administration, participant registration, privacy and help behavior. It is not one of the identified Grand Tournament publication families.

## Page-layout verification performed here

LibreOffice headless conversion was used to render every DOCX in the current source package to a temporary PDF directory, then `pdfinfo` was used to inspect page counts. No source DOCX or PDF was modified. The candidate package contains no two-page DOCX among the inspected files. In particular, `dwbotStuff/yolo_event.docx` renders to 4 pages and `dwbotStuff/yolo_tournament_complete_instruction_set.docx` renders to 26 pages. This does not disprove a two-page document existing elsewhere; it establishes only that it is not present in this inspected candidate package.

No page-by-page visual inspection of these newly rendered temporary PDFs was performed in this step. Existing source PDFs were not assumed visually correct merely because they render.

## Next controlled documentation phase

1. Resolve the exact identity, audience and output formats of the four requested GrandYoloInstruct deliverables from an authoritative project record.
2. Choose the governing source content per deliverable, reconciling v3.15, v3.19 and v3.22 without silently combining policy versions or treating documentation waivers as runtime acceptance.
3. Update content only from verified DWBOT behavior: nine required fields, Pilot/Full semantics, event-night workflows, permissions, backup/privacy boundaries, screenshot correction and current Discord/desktop controls.
4. Generate Markdown/plain text/HTML/Word/PDF only where required by the deliverable contract. Keep technical and user-facing audiences separate.
5. Validate cross-format content parity, internal links, chapter order, page numbering, Word/PDF rendering, HTML behavior, keyboard accessibility, and no clipping/overlap. Visually inspect rendered Word/PDF pages before calling them verified.
6. Preserve previous versions and record source fingerprints, output hashes, page counts, render tool/version, test evidence and unresolved policy gaps.

## Status

**Status: IDENTITY UNRESOLVED.** Existing document families inventoried and page counts inspected; four-output mapping not established; no deliverables generated or accepted in this phase.

## Read-only branch and pull-request discovery — 2026-11-05

The earlier finding above was scoped to the current-main source package. A subsequent read-only search of known DWBOT branches and open pull requests found historical candidates. This does not change current-main authority or certify a release.

### Strong four-file candidate: open PR #7

Open PR [#7 — Implement Pilot and Full YOLO tournament lifecycle foundation](https://github.com/pbrau014/braultDwBotVis/pull/7), head `feature/grand-yolo-format-lifecycle` at `74137e218889da57b8674111189344323ea06070`, lists exactly these four tracked documentation deliverables:

1. `docs/yolo/IMPLEMENTATION_PLAN_AND_DECISIONS.md` — blob `ba87fd3a3a16681278c0aea46c625ead9164afc6`
2. `docs/yolo/grandYoloInstruct.md` — blob `934b8eaf80afc4f5e720d9ef63264ddb8969fbb2`
3. `grandYoloInstruct.html` — blob `2900a489cb4cf32071af8e16958af6bf22b4f8fb`
4. `grandYoloInstruct.txt` — blob `6ae08c676db4b3e285ed61fd069252921f0ad795`

The PR body describes a comprehensive `grandYoloInstruct` source manual plus an append-only implementation plan. The manual retains the exact nine mandatory OCR fields, keeps legacy score categories separate from Pilot/Full lifecycle stages, requires organizer-approved/hash-pinned match methods, and preserves production NO-GO until real-environment gates close. This is the strongest candidate mapping for the four-file workstream.

PR #7 head has exact-head offline CI runs `41928708200` and `41928702763`; both Node 22.16.0 and Node 24 jobs succeeded. The Node 22 full suite reported 283 tests, 281 passed, 0 failed and 2 optional skips. These results apply only to that historical branch head, not current main, Windows OCR, live Discord or production.

### Why these files are not copied into current main yet

- Current canonical `main` at `5a12a9c218cebe61d277999318b7ceef5a8dc3b1` does not contain those four paths, `src/yolo-formats.js` or `tests/yolo-formats.test.js`.
- PR #7 is open, based on old main `3659d4701631f707f9e34d3818b11e1aa9a5ddc3`, and its head is diverged from current main by 77 commits ahead / 113 behind. Do not merge the branch wholesale or mutate its history.
- The PR description says changes after tested commit `4c2cef91446cae13403a7e487c8cb160d54bb714` were documentation-only. GitHub's compare from that commit to the current PR head shows 31 later commits changing desktop UI, `src/desktop-bridge.js`, `src/desktop-service.js`, `src/yolo-formats.js` and tests. The current-head CI pass is valid for the PR branch, but the PR body's statement about documentation-only changes is contradicted by the diff.
- The four documents describe Pilot/Full lifecycle behavior that is not implemented on current main. Copying them as current operational documentation would overstate current-main behavior. Retain them as historical source candidates until lifecycle scope and integration are approved.

### Competing candidate sets and unresolved identity

- Open PR #5 lists `docs/GRAND-YOLO-IMPLEMENTATION_PLAN.md` and `docs/grandYoloInstruct.md`, a different tracked set.
- Open PR #11 lists Markdown and HTML sources and describes local DOCX/PDF/TXT deliverables; those local render outputs are not the same four tracked files as PR #7.
- Historical branch `feature/pilot-full-yolo-lifecycle` at `7ff23bfe3302849ad2f6cc07b50e71d78c64c75e` contains another four-file variant (`docs/GRAND-YOLO-IMPLEMENTATION-PLAN.md`, `docs/grandYoloInstruct.md`, `grandYoloInstruct.html`, `grandYoloInstruct.txt`). It is 103 commits ahead / 113 behind current main. Its TXT variant has a section-numbering mismatch, and its plan contains inconsistent DOCX page-count statements; no DOCX/PDF files are committed in that branch tree.
- These records make PR #7's set a strong candidate, but they do not conclusively establish that it is the exact four-file set the user intended. Keep the four-deliverable identity UNCONFIRMED until matched to an authoritative user/project record.

### Missing guide reference and search scope

The previously cited path `docs/continuation/TOURNAMENT_LIFECYCLE_ADMIN_GUIDE.md` is absent from current main and the inspected historical feature branches. Similar Pilot/Full material exists in the candidate manuals, but it is not the same file and depends on lifecycle code absent from current main. No suitable exact replacement was found; treat that path as an unresolved historical reference.

The read-only search covered the known DWBOT repositories and branches recorded in the living plan, with targeted path and PR inspection for `GrandYoloInstruct`, the implementation plan, the lifecycle admin guide and current-plan paths. It was not an exhaustive content audit of every GitHub repository or every branch. No historical branch, repository or PR was modified, merged or deleted.

**Disposition:** retain the PR #7 four-file set as the strongest source candidate; do not import or publish it on current main yet. Revisit after the OCR.Space/current-main acceptance priorities and after the intended lifecycle deliverables are confirmed.