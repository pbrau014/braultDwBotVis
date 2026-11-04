# Grand YOLO implementation plan and append-only amendments

**Working branch:** feature/grand-yolo-formats  
**Target:** main via draft PR #5  
**Main remains unchanged.**  
**Plan status:** implementation in progress; production remains NO-GO.

## Baseline scope
One shared tournament system supports:
- Pilot YOLO: one single-evening event stage, no season carryover.
- Full YOLO: Regular Season, Postseason and Grand Finale across an organizer-selected duration.
Shared participant identity, registration, evidence, OCR review, scoring validation, operations, corrections, audit, communication and recovery are common procedures. Format-specific lifecycle and settings remain separate.

## Implementation phases
| Phase | Scope | Current state |
|---|---|---|
| 1 | Additive data model, format enum, lifecycle stages, migration preservation | Implemented in feature branch; automated tests added |
| 2 | Registration, team membership, roster locks, withdrawal, fixture/match/game records | Implemented in model/service; tests added |
| 3 | Approved match outcome, D21 tie-break order, qualifiers and stage progression | Implemented as approval-gated model; tests added |
| 4 | Evidence registry, OCR screenshot linkage, evidence-backed forfeit/bye/race event | Implemented in model/service; tests added |
| 5 | Desktop Player/Admin format views, registration, lifecycle controls and quick help | Implemented in branch; browser visual QA not run |
| 6 | Discord event scheduling/command and permission integration | Not complete; isolated development guild and live credentials required |
| 7 | Workbook parity and scoring reconciliation | Blocked: designated canonical workbook absent from audited Library |
| 8 | DOCX/PDF/TXT/HTML/Markdown instruction set | Created and rendered; files saved to Library |
| 9 | Automated tests, CI, migration/restore and security verification | Tests added; execution evidence still pending |
| 10 | Windows/game-client/browser/Discord production gates | Not run; requires real target environment and organizer decisions |

## Non-negotiable compatibility
- Existing version-2 score state remains compatible.
- Legacy scores are not retroactively assigned to Pilot or Full.
- Existing Damage/Kills/Race/Grand Yolo score buckets are not redefined as stages.
- Exact nine-field OCR contract remains unchanged.
- Unknown or missing values remain unresolved, not zero.
- Public recovery snapshots redact Discord account identifiers, audit actors and private source evidence metadata.
- Main branch is not force-pushed or modified by this work.

## Appendments

### A1 - Competition lifecycle and migration
Added competition state as an additive state member. Tournament records carry format, status, config, stages, registrations, teams, fixtures, matches, evidence, Race side-events, awards and audit entries. Existing records are preserved without invented format assignment.

### A2 - Match outcome and advancement
Full YOLO publication requires a named approver and a published versioned method with explicit Damage/Kills weights and sum/average aggregation. Raw W/L and a single player score are not substitute outcomes. Tie-break order is head-to-head, record among tied teams, published point differential, deciding game, then authorized auditable draw. Unresolved ties block advancement.

### A3 - Stage qualification
Postseason and Grand Finale require approved, versioned and published qualifier lists after the preceding stage completes. Only published qualifiers can be assigned to stage fixtures. Full stages cannot close without resolved fixtures or evidence-backed byes.

### A4 - Evidence provenance
Game, Race side-event, forfeit and bye results reference immutable evidence metadata. Evidence records include SHA-256, byte size, media type, source filename and capture timestamp. Existing OCR battle records can be linked to the competition evidence registry. Public archives redact private Discord message/channel/account metadata.

### A5 - Registration and roster controls
Registration must close before team rosters lock and before play begins. Team rosters must be locked before fixtures. Game players must belong to the locked roster and have an active registration. Withdrawals preserve historical roster membership while preventing subsequent participation.

### A6 - Desktop help and lifecycle access
Player view displays Pilot/Full events and self-registration. Admin view creates/publishes formats, closes registration, advances stages and exposes a validated advanced operations console for teams, fixtures, evidence, matches and exceptional outcomes. Quick-help content appears on mouse hover and keyboard focus; instructions are not hover-only.

## Remaining decisions / blockers
- Exact match-outcome formula weights, aggregation and rounding must be approved by organizer; the code stores the approved method rather than inventing a default.
- Season qualification criteria, team sizes, roster/substitute rules and bracket structure must be published.
- Dates, duration, timezone, ship/map/mode allowlist, special armor-mode availability, forfeit/no-show/bye/appeal rules and awards remain organizer-controlled.
- Canonical scoring workbook and Score Reporter HTML were not present in the audited Library. No workbook formulas are changed.
- Live Discord scheduled events/commands/channel settings are not changed without a tested development-guild authorization and verified configuration.
- Windows/native Tesseract, current screenshot acceptance, browser/OAuth visual upload, and final restore gates remain external.

## Verification ledger
- Branch comparison: feature branch is 38 commits ahead of main and 0 behind at the last comparison; main was not changed.
- Pull request: #5, draft, target main.
- Automated Node test suite: NOT RUN in this execution; GitHub workflow/status query returned no associated runs or checks for the tested commit at that time.
- DOCX: rendered to four PNG pages and all pages visually inspected.
- PDF: rendered to three PNG pages and all pages visually inspected.
- Library: grandYoloInstruct DOCX, PDF, TXT, HTML and Markdown uploaded successfully.
- Windows/game-client/browser/Discord live gates: NOT RUN.

## Change control
Append future findings here with sequential amendment IDs. Every code change should add/update tests, update this plan and instruction manual where relevant, and distinguish attempted, completed, tested, verified and accepted. Do not mark production ready until all applicable release gates have evidence.

### A7 - Publication schedule and freeze enforcement
Pilot and Full publication now require valid start/end timestamps and a configured timezone; Full additionally requires organizer-selected season duration. Registration must close before stage activation and team roster locks. Both the desktop settings endpoint and Discord !yolo setting command now consult active competition stages and block legacy global scoring-setting changes while the freeze is in force. Evidence metadata is validated and can be linked from existing OCR screenshot records.

### A8 - Event-night scheduling and Discord registration
Added event-night records and requires each Full YOLO fixture to belong to a scheduled event night in the same stage. Discord now has read-only format discovery and linked-player registration commands. Admin lifecycle actions remain server-authorized through the desktop service; live Discord scheduled-event publication and production permission testing remain unrun.

### A9 - Pilot individual results
Added tournament-scoped Pilot Damage result records with active-registration checks, unique player/game slots, exact non-negative values and original screenshot evidence references. Pilot placement standings aggregate Damage per registered player and Pilot stage closure now requires at least one recorded result. Existing global workbook score buckets remain separate.
