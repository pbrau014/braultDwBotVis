# Grand YOLO Dual-Format Tournament System — Design

Date: 2026-11-04
Status: implementation design, organizer values intentionally unresolved

## Intent
Extend the existing DWBOT tournament domain so one system supports two clearly distinct event formats: **Pilot YOLO**, a smaller single-evening event, and **Full YOLO**, a multi-week/month season with regular season, postseason, and a Grand YOLO tournament finale. Both formats share participant, evidence, scoring, communication, and administration workflows. Format-specific lifecycle and policy settings remain explicit.

## Goals
- Preserve existing four scoring categories and seven game slots per player.
- Add typed format/lifecycle entities without silently reclassifying legacy records.
- Keep scoring categories separate from event stages and match outcomes.
- Distinguish Race time metric, Race side-event, and Big Race map; distinguish Grand YOLO score category and Grand YOLO Finale.
- Enforce valid lifecycle transitions and auditable configuration freezes.
- Provide accessible contextual help on desktop (hover and keyboard focus; help must not be hover-only).
- Produce comprehensive instruction set as Markdown, DOCX, PDF, TXT and HTML.
- Keep OCR exact-value validation unchanged.

## Non-goals
- Do not replace existing score formulas or infer a new prize formula.
- Do not assume event dates, awards, ship allowlists, player/side sizes, exact mode names, or organizer approvals.
- Do not merge into main or activate live Discord commands as part of this feature branch.
- Do not migrate legacy scores into Pilot or Full without explicit source mapping.

## Governing model
A tournament instance has format pilot or full. Shared entities: Participant, Registration, Evidence, ScoringCategory, Game, AuditEvent, Award. Full-only entities: Season, Stage (regular_season, postseason, grand_finale), EventNight, Team, RosterAssignment, Fixture, Match, MatchOutcome, BracketProgression, RaceSideEvent. Pilot has a single event lifecycle and no Season. Format is immutable after the first result is accepted.

Pilot defaults: one evening; no season carryover unless organizers explicitly enable a separately recorded bridge; individual Damage determines placement only where the approved event publication says so; team match W/L is not inferred from individual Damage. Full defaults: multi-week/month Season, regular season, postseason, Grand YOLO Finale. Match advancement uses the approved D21 aggregate/rounding/tie-break method only after exact formula is ratified and recorded.

## Legacy compatibility
Version-2 tournament JSON remains readable. Existing players, settings, battleRecords, OCR submissions/corrections, imported IDs, and four event buckets are preserved semantically unchanged. New lifecycle collections default empty. Legacy entries receive legacyUnassigned provenance; no implicit format or season assignment.

## Scoring semantics
The existing keys damage, kills, race, grand remain scoring categories. Race-time scoring is positive elapsed seconds and lower is better where approved; a Race side-event is a separate Full-season record and cannot silently add to ordinary match score. grand remains a score category; grand_finale is a stage. D21 advancement is not dblns alone. Missing/blank values are invalid, not zero. Settings freeze at event start; changes apply prospectively only, with emergency changes fully audited.

## Security and operations
Existing trusted Node service and Discord authorization remain authoritative. Player data isolation, admin authorization, CSRF/origin controls, rate limits, and audit logging remain intact. Public channel behavior is not broadened. Do not expose secrets. Real OAuth, Discord, Windows and browser gates require environment evidence.

## UI/help
Player and Admin views present active format, lifecycle status, next action, and relevant instructions. Quick notes use accessible descriptions and focusable help controls; CSS hover and focus-within reveal notes, and text remains available to keyboard and assistive-technology users. Essential instructions are never hover-only.

## Organizer-controlled fields (blocking publication, not software development)
Event dates/times, side roster size and human/bot split, ship allowlist/bans, exact special-mode client label, maps, awards/prizes, scoring publication, bracket/bye/forfeit policy, approvals/signatures, and recurrence calendar. Display as Not yet approved until entered by an authorized organizer.

## Acceptance
- New-format model validation, lifecycle transitions and invalid transition rejection.
- Pilot isolation from Full seasons and vice versa.
- Full regular season → postseason → Grand Finale progression, with D21 formula configured/ratified before advancement.
- Legacy v2 import/export retains existing OCR/scoring fields and creates no invented format assignments.
- Race time/side-event/map and Grand score/finale remain distinct.
- Event-start freeze and prospective settings change audit.
- Accessible help supports hover, keyboard focus, and visible fallback.
- Existing tests and OCR strict nine-field contract remain unchanged.
- Documentation formats are mutually consistent and visually verified.
