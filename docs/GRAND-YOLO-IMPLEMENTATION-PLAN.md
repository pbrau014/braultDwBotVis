# Pilot and Full YOLO implementation plan

**Version:** 1.1 implementation appendment  
**Updated:** 2026-11-04  
**Branch:** `grand-yolo-format-implementation` (branched from reviewed `dwbotVis`)  
**Base:** `5559e2be2c1fcd12b22cff9197ac5c5cb29e3f63`  
**Status:** Core lifecycle model and authenticated service/API path implemented; production remains NO-GO.

## Governing model

One YOLO system supports two distinct formats. Pilot YOLO is a single-evening event with one event lifecycle and no season carryover by default. Full YOLO is a multi-week or multi-month season with Regular Season, Postseason and Grand YOLO Finale. Shared identity, evidence, scoring validation, correction, referee, audit, communications and recovery procedures are reused. Format lifecycle is separate from the legacy individual scoring categories.

## Implemented in this branch

1. `src/yolo-formats.js`: format-specific tournament record, publication gates, registration, team/roster assignment and lock, fixture scheduling, evidence-linked game records, verified match outcome provenance, Race side-event separation, stage progression, withdrawal guard and Pilot completion.
2. `src/tournament.js`: state normalization and full archive import/export now preserve explicitly declared YOLO tournaments. Legacy v2 player scores are retained and are not automatically assigned to Pilot or Full. Public snapshots redact registration Discord IDs.
3. `src/desktop-service.js`: administrator-only list/create/update lifecycle operations. Registration uses an existing player-to-Discord link, not a caller-supplied identity assertion.
4. `src/desktop-bridge.js`: authenticated, CSRF-protected Admin endpoints under `/api/admin/yolo-tournaments`.
5. `desktop/admin.html` and `desktop/admin.js`: draft creation, organizer-approved publication, and start/complete controls for Pilot and Full records.
6. `desktop/help-tips.js` and `desktop/desktop.css`: contextual tips support mouse hover and keyboard focus; visible instructions remain in the interface.
7. Regression tests cover lifecycle rules, publication gates, identity, roster locking, fixture evidence, outcome-method version/hash, Race separation, archive redaction, service permissions and migration.

## API outline

- `GET /api/admin/yolo-tournaments` - administrator-only lifecycle summaries.
- `POST /api/admin/yolo-tournaments` - create a Pilot or Full draft; body contains `title`, `format`, and format-specific `settings`.
- `POST /api/admin/yolo-tournaments/:id/publish` - publish only with organizer approval (`approvedBy`, `approvedAt`, `rulesVersion`, `rulesHash`) and complete required format settings.
- `POST /api/admin/yolo-tournaments/:id/start` - begin the published event/season.
- Additional action suffixes: `register`, `create-team`, `assign-player`, `lock-roster`, `schedule-fixture`, `record-game`, `complete-fixture`, `race-side-event`, `transition-stage`, `withdraw`, `finish-pilot`.

All routes are inside the existing administrator authorization and CSRF boundary. They do not add a Discord channel, enable slash commands, change public channel visibility, or change OAuth scopes.

## Invariants and safety rules

- No automatic conversion of legacy individual score records into season or Pilot entries.
- No alteration of the existing four scoring buckets or Grand Yolo formula.
- No match winner/advancement calculation is invented. Full match completion requires a verified result bound to the published method ID, version and hash, plus outcome evidence.
- Full stage progression requires at least one fixture for the current stage and all such fixtures completed.
- Locked rosters cannot be silently edited; withdrawals after lock require a separately approved substitute/forfeit resolution.
- Race side-event elapsed seconds must be positive; normalized metric is (1 / seconds). It is stored separately from match outcomes.
- Registration requires a valid existing player ID and a server-verified linked Discord identity.
- Public recovery snapshots omit registration Discord IDs. Full private recovery remains administrator-only.
- The nine mandatory OCR fields remain exact and mandatory. No OCR fuzzy repair, zero substitution, or bypass is introduced.

## Appendments and newly identified work

### A. Stage-aware match progression

Fixtures record the stage in which they were scheduled. Stage transition is blocked if the current stage has no fixtures or any current-stage fixture remains unresolved. Continue testing Regular Season -> Postseason -> Grand Finale -> Complete, including byes, forfeits, no-shows, withdrawals, and organizer-approved tie resolution.

### B. Organizer policy completeness

The system intentionally blocks publication when required settings or approval provenance are absent. The canonical scoring workbook and canonical Score Reporter HTML were not present in the reviewed source set. Do not infer weights, rounding, qualification, team sizes, prizes, special-mode labels, or awards. Obtain organizer-approved policy and the canonical workbook before automating match calculations or award distributions.

### C. Full participant and organizer UI

The current Admin page supports draft creation and publish/start/complete controls. Full roster/fixture/match administration is available through the authenticated service/API actions but does not yet have dedicated visual forms for every action. Add role-specific UI for registration, team assignment, roster locking, fixture scheduling, game evidence, match verification, stage advancement and race side-event entry; expose only participant-owned registration and results to Players.

### D. Validation and release

Run the exact-branch Node 22/24 CI suite and add UI contract tests for the help popovers and Admin lifecycle controls. Run migration/backup/restore tests against real historical state copies. Test in a browser with mouse, keyboard and screen reader. Then complete Windows/native OCR, local OAuth/browser upload, isolated development-guild Discord smoke, workbook parity, security, recovery, clean extraction and organizer publication sign-off. Linux/offline tests do not replace those gates.

## Release gate status

| Gate | Status | Evidence needed |
|---|---|---|
| Domain lifecycle implementation | Implemented; local tests passed for the isolated prototype | Current branch CI |
| State migration and private snapshot redaction | Implemented | Current branch persistence tests |
| Authenticated Admin lifecycle service/API | Implemented | Current branch desktop/API tests |
| Admin visual lifecycle controls | Partial | Browser interaction and expanded stage/team forms |
| Mouse + keyboard quick-help | Implemented | Browser/accessibility review |
| Canonical workbook/match-outcome parity | BLOCKED | Designated canonical workbook + signed method |
| Organizer event settings | BLOCKED | Complete approved settings record |
| Windows/native OCR acceptance | NOT RUN in this implementation turn | Exact current branch on supported Windows host |
| Local OAuth/browser upload | NOT RUN in this implementation turn | Local browser test with synthetic screenshots |
| Isolated Discord smoke | NOT RUN in this implementation turn | Development guild/channel and test credentials |
| Production release | NO-GO | All required gates above closed |

## Amendment discipline

Add changes as appendments with version, date, source/provenance, affected requirements, rationale, tests, evidence and effective scope. Preserve historical sources and do not silently reconcile conflicting rules. Record tests as PASS, FAIL, BLOCKED or NOT RUN; never turn missing evidence into a pass.
