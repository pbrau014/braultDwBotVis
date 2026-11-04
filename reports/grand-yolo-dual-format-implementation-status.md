# Grand YOLO Dual-Format Implementation Status

Date: 2026-11-04  
Branch: feature/grand-yolo-dual-format  
Pull request: https://github.com/pbrau014/braultDwBotVis/pull/11 (draft; not merged)  
Base: main at 3659d4701631f707f9e34d3818b11e1aa9a5ddc3

## Implemented in the feature branch

- New lifecycle domain module for Pilot and Full formats, stage order, registration, weekly event-night rosters, teams, fixtures, matches, match outcomes, bracket progression, Race side-events, approvals and awards.
- Additive lifecycle state in the existing tournament normalization path. Legacy v2 players, score buckets, battle records, OCR submissions/corrections and account links are retained; no legacy record is assigned a format.
- Private archive export/import preserves lifecycle records. Public archive deliberately omits lifecycle data to avoid exposing private participant/roster identifiers.
- Tournament-scoped score ledger prevents Pilot and Full scoring from silently entering the legacy global score buckets. Scoped standings are derived using the existing scoring engine.
- Race elapsed seconds are preserved as evidence and transformed to inverse-seconds for the Race ranking metric; shorter elapsed time ranks better. Race side-events are separate and have zero ordinary match-score contribution by default.
- Admin-only service operations and CSRF-protected desktop API routes for lifecycle management, including stored approval records and scope checks for match outcomes, bracket advancement and awards.
- Player/Admin UI format summaries and accessible quick notes (hover and keyboard focus); Admin lifecycle forms; evidence mapping to a selected tournament/event night; Player sees only registered tournament summaries.
- Prize-value display is labeled Not published; no unapproved historical dollar conversion is presented as an award value.
- Regression tests authored for lifecycle domain, migration, service operations, approvals, scoped score mapping, Race ranking, weekly roster changes and UI/API contracts.

## Documentation artifacts

The complete guide is generated locally as:
- grandYoloInstruct.md
- grandYoloInstruct.txt
- grandYoloInstruct.html
- grandYoloInstruct.docx
- grandYoloInstruct.pdf

DOCX and PDF were rendered to page images after layout correction. Current output: 7 pages. Page contact sheets were visually reviewed. A manifest with byte sizes and SHA-256 hashes is generated locally.

## Verification evidence and limitations

| Check | Status | Evidence |
|---|---|---|
| Feature branch and draft PR | <strong>Created</strong> | PR #11, not merged |
| Local copied-domain subset | <strong>7/7 passed (earlier prototype only)</strong> | Not the current complete branch snapshot; do not treat as release evidence |
| Current branch full npm test | <strong>NOT RUN</strong> | Full repository checkout/runtime not available in this session |
| Current branch desktop test suite | <strong>NOT RUN</strong> | Test files authored; no execution result |
| GitHub Actions | <strong>OPEN</strong> | No workflow runs/status checks returned for PR head |
| Windows/native Tesseract acceptance | <strong>OPEN</strong> | Requires user Windows runtime and source screenshot corpus |
| Browser OAuth, upload and visual review | <strong>OPEN</strong> | Requires local desktop environment |
| Isolated development-guild Discord smoke | <strong>OPEN</strong> | No live Discord test performed |
| Workbook parity | <strong>BLOCKED</strong> | Designated canonical v3.22 workbook absent from audited Library; historical workbook candidates are not interchangeable |
| Organizer policy approval | <strong>OPEN</strong> | Event dates, rosters, ship list, exact mode label, D21 formula, tie-break details and awards are unapproved |
| Production release | <strong>NO-GO</strong> | All required gates must pass and be reviewed |

## Important open risks

1. The new service/domain/UI integration has not been executed as a full repository test run. Syntax and runtime defects may remain.
2. Existing workbook formula behavior and D21 policy have not been reconciled to a canonical workbook or signed organizer approval.
3. Event-night roster sizes, weekly schedule, ship restrictions, special mode label, awards and dates must be ratified before public event configuration.
4. Full season standings are cumulative by the new ledger, while team match advancement requires the approved method record; those are intentionally distinct.
5. The existing global legacy scorebook remains available for old records. New event scoring must select a tournament and event night to enter the scoped ledger.
6. No changes were made to main, no live Discord commands were enabled, and no live event was run.

## Next required work

1. Obtain a full checkout of the PR branch in a Node 22.16+ environment and run npm test, npm run test:desktop, OCR regression, SQLite/persistence and static UI checks.
2. Correct all failures and rerun until green.
3. Add integration tests for format-scoped screenshot mapping, event-night roster rotation, stage completion/advancement, approval-scope checks, archive privacy and public standings.
4. Verify Player/Admin browser rendering, keyboard accessibility, CSRF, identity isolation and evidence upload on Windows.
5. Run native Tesseract and the complete screenshot acceptance corpus without weakening the nine-field exact-value contract.
6. Verify the canonical workbook and reconcile formula behavior. Do not edit a historical substitute.
7. Obtain organizer approval for the outstanding policy settings and publish the approved event/season configuration.
8. Close all environment gates before production approval. Keep PR #11 draft until then.
