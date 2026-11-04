# Grand YOLO implementation plan and append-only findings

## Phase 1 — shared domain model
- [x] Add explicit Pilot/Full format constants and validation in `src/yolo-formats.js`.
- [x] Keep Pilot seasonless; require a declared Full season duration and regular-season/postseason/finale stages.
- [x] Add event-night and registration primitives, audited lifecycle transitions, settings freeze, and distinct Race/Grand Yolo concepts.
- [x] Fail closed on official match outcome without approved scoring, accepted evidence IDs, aggregation, rounding and tie-break rules.
- [x] Persist additive tournament/event-night metadata in private full archives; exclude registrations from public recovery snapshots.
- [x] Add authenticated desktop Admin APIs for tournament creation, stage transitions, event-night scheduling and roster registration.
- [x] Add participant self-registration and privacy-minimized event-night status in the Player workspace.
- [ ] Add Discord command workflows for organizer lifecycle administration and participant registration.
- [x] Add Team/Fixture/Match/Game creation, roster locking, evidence association and review endpoints to authenticated desktop workflows.
- [x] Add approval-record gates before publishing tournaments/stages/event nights; event start locks registration; rejection requires a reason.
- [x] Persist actor/time/action audit records for tournament, stage, event-night, team, fixture, match, game and evidence decisions.

## Phase 2 — data migration and persistence
- [ ] Add additive schema migration preserving v2 player scores, account links, OCR records, pending submissions and corrections. Legacy events remain unclassified; never infer Pilot/Full.
- [ ] Add season, stage, event-night, registration, team, roster, fixture, match, game, evidence, award and audit storage.
- [ ] Add backup/restore compatibility tests and rollback evidence.

## Phase 3 — participant and organizer workflows
- [ ] Shared participant registration, identity, rules acknowledgement, roster display, upload/correction, standings and dispute workflows.
- [ ] Pilot single-evening lifecycle and closeout, with no season carryover by default.
- [ ] Full cumulative regular season, postseason qualification, bracket, finale and season closeout.
- [ ] Role/permission, channel-scope and audit tests; no unapproved privacy changes.

## Phase 4 — scoring and workbook
- [ ] Obtain and verify designated canonical workbook and approved event settings record.
- [ ] Reconcile formulas, Race reciprocal metric, match aggregation/rounding and D21 tie-break hierarchy.
- [ ] Keep player score categories separate from match outcomes, awards and bracket progression.
- [ ] Do not expose currency/award values until expressly approved.

## Phase 5 — desktop and documentation
- [ ] Add format-aware Player/Admin views, schedule/season timeline and accessible hover + keyboard-focus quick tips.
- [x] Create complete Markdown, text and HTML instruction sources, plus regenerated DOCX and PDF working drafts. DOCX rendered/inspected at 3 pages; PDF rendered/inspected at 3 pages.
- [x] Generate DOCX and PDF working drafts and visually inspect all rendered pages (DOCX 2 pages; PDF 3 pages).
- [ ] Add DOCX/PDF generation to repository CI and commit reproducible sources/build instructions.
- [x] Add hover and keyboard-focus quick tips plus persistent help panels to desktop Player/Admin pages.
- [ ] Verify visual/browser behavior on Windows, including touch and screen-reader interaction.

## Phase 6 — acceptance and release
- [x] Add focused unit/integration regression tests for the new domain, service, bridge and UI contracts.
- [ ] Obtain green CI on Node 22 Linux and Node 24 Windows; first run exposed a JS syntax defect and existing workflow/package verification defects, now patched and awaiting rerun.
- [ ] Test Pilot and Full lifecycle, stage gates, duplicate registration, withdrawals, forfeit/bye, ties and rule freeze.
- [ ] Test legacy migration and all OCR exactness/evidence controls.
- [ ] Real Windows/browser/OAuth/Discord/Excel/current-game-client acceptance and security/recovery checks.
- [ ] Final source fingerprint, package inventory, docs sign-off and production approval.

## Append-only findings
- Canonical v3.22 workbook and canonical Score Reporter HTML are absent from the audited source set; bundled workbook is not presumed equivalent.
- Historical participant/ship/team details conflict or remain blank. Event-specific values require organizer approval.
- Training Room reward-field presence is a client/evidence test requirement; do not weaken the nine-field OCR contract or synthesize zero.
- D21 match progression must not be activated until scoring source, aggregation and rounding are approved and tested.
- This feature branch is based on the repository's `main` implementation head; `main` itself has not been changed.
- The domain module is currently an additive foundation, not yet wired into persisted state, Discord commands, or desktop workflows. No production readiness claim is made.


## Append-only implementation update — 2026-11-04
- Added Admin tournament/stage lifecycle controls, event-night publish/start/complete controls, registration, team, fixture, match, game and evidence workflows; Player view shows public format/stage and self-registration status.
- Approval references are mandatory for publication; event start locks roster. Full stages must complete in order and the season cannot close early.
- Evidence is linked only from complete mapped screenshot records, then requires explicit admin acceptance/rejection; rejected evidence requires a reason. No scoring or bracket progression is inferred from OCR or legacy score buckets.
- Latest verified CI at an earlier checkpoint (`a7de36ae81f67dc4725a072d9938dd436beded65`) passed Node 22 Linux offline verification. Later team/evidence and approval-gate additions require a fresh run.
- Earlier CI also exposed and prompted fixes for a PowerShell OpenCV smoke-check quoting error and detached-HEAD package script handling. Those fixes need verification in the latest CI run.
- Remaining blockers: Discord lifecycle commands, actual Windows/browser/Discord/Excel/current-client acceptance, canonical workbook and Score Reporter HTML, organizer-approved event settings, approved scoring aggregation/rounding and award amounts. Production remains NO-GO.
