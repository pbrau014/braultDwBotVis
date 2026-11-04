# YOLO format implementation plan and append-only decisions

Updated: 2026-11-04
Status: Lifecycle foundation, Discord command surface, desktop format-help panels and offline CI workflow implemented on feature/grand-yolo-format-lifecycle. PR #7 open. Current-head CI revalidation pending.

## Governing model
One tournament system supports two distinct formats:
- **Pilot YOLO**: one single-evening event, no season stage and no automatic carryover into Full YOLO.
- **Full YOLO**: organizer-defined multi-week or multi-month season with Regular Season, Postseason and Grand YOLO Finale.

Shared participant identity, evidence, scoring validation, referee review, corrections, audit, communication and recovery procedures remain common. The existing four legacy individual scoring categories remain independent of tournament lifecycle stages.

## Implemented in this increment
1. Added `src/yolo-formats.js` with explicit format/stage/lifecycle entities.
2. Added publication validation. Pilot requires date/time, timezone, entry/lineup deadlines, game count, map/mode/ship/prize/dispute policies. Full requires organizer-selected duration/cadence, regular-season dates, postseason/finale/team policies, a named/versioned/hash-pinned match-outcome method, tie-break and dispute policies.
3. Added verified-identity registration, teams, team assignment, roster locks, fixtures, game evidence references and match outcome verification against the published method hash.
4. Added explicit forfeit/withdrawal/bye/cancellation resolution, Full-stage transitions, and positive-seconds Race side-event records distinct from the legacy Race score category.
5. Added append-only audit entries for lifecycle mutations.
6. Integrated `yoloTournaments` into the existing normalized tournament state and workbook/full archive backup round trips. Legacy version-2 records default to an empty lifecycle collection; no historic score is assigned to Pilot or Full.
7. Added lifecycle tests and legacy migration/archive round-trip tests.
8. Added Pilot attendance check-in (separate from Full-season registration), screenshot-hash-backed Pilot individual Damage results, duplicate player/game prevention and individual standings.
9. Added stage-bounded Full event-night scheduling; each fixture must reference a scheduled event night in the current stage and fit its published time window. Full publication now requires explicit date windows for all three stages.
10. Added Discord commands for format discovery, lifecycle status, creation/publication/start, self-service Full registration and Pilot check-in, teams, roster locks, event nights, fixtures, game/evidence recording, outcome verification, explicit resolution, stage advancement, Pilot results, Race side-event records and Pilot completion. Mutating organizer commands are admin-gated; participant registration/check-in derives identity from the existing Discord-to-roster link.
11. Added a hash-pinned qualification report requirement before postseason/finale advancement. Raw individual scores do not independently advance a team.
12. Added Player/Admin format reference panels and hover/keyboard-focus quick notes with visible descriptions.
13. Added Full YOLO stage-specific non-overlapping date-window validation and Pilot single-evening/entry-close/lineup-lock ordering checks.
14. Added separately approved Full Race side-event schedule records; each result must reference a scheduled event, positive elapsed seconds and archived evidence. Side-event results remain separate from match outcomes.
15. Added stage-start settings snapshots with version and SHA-256; event nights hold their own snapshots. Added versioned prospective revisions for selected future event nights with no fixtures; published outcome/qualification/tie-break method settings remain frozen.
16. Tightened Pilot game-number bounds to the published game count, retained tied individual placements as shared ranks rather than inventing a tiebreak, and added additive normalization for older lifecycle records.

## Appendment A - safety and provenance
- Match outcomes cannot be derived from raw individual totals by this module. The organizer must publish a scoring method ID, version and SHA-256 hash; a completed fixture must reference that exact method and evidence.
- Tie-break order is recorded as head-to-head, tied-team record, predeclared metric/point differential, extra game if published, then auditable random draw only if expressly authorized. A future ranking/advancement service must implement and test the actual published rules; this module does not invent scoring weights.
- Race side-event values are separate from match outcomes. Positive elapsed seconds are stored with reciprocal normalized metric; invalid zero/negative times are rejected.
- Existing Tesseract/OCR nine-field validation and workbook formulas are unchanged.
- Registration's `identityVerified` input is a domain assertion, not proof by itself. Any production route must derive it server-side from the authenticated Discord session and the existing roster-account link; never trust a browser-supplied boolean.
- Existing historical workbook source is not proven canonical. Workbook formula changes remain blocked pending canonical asset identification and approval.

## Remaining plan
### Phase 2 - service and UI integration
- The Discord command surface now supports lifecycle operations, but it is a JSON-argument admin workflow rather than a guided control panel. Add validated command payload schemas, clearer error examples, referee-specific authorization and end-to-end command tests.
- Add authenticated desktop APIs for tournament creation/publication, registration, team assignment, roster lock, event-night/fixture/game administration, stage transition and audit views.
- Add Player self-service registration/check-in and Admin lifecycle forms in the desktop UI; current panels are explanatory reference only.
- Keep every mutation server-authorized; participant operations must resolve the caller's authenticated Discord ID to the linked roster entry.
- Add complete lifecycle state visualizations (stage timeline, schedule, roster/fixture status, evidence and audit history). Tips already work on hover and keyboard focus; essential descriptions remain visible.
- Do not change Discord channel privacy, command registration defaults or live permissions before isolated development-guild testing.

### Phase 3 - scoring and workbook reconciliation
- Identify the designated canonical workbook and Score Reporter HTML.
- Implement and verify the approved Full match-outcome formula only after its weights, aggregation, rounding, qualification and point-differential policy are published.
- Keep player individual totals, team match outcome, Race side-event totals and awards as separate ledgers.

### Phase 4 - operations and evidence
- Add explicit referee resolution workflows for disputes, no-shows, substitutes, withdrawals, forfeits, disqualifications, byes and appeals.
- Store original evidence hash, media type, size, capture timestamp and immutable reference; OCR output remains a proposal.
- Preserve strict nine-field OCR contract: result, player, map, mode, battleStart, credits, freeXp, damage, xp. Do not guess, fuzzy-repair, or substitute zero.

### Phase 5 - acceptance and release
- Unit/integration/migration tests; JSON and SQLite persistence/recovery; public/private archive tests.
- Windows Node 24/native-Tesseract OCR acceptance, exact current screenshot corpus, local OAuth/browser upload and visual QA, isolated Discord development-guild smoke.
- Workbook parity, DOCX/PDF/HTML/TXT manual rendering, clean package extraction and checksum verification.
- Production remains NO-GO until every mandatory real-environment gate has evidence.

## Current verification record
- GitHub Actions offline regression on the lifecycle branch's initial integrated source (commit `b7be1981bef9c261146f1320928c11b5d63aa4a3`): Node 22.16.0 and Node 24 both PASS; 269 passed, 0 failed, 2 skipped. The skips are optional OpenCV-dependent checks because the Linux runner lacks `cv2`.
- Source-evidence lookup corrections and method-hash-pinned qualification evidence were validated by a second GitHub Actions run (PR #9 head `6697f6f94387f8d57e023f6eebfb74d44e29d857`): Node 22.16.0 and Node 24 both PASS; 269 passed, 0 failed, 2 optional OpenCV-dependent skips.
- Stage-window and Race side-event schedule changes passed the revalidation run at commit `4cc3baac10a9ea6ea0ad31f504a4ccd67c9e9289` (Node 22.16 and 24; 272 passed, 0 failed, 2 optional OpenCV skips).
- Further settings-freeze, prospective revision, Pilot game-limit/tie-rank and additive-normalization changes are included in PR #7 head `cf450206439020412d5291780fe9cd65db9449af`. The final-source revalidation run must be repeated after these additions; do not count them as passed yet.
- The earlier local isolated domain prototype suite was 6/6 PASS, but it is not the same code as the remote branch and is not used as current branch acceptance.
- Windows/native OCR, current game-client, live Discord, local OAuth/browser visual testing, and organizer publication approvals: NOT RUN / OPEN.
- This increment is not production certification.

## Append-only change log
### 2026-11-04 - implementation expansion A1: Pilot attendance and result evidence
- Added separate Pilot attendance check-in instead of Full-season registration; linked Discord identity is required.
- Added Pilot individual Damage result records with game-slot uniqueness and screenshot evidence hash.
- Pilot completion is blocked until at least one result is recorded.

### 2026-11-04 - implementation expansion A2: Full event nights and qualification
- Added stage-specific date windows and scheduled event-night records.
- Fixtures must bind to the current stage's event night and remain inside its time window.
- Stage advancement now requires a qualification report whose approval, method ID/version/hash and evidence hash match the published method.

### 2026-11-04 - implementation expansion A3: Discord operations and desktop help
- Added public format/status discovery and administrator-gated lifecycle commands.
- Added authenticated linked-player self-registration/check-in.
- Added desktop quick-help panels and keyboard-focus support.
- Added offline regression workflow for Node 22.16 and Node 24.

### 2026-11-04 - implementation expansion A4: event-window and Race side-event integrity
- Added chronological, non-overlapping stage windows for Regular Season, Postseason and Grand Finale; Pilot event timing is constrained to one evening and ordered entry/lineup deadlines.
- Added organizer-approved Full Race side-event schedule records and linked result records with positive elapsed-time and evidence requirements.
- Added tests for invalid duration/date windows, missing side-event approval and missing schedule references.

### 2026-11-04 - implementation expansion A5: frozen settings and prospective updates
- Stage start and each Full stage transition snapshot settings, version and hash.
- Event nights retain their own versioned settings snapshot.
- Prospective settings revisions are limited to selected future event nights with no fixtures; outcome method, qualification and tie-break policy remain frozen.
- Added Pilot game-count validation, shared rank for tied Damage totals, and additive normalization for older lifecycle objects.

### 2026-11-04 - initial Pilot/Full lifecycle implementation
- Added separate lifecycle module and persistence field.
- Added tests for format-specific publication, identity/roster constraints, evidence-bound outcomes, stage progression, Race side-event isolation, and legacy migration.
- No scoring weights, prize amounts, ship lists, dates or organizer approvals invented.
