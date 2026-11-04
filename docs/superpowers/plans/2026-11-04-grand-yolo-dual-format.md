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
