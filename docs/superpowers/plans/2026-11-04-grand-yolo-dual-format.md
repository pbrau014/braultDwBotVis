# Grand YOLO Dual-Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add Pilot YOLO and Full YOLO lifecycle support to existing DWBOT without changing score semantics or misclassifying legacy data.

**Architecture:** Add a focused tournament-lifecycle domain module and integrate it as an additive, versioned extension to existing v2 state. Keep four scoring categories intact. Add accessible desktop help and comprehensive instructions.

**Tech Stack:** Node.js >=22.16.0, node:test, existing HTML/CSS desktop, Markdown, python-docx and LibreOffice/Poppler rendering.

**Spec:** docs/superpowers/specs/2026-11-04-grand-yolo-dual-format-design.md

## Global Constraints
- Preserve exactly nine mandatory OCR fields in existing order; XP remains ninth.
- Do not weaken exact-value OCR validation.
- Keep score formulas, category names and seven-game slots.
- Keep main read-only; work on feature/grand-yolo-dual-format.
- Do not infer legacy format, season, match or team assignments.
- No live Discord, external API, channel or privacy changes.
- Do not invent organizer approvals or event settings.

## Review Focus
- Invalid lifecycle transition or cross-format ID reference.
- Duplicate roster/registration/fixture assignments.
- Legacy v2 state with malformed optional lifecycle fields.
- Empty/unknown settings treated as zero or approved values.
- Race side-event accidentally counted as ordinary race score.

---

### Task 1: Domain lifecycle model

**Files:** Create src/tournament-lifecycle.js and tests/tournament-lifecycle.test.js; modify src/tournament.js only after tests.

**Interfaces:** createLifecycleState(), normalizeLifecycleState(raw), createTournament(input), transitionTournament(tournament, nextStatus, auditContext), createSeason(tournamentId, input), createStage(seasonId, type, input), assignRoster(...), recordMatchOutcome(...), advanceBracket(...).

- [ ] Test format validation, immutable format after results, Pilot no season, Full season lifecycle, invalid transition, duplicate roster membership, audit log.
- [ ] Run targeted tests and confirm RED.
- [ ] Implement focused module and pass tests.
- [ ] Add v2 compatibility adapter with empty lifecycle state and legacyUnassigned provenance.
- [ ] Run existing tournament tests and full npm test.

### Task 2: Tournament integration and invariants

**Files:** Modify src/tournament.js and tests/tournament.test.js; create tests/tournament-lifecycle-migration.test.js.

**Interfaces:** normalizeState retains existing fields and attaches additive lifecycle. makeArchiveSnapshot/importBackup round-trip lifecycle while preserving existing fields.

- [ ] Test old v2 archive import, OCR queues, account links, four categories and game slots.
- [ ] Test lifecycle export/import and no implicit Pilot/Full assignment.
- [ ] Implement migration/normalization.
- [ ] Run full tests, OCR contract tests and persistence/recovery tests.

### Task 3: Desktop experience and accessible help

**Files:** Modify desktop/player.html, desktop/admin.html, desktop/desktop.css and relevant desktop JS only after tracing render contracts; test tests/desktop-ui-contract.test.js.

- [ ] Add format/status overview, lifecycle timeline and next-action panels.
- [ ] Add contextual quick notes with hover + keyboard focus + accessible text.
- [ ] Ensure role boundaries and no Player exposure of Admin-only controls.
- [ ] Add UI contract tests and run all desktop tests.

### Task 4: Instruction set and release evidence

**Files:** Create grandYoloInstruct.md, .docx, .pdf, .txt, .html and reports/grand-yolo-dual-format-implementation-status.md.

- [ ] Produce consistent participant, host/referee, organizer, scoring, evidence, Discord and troubleshooting instructions.
- [ ] Mark organizer-controlled fields explicitly unapproved.
- [ ] Render DOCX to page images; inspect every page and fix layout defects.
- [ ] Render PDF and visually inspect pages.
- [ ] Run test suite and verify package artifact hashes.
- [ ] Record environment-only gates as OPEN until real evidence exists.

## Completion contract
A task is complete only when named tests ran and passed. Feature branch is not production-ready until all automated checks and real-environment gates are verified. Do not merge without a separate explicit integration decision.


---

## Plan amendments — findings during implementation (2026-11-04)

These additions supersede any narrower initial interpretation of the tasks above.

### Amendment A: explicit organizer approval register
**Finding:** A boolean approved flag or operator-entered method name alone is not sufficient provenance for match advancement or awards.

**Implementation:** Added persisted approval records with ID, scope, version, approver, timestamp and notes. Desktop service verifies an actual stored approval record with the correct scope before accepting a match outcome, advancing a bracket or recording an award. Match outcomes reference a real match and its scheduled fixture teams; bracket advancement must use the same approved method, target a fixture in the same season, include the advancing winner and cannot repeat an already-advanced outcome.

**Tests authored:** Admin approval-required behavior, scope mismatch, match/fixture association, and award-specific approval.

### Amendment B: event-night scoped roster and scoring
**Finding:** Full YOLO teams may vary by weekly event. A season-wide participant-to-team lock would contradict the recurring-format source.

**Implementation:** Roster assignments now require an event-night ID and are unique per participant/event night, allowing a new team assignment on another event night. Score entries are also tied to an event night and a unique player/category/game slot within that night. Full standings accumulate scoped entries; Pilot uses its one single-evening event night.

**Tests authored:** Same-night duplicate rejection, cross-week team reassignment, event-night score association, Pilot one-night restriction.

### Amendment C: tournament-scoped scoring ledger
**Finding:** The existing global score buckets would mix Pilot and Full results if reused without a tournament identifier.

**Implementation:** Added separate tournament score-entry ledgers. Scoped score views are derived through the existing tournament scoring engine; the original player score buckets and legacy results remain unchanged. Screenshot mapping may select a format-scoped tournament and event night. Legacy/global mapping remains available when no tournament is selected.

**Race metric correction:** Preserve positive elapsed seconds as source data and calculate the approved inverse-seconds target metric (1 / elapsed seconds) for standings, so lower elapsed time ranks better. The existing Race side-event remains separate and contributes zero to ordinary match score by default. Grand Yolo score category remains separate from the Grand YOLO Finale stage.

### Amendment D: Pilot registration and lifecycle
**Implementation:** Added Pilot-specific registration and a single event-night record; Full-only season creation requires a Full tournament owner. Pilot has no automatic season carryover. Tournament format/status transitions freeze format after registration opens and freeze ordinary configuration when active.

### Amendment E: accessible Admin and Player workflows
**Implementation:** Added Admin forms for tournament creation/status, Pilot registration/event night, Full seasons/stages/teams/registrations/weekly rosters/event nights/fixtures/matches/outcomes/bracket progression/approval records/awards and scoped score entry. All mutation endpoints are Admin-only and CSRF-protected. Player and Admin pages show format explanations and quick notes with mouse hover and keyboard focus. Player sees only tournaments in which they are registered. Evidence mapping supports tournament and event-night selection.

### Amendment F: historical source conflict handling
**Finding:** Pilot entry model (drop-in vs preregistration), side size/human-bot split, weekly rounds, special-mode name, ship allowlist and Race side-event schedule remain conflicting or incomplete.

**Implementation:** Added section 15 to grandYoloInstruct documenting conflicts and proposed recurring schedule (weeks 3/6/9/finale; week 12 only for a 12-week season; one hour before the regular event) as a template requiring organizer ratification. Workbook control edits remain blocked because the designated canonical v3.22 workbook is absent from the audited Library.

### Current task status
- Domain and service/UI implementation files and regression tests have been authored on the feature branch.
- The legacy v2 normalization/archive path includes an additive lifecycle state; private archives preserve lifecycle state and public archives omit it to avoid exposing private roster identifiers.
- Documentation formats are generated locally and visually rendered: Markdown, TXT, HTML, DOCX and PDF. DOCX/PDF are six/seven-page rendered outputs (current page count after the source-conflict appendix: 7 pages); page images reviewed.
- **Not yet verified:** full repository npm test, full desktop test suite, OCR regression suite, GitHub Actions CI (no workflow runs were returned for the PR head), Windows/native Tesseract, browser OAuth/upload visual testing, live isolated Discord smoke, workbook parity and real-event acceptance.
- Do not mark production-ready or merge until the remaining checks pass and organizer-controlled values are approved.

