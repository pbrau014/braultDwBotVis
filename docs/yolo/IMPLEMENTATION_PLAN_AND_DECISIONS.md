# YOLO format implementation plan and append-only decisions

Updated: 2026-11-04
Status: Phase 1 domain model and persistence integration implemented on feature/grand-yolo-format-lifecycle; verification pending CI.

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

## Appendment A - safety and provenance
- Match outcomes cannot be derived from raw individual totals by this module. The organizer must publish a scoring method ID, version and SHA-256 hash; a completed fixture must reference that exact method and evidence.
- Tie-break order is recorded as head-to-head, tied-team record, predeclared metric/point differential, extra game if published, then auditable random draw only if expressly authorized. A future ranking/advancement service must implement and test the actual published rules; this module does not invent scoring weights.
- Race side-event values are separate from match outcomes. Positive elapsed seconds are stored with reciprocal normalized metric; invalid zero/negative times are rejected.
- Existing Tesseract/OCR nine-field validation and workbook formulas are unchanged.
- Registration's `identityVerified` input is a domain assertion, not proof by itself. Any production route must derive it server-side from the authenticated Discord session and the existing roster-account link; never trust a browser-supplied boolean.
- Existing historical workbook source is not proven canonical. Workbook formula changes remain blocked pending canonical asset identification and approval.

## Remaining plan
### Phase 2 - service and UI integration
- Add authenticated organizer APIs for tournament creation, publication, registration, team assignment, roster lock, fixture/game administration, stage transition and audit views.
- Enforce administrator/referee permissions server-side; participant operations must resolve the caller's authenticated Discord ID to the linked roster entry.
- Add Pilot/Full format selection and contextual help in desktop UI. Tips must work on hover and keyboard focus; critical instructions must remain visible.
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
- Local isolated domain suite: 6/6 PASS on the earlier implementation prototype (not the exact remote branch source).
- Remote branch CI/status for the current integration: not yet reported.
- Windows/native OCR, current game-client, live Discord, local OAuth/browser visual testing, and organizer publication approvals: NOT RUN / OPEN.
- This increment is not production certification.

## Append-only change log
### 2026-11-04 - initial Pilot/Full lifecycle implementation
- Added separate lifecycle module and persistence field.
- Added tests for format-specific publication, identity/roster constraints, evidence-bound outcomes, stage progression, Race side-event isolation, and legacy migration.
- No scoring weights, prize amounts, ship lists, dates or organizer approvals invented.
