# Zero Through Six — Consolidated Project Plan and Evidence Record

**Purpose:** A condensed, dependency-aware synthesis of the supplied project instructions and `plan1.txt` history. This is a planning and reference document, not evidence that the underlying bot, OCR pipeline, interfaces, integrations, or tests have been implemented in this session.

**Source reviewed:** `Pasted text.txt` (3,422 lines; 276,130 bytes). It contains the orchestration command, the inlined contents of `1.txt`–`6.txt`, `addedImgProcess.txt`, and a substantial `plan1.txt` with dated implementation notes, test results, archives, hashes, and resumption addenda.

**Review boundary:** The supplied attachment is a text consolidation. The ZIPs, source archives, HTML implementation files, live Discord environment, Git working copy, and test artefacts mentioned inside it were not attached as separate inspectable project artefacts in this review. Their existence and status are therefore reported only as the text describes them. No project code, Discord resource, plugin connection, deployment, source archive, or master project file was changed.

---

## 1. Project identity and intended outcome

The main project is a **World of Warships tournament-management Discord bot** with screenshot-based score recognition, tournament scoring and persistence, and planned Player and Admin HTML interfaces. Its current technical focus is improving OCR reliability without breaking the existing bot, workbook, scoring rules, data contracts, Discord workflows, or release history.

The intended end state is a locally deployable, Windows-compatible tournament system that:

1. Receives participant screenshots through Discord and/or the Player HTML workflow.
2. Extracts a defined set of battle-result fields with reliable local OCR and computer vision.
3. Rejects uncertain or conflicting critical values rather than silently accepting plausible but wrong data.
4. Preserves the bot as the authoritative source for tournament data, calculations, permissions, and score validation.
5. Provides a Player interface for permitted participant actions and an Admin interface for authorized tournament management.
6. Retains existing Discord commands, player/event mapping, scoring, workbook, SQLite/JSON persistence and recovery behaviour.
7. Is supported by repeatable evidence, a clear master plan, a versioned and integrity-checked project archive, developer comments, and one validated end-user PDF manual.

### Governing statement — verbatim

> **Do not weaken exact-match acceptance or change the approved ground truth simply to obtain passing tests.**

This rule governs planning, coding, OCR selection, testing, data corrections, documentation, packaging, and release decisions. Preserve approved fixtures, ground-truth values, expected outputs, schemas, scoring rules, and exact-match tests. Correct defects in code or test setup; change approved ground truth only through an authorized, evidence-based change with documented rationale, approval, and downstream impact.

### Non-negotiable project constraints

- **Local-first / offline:** Continue using OpenCV and a local OCR architecture. Ordinary processing must not require an external API or network access. Do not transmit screenshots, private Discord content, credentials, or unrelated data externally by default.
- **PaddleOCR and OpenCV:** The project instruction explicitly says to keep PaddleOCR and OpenCV local. However, later reported benchmark evidence says the tested PaddleOCR hybrid regressed against Tesseract-only. Preserve PaddleOCR as a locally runnable, optional/feature-flagged engine until a fair same-input benchmark demonstrates a benefit; do not turn it on by preference alone. Keep OpenCV crop analysis in scope.
- **Evidence before claims:** Code existence, a command attempt, source inspection, archive integrity, mocked results, and historical test reports do not independently prove live behaviour or current-source acceptance.
- **Preserve history:** Work in a separate working copy/branch. Keep original ZIPs, source, workbook, fixtures, reports, hashes and failed-run evidence unchanged. Never relabel an old result as proof for a different source fingerprint or runtime.
- **Security:** Use authorized Discord applications, accounts, servers and permissions. Keep tokens in environment variables or approved secret storage; never paste secrets into chat or commit them. Do not bypass authentication, authorization, rate limits, or security controls.
- **No unauthorized cost or deployment:** Railway hosting, paid resources, production deployments, repository changes, and external API usage require the applicable explicit authorization.
- **Human review:** An uncertain mandatory field must remain unresolved and enter correction/review; never guess identity or a critical score from a nearest plausible candidate.

### Source-of-truth hierarchy

1. Approved ground truth, schemas, specifications, and exact-match acceptance criteria.
2. Verified current source code and actual test evidence tied to its exact source/runtime/model fingerprint.
3. Current `plan1.txt` master implementation plan and current project reports/decisions.
4. Historical plans, reports, archives, conversation records, and previous claims as context—not as proof of present state.

When two documents conflict, use the newest **verified and authorized** requirement, not merely the newest timestamp or filename. Preserve conflicting historical records and explain the resolution; never silently rewrite them.

---

## 2. Overall execution control: six plans, fixed order, verified gates

The wrapper command treats `1.txt` through `6.txt` as a coordinated sequence. Review all six in advance for dependencies, but execute them in this exact order:

| Order | File | Main workstream |
|---:|---|---|
| 1 | `1.txt` | Connect/check project-support apps |
| 2 | `2.txt` | Reconcile project state, update master plan, build authoritative archive |
| 3 | `3.txt` | Establish and execute live Discord integration tests |
| 4 | `4.txt` | Plan, implement, integrate and test Player/Admin HTML interfaces |
| 5 | `5.txt` | Add useful code comments and produce the user manual PDF |
| 6 | `6.txt` | Enforce developer/user documentation separation and complete the final manual/documentation pass |

### Completion-gate rule

Complete and verify the current file before moving to the next whenever possible. The gate covers implementation, tests, acceptance criteria, deliverables, documentation, dependencies and an accurate remaining-work record. A test is not complete merely because it was prepared or attempted.

### Temporary bypass of a blocked step

Independent work in the next file may proceed only when **all** of these are true:

1. The blocker is genuine and cannot reasonably be resolved with available tools/resources.
2. All current-file work independent of the blocker is implemented and verified.
3. The exact blocked instruction, reason, consequences and resolution are recorded.
4. The next-file work is genuinely independent of the blocked work and its unverified outputs.
5. Advancement is safe for security, data integrity, ground truth, exact-match acceptance and project consistency.
6. The blocked item retains an honest status (`BLOCKED`, `PARTIALLY VERIFIED`, etc.), never `VERIFIED COMPLETE`.
7. Downstream dependencies remain tracked and blocked until prerequisites pass.

Do **not** advance through a mandatory dependency, missing authorization, unresolved material requirements conflict, or unverified output. A bypass only allows independent work; it never waives the original acceptance condition. Revisit the original blocker as soon as evidence/resources become available, complete and verify it, then revalidate affected later work.

### Required blocker record

For every blocker record: file and exact step; status; specific cause; work completed and verified; remaining work; exact resolution needed; downstream dependencies; whether independent advancement is safe and why; and required retests after resolution.

### Required progress report after each file

Record: (1) file/scope, (2) changes and deliverables, (3) actual tests and outcomes, (4) acceptance status, (5) outstanding work, (6) blockers/resolutions/dependencies, (7) gate or permitted bypass decision, and (8) next file plus prerequisites.

Use statuses consistently:

`NOT STARTED` · `IN PROGRESS` · `IMPLEMENTED BUT UNVERIFIED` · `PARTIALLY VERIFIED` · `VERIFIED COMPLETE` · `BLOCKED` · `FAILED` · `NOT RUN`.

For OCR/live tests, also distinguish `PASS`, `FAIL`, `PARTIALLY VERIFIED`, `SIMULATED PASS`, `BLOCKED`, and `NOT RUN`. `PASS` means all specified criteria actually ran and passed; mocked tests must never be reported as live Discord success.

### Final project gate

Do not call the project complete or production-ready while mandatory work is blocked, acceptance criteria remain unverified, or required deliverables are missing. Final validation must confirm all six files were processed in order, all independent work was handled, bypassed work was revisited, earlier/later deliverables remain compatible, exact-match ground truth stayed intact, and the remaining state is documented.

> **Sequencing note:** The wrapper's “Final Validation After `5.txt`” heading conflicts with its requirement to process six files. Final validation must logically occur after `6.txt`. The sequence itself remains 1 → 6.

---

## 3. Plan 1 — Connect the support applications

**Objective:** Check availability and actual connection state, then initiate installation/connection for the five requested apps in order. A prompt or suggestion is not an installation; verify the resulting state.

| Priority | App | Intended project use | Constraints / verification |
|---:|---|---|---|
| 1 | **GitHub** | Private source repository, source inspection, version history, diffs, issues/PRs, CI troubleshooting and traceable changes. | Request minimum required permissions; do not create, publish, alter or delete repositories without authorization. |
| 2 | **Superpowers** | Structured implementation planning, TDD, debugging, regression prevention and acceptance-criteria review. | Must reinforce—not override—approved specs, exact match and ground truth. |
| 3 | **Linear** | Phase/task tracking, priorities, dependencies, blockers, Windows tests, defects and verification status. | Supplement the authoritative `plan1.txt`; avoid duplicate/conflicting tracking systems. |
| 4 | **Railway** | Optional persistent hosted bot test, logs, restart/recovery and live integration diagnostics. | Not a prerequisite for unrelated work. No deployment, paid resources or charges without explicit approval. Review SQLite/local-file persistence and volume needs first. It does not replace Windows, Discord authorization, channel permission or attachment tests. |
| 5 | **Adobe Acrobat** | PDF inspection, page organization, conversion/OCR where useful, and final manual preparation. | Does not replace programmatic PDF validation or actual internal-link testing. |

For every app report: availability, existing connection, whether installation was initiated, actual connected/ready state, sign-in/authorization/subscription needs, permissions, setup, limitations, optional costs, and precise next user action. Continue with other apps if one is blocked. Do not alter bot/project files, deploy the bot, or begin unrelated implementation during this setup phase.

The governing source-of-truth records must remain: approved ground truth and criteria; verified code and test evidence; current `plan1.txt`; current reports/decisions; historical plans and archives as supporting context. Plugins must not displace those records.

---

## 4. Plan 2 — Reconcile status, update `plan1.txt`, and create the project archive

**Objective:** Inventory all available source, plans, deliverables, reports, test evidence, Windows outputs and relevant conversation context; reconstruct the actual current project state; reconcile conflicts; request only missing external test evidence; update `plan1.txt`; and produce one downloadable, integrity-checked ZIP for future continuation.

### Required inventory and reconciliation

Review, where actually available:

- Current `plan1.txt`, older plan versions, roadmaps, progress reports, reviews and decisions.
- Bot source, HTML, configuration, scripts, JSON/Markdown/text docs and supporting assets.
- Latest and prior bot ZIPs, app packages and downloadable deliverables.
- Tests, fixtures, approved ground truth, expected values, exact-match criteria, test logs/JSON, screenshots and report hashes.
- Windows-generated logs/screenshots/results and prior relevant conversation decisions/corrections/questions.

Create an inventory with each artefact's purpose, version/date when known, and state (`current`, `superseded`, `duplicate`, `incomplete`, or `required`). Compare versions; identify newest **verified** content; preserve history where relevant; do not choose by timestamp alone.

Reconstruct: current approved phase/step; last verified completion; implemented-but-unverified work; passing/failed tests with evidence; incomplete work; blocked work and causes; prerequisites; next executable action; and superseded or inconsistent recommendations. Separate reported completion from verified completion.

Resolve conflicts only when evidence or authorization supports it. Identify duplicated/outdated requirements, missing dependencies, acceptance gaps, corrections and unresolved decisions. Preserve phase order and approved requirements unless a documented, evidence-based or authorized change is necessary.

### Windows verification review

For each test, establish whether Windows is required, prerequisites, exact commands/procedure, expected result and governing criteria, evidence location, sufficiency, and missing logs/results. Review at least:

1. Authorized live Discord login/connection.
2. Channel permissions and Admin-versus-Participant authorization.
3. Attachment delivery and screenshot processing.
4. Discord API rate limits/recovery.
5. Bot stop/start and restart recovery.
6. Windows installation, dependencies, launch, file access and operations.
7. Player/Admin HTML integration.
8. Exact-match OCR against approved ground truth.
9. ZIP packaging/distribution.
10. Any additional Windows-specific gates in the active plan.

Do not ask the user to repeat a test when valid evidence exists. When a Windows run is required from the user's machine, provide one consolidated list of missing results with exact steps and expected outputs. Execute independent tests available in the current environment, but label environment-specific results correctly; Linux or mocked tests do not prove Windows/live behavior.

### Required report and master-plan changes

Create a Markdown/text project review report with:
A. Executive summary; B. exact current phase/step and last verified point; C. completed work and evidence; D. incomplete/unverified items; E. blockers/dependencies/user actions; F. conflicts/corrections; G. dependency-aware ordered roadmap; H. ground-truth and acceptance integrity.

Update `plan1.txt` without removing applicable approved phases or criteria. It must show current status, completion states, corrections, prerequisites, dependencies, outstanding Windows tests/evidence, next action and completion criteria for each major remaining step. Include the verbatim governing statement in a section titled **Governing Statement — Exact-Match Acceptance and Approved Ground Truth** and repeat it in the archive context summary.

### Authoritative archive requirements

Create one well-structured ZIP containing the latest verified bot source package, updated `plan1.txt`, relevant project files, test results/reports, prior deliverables and a structured project/conversation context summary. Preserve historical material but label it historical; include an inventory/manifest, checksums, and a concise `read me.txt` or equivalent handoff guide. Exclude secrets, `.env`, `node_modules`, private runtime databases/data and obsolete/unnecessary files unless a documented requirement says otherwise. Verify ZIP integrity and all manifest hashes after fresh extraction. Record the ZIP's SHA-256 in a detached checksum file and active plan (do not attempt to embed the final ZIP hash within that same ZIP, which would be self-referential).

The archive is authoritative only after required gates and integrity checks pass. Otherwise label it `CANDIDATE` / `BLOCKED`, not authoritative. Do not overstate missing evidence.

**Source-text gap:** The supplied `2.txt` ends abruptly during item 9 of the master-plan update requirements (`“Reference the supporting reports, test evidence,”`); the remainder is absent before `3.txt` begins. Its missing tail cannot be reconstructed from the supplied text and is not invented here. It also says “four attached files,” while the wrapper specifies six implementation files; follow the wrapper's six-file sequence and record the discrepancy.

---

## 5. Plan 3 — Enable and execute live Discord integration tests

**Objective:** Inspect the real environment and existing bot, establish a safe authorized test setup, implement only necessary testing infrastructure, execute as many real tests as possible, correct defects, retest and issue an evidence-based report.

### Environment discovery

Inspect the source, language/Discord library and versions, dependencies, ability to run persistent processes, outbound Discord connectivity, available secure credentials/configuration, test application/server/channels/users/roles, available browser/Discord interaction inspection, and start/stop/restart/monitor tools. Distinguish currently available, install/configurable, and external/user-action capabilities. Do not assume access to accounts, credentials, desktop UI, or always-on runtime.

A Discord desktop client is not necessarily required for bot/API-level testing. If it is unavailable, test through the authorized API/runtime where possible. Do not expose credentials in chat, code, logs, reports or deliverables. Use isolated test server/bot/channels and synthetic data; prefer the existing designated test environment. Never test production tournament data without explicit authorization.

### Five live test categories and acceptance criteria

| Test | Procedure / scope | PASS requirement |
|---|---|---|
| **1. Authorized login/connection** | Inspect initialization/config; verify secure credentials and intended test app; start bot; observe authentication, ready state, server identity/access, disconnect/error handling and secret-free logs. | Actual authorized Discord connection and expected bot identity/state confirmed. Config inspection or mock is not live PASS. |
| **2. Channel/role permissions** | Inspect permission model; identify channels/roles/commands/app perms; test permitted Admin and Participant actions; deny participant admin operations and actions in unauthorized channels; verify understandable errors; record configuration and operations. | Actual allowed and denied operations validated against Discord permissions **and** application authorization. Source inspection alone is insufficient. |
| **3. Attachment delivery/processing** | Submit harmless test image in dedicated test channel; verify Discord message/event and attachment access; execute actual screenshot OCR/score pipeline; verify response, validation and resulting test data; test unsupported, unreadable, invalid and inaccessible files; prevent duplicate/partial submissions. | Real Discord attachment is delivered and intended processing is verified. Report transport and OCR/score processing separately; upload alone is not a complete pass. |
| **4. API rate limits** | Inspect request patterns/library retries; use supported bounded test or mocks; validate retry-after behaviour, bounded delay, no loops, duplicates, data corruption or runaway tasks; confirm normal recovery. | Live PASS only for relevant behaviour actually observed against Discord. Mock-only is `SIMULATED PASS` / `PARTIALLY VERIFIED`. Never intentionally flood Discord or trigger global limits. |
| **5. Restart/recovery** | Record baseline state and perform harmless test command; stop cleanly; restart normally; verify reconnection/readiness and same operation; check persistent data, duplicate handlers/messages, lost updates, scheduled tasks/workers and optional reconnect recovery. | Real stop/restart cycle plus connection, baseline operations and persistent data verified. Startup alone is not a restart pass. |

### Testing infrastructure, retest and outputs

Add only needed support: test config separate from production; diagnostics for auth, connection, permission, attachments, rate limits and recovery; local unit tests; safe live integration scripts; start/stop procedure; expected-outcome assertions; cleanup; and an honest report format. Reuse project patterns; avoid a large framework or production behaviour changes.

Run environment/config checks, then login, permissions, attachments, rate-limit behaviour, restart/recovery. For each failure capture safe evidence, distinguish environment/config/external/test setup/application defect, fix only what is justified, rerun and report observed results. Continue independent tests if one is blocked.

Report each test's environment, live/local/simulated type, preconditions/permissions, action, expected and actual result, evidence, status, corrections/retests, limitations and next steps. Final deliverables: updated source if justified; repeatable scripts/configuration; current-environment and Windows instructions; five-category report; modified-file list; status list; exact external steps still required. Do not claim live success from compilation, mocks, API reachability alone or no visible error.

---

## 6. Plan 4 — Add Player and Admin HTML interfaces as a new final plan phase

**Planning constraint:** Initially preserve all existing implementation phases, order and details. Add one new web-interface phase only at the end of the existing plan and update `plan1.txt`. Plan the architecture first; do not build either interface until the phase is documented and dependencies/feasibility are reviewed.

### Starting HTML assets and design decision

The source instructions refer to these files in `implementation.zip`:

- `score_report_imgToDiscord.html`
- `yolo_tournament_scoreCalculator.html`
- `score_report_imgDiscord.html` (named as the image-upload basis; note this differs slightly from the first filename)

Use the image-report HTML as the basis for a Player screenshot-submission option and the score-calculator HTML as the main Player tournament/scoring display and manual-entry starting point, subject to actual asset inspection.

### First evaluate a no-backend workflow

Before building a backend, investigate the proposed alternatives:

1. Can browser-side processing recognize a screenshot? If yes, request an image and process it locally; if not, provide manual score entry and optional image attachment.
2. Can a button generate a JSON file that the user saves to the Desktop and then manually sends to the bot in a Discord message? This is a user-mediated file handoff, not automatic browser-to-bot delivery.
3. Can a browser upload send the screenshot to Discord directly without a backend, using a supported, secure and authorized mechanism?

Do not assume a standalone local HTML file can access private bot data, Discord bot credentials, backend score processing, or live updates. If no secure, appropriate no-backend workaround exists, explain the options and pause for the user's choice **before implementing an unwanted backend or packaging an architecture change**. Never put privileged bot tokens in browser code. The user's desired workflow includes putting the Player HTML file on the local Desktop; if a local server/service is required, either find a safe workaround or clearly provide the required launch mechanism and setup rather than claiming the HTML file alone is enough.

### Player Interface requirements

- Single-page standalone HTML, vanilla CSS/JS where practical; additional technologies only when required for secure integration/compatibility. Evaluate SQLite/lightweight storage only if justified. Keep lightweight, portable and compatible; package required support files.
- Provide regular participant bot operations/features/slash-command equivalents under the same participant permissions/restrictions.
- Show tournament information, permitted participant list/scores/averages and totals consistent with authoritative bot calculations.
- Include **Update Scores** to retrieve latest available authoritative data; never label stale data current or claim real-time sync without implementing it.
- Allow the participant to submit their own screenshot; send it through the bot's existing image-processing workflow where supported.
- Show upload, processing, success, validation and failure feedback.
- Enforce existing participant authorization and score-submission rules. Do not invent a second source of tournament scores.
- Review every supported participant operation, display/calculation accuracy, upload/transfer/OCR/submission, usability, accessibility, responsiveness and error handling before proceeding to Admin.

### Admin Interface requirements

Only after Player implementation and review, create a separate Admin version by copying the completed Player UI as the base. Retain shared visual design and applicable features. Clearly label both.

Admin must view/manage every participant's scores; manually enter/update all score fields for any participant without requiring screenshots; review tournament data/scores/averages/totals; and perform all bot-supported administrative operations. Reuse the bot's authoritative calculation/validation logic. Enforce Admin authentication/authorization securely—hiding UI controls is not security—and prevent ordinary participants from accessing Admin functions or modifying others' data. Include validation, confirmation, success and error feedback. If secure Admin permissions require a backend and no appropriate workaround exists, pause and offer options rather than silently implementing an unapproved backend.

### Integration, tests, packaging and plan update

Reuse bot logic; preserve Discord functionality; implement only necessary communication, authn/authz, data retrieval and submission. Do not expose tokens, secrets or privileged functions in client code. Identify configuration, startup and operational dependencies.

Test Player and Admin separately and together: all supported actions; Discord equivalence; tournament data/scores/averages/totals; Update Scores; screenshot transfer/processing; manual Admin scoring; screenshot optionality for Admin; auth/permissions and denied actions; error cases; consistent cross-interface data; refresh after writes; regression of existing Discord commands; and Desktop/local launch procedure.

Package both interfaces and all required components with the bot. Provide setup, config, launch, use and troubleshooting instructions. Add a bot command to download the Player interface and associated instructions as a usable package if supporting files are needed; assess whether Admin requires a separate authorized distribution mechanism. Update `plan1.txt` only after work/testing/packaging, preserving earlier phase order and placing web work at the end. Expected deliverables: original plan + appended phase, updated `plan1.txt`, functional Player and Admin UIs, approved integration components/workaround, bot download command, distribution mechanism as needed, package, instructions and truthful test record.

---

## 7. Plan 5 — Add developer comments and produce the first user manual PDF

**Objective:** Document actual bot and HTML-interface behaviour for users, while adding useful code comments for maintainers. Inspect the implementation first; do not invent commands, controls, features, permissions or workflows.

### Source review and code comments

Inspect actual source, Discord commands, Player/Admin interface controls, roles, auth, data flows, score calculations, screenshot handling, backend/storage, setup, configuration, download/launch path and common failures. Identify differences between Discord and HTML workflows.

Add accurate, appropriately placed comments explaining important modules/functions/components; bot/interface relationships; input reception, validation, processing and responses; scores/averages/totals; screenshot OCR; Admin manual entry; authn/authz/roles; commands/UI/backend/storage interactions; configuration, dependencies, limitations and non-obvious design decisions. Avoid comments that merely restate code, unrelated refactoring, behaviour changes, secrets, or lengthy end-user tutorials. Recheck syntax/functionality.

### Required user-manual contents — five chapters, in this exact order

1. **General Overview — HTML and Discord Usage and Purpose:** purpose of the bot, Discord, Player UI and Admin UI; role differences; how the channels/interfaces relate; supported features; score display and submission; prerequisites; download/setup/launch; limitations and common troubleshooting; example of choosing an interface.
2. **How-to Instructions — Admin Use of the HTML Interface:** access/authentication; tournament/player view; scores/averages/totals; manual entry/update for any participant; tournament operations; refresh/verification; validation, confirmations/errors, optional image flow and Admin-only restrictions. Include realistic labelled example values and actual-control sketches.
3. **How-to Instructions — Player Participant Use of the HTML Interface:** obtain/download; Desktop placement if required; setup/auth/connect; permitted views, scores, averages and totals; refresh; upload screenshot, process/submit, confirm; validation, restrictions and errors. Clarify required service/network/bot dependencies; participants only edit authorized information.
4. **How-to Instructions — Admin Use of Discord:** actual admin slash commands/options/arguments; server/channel navigation; view/manage all permitted data; update scores and tournament operations; totals; confirmations/errors; permission boundaries; troubleshooting. Only verified syntax; examples labelled; sketches as useful.
5. **How-to Instructions — Player Participant Use of Discord:** actual participant commands/options; server/channel/bot access; permitted views; screenshot submission and confirmation; score-validation/restrictions; admin-only actions; troubleshooting. Do not imply participant privileges.

Explain each procedure in user-friendly steps: purpose, permitted role, prerequisites, where to navigate/click/type/select/upload, expected result, success check and failure resolution. Use examples where useful and distinguish illustrative values/responses from live tournament data. Where Discord and HTML perform the same action, compare the paths.

### Sketches

Include small, consistent, hand-drawn-style sketches only where useful and based on real controls. Examples: Discord slash-command discovery/argument flow; HTML button; screenshot selection/submission; Admin manual score entry; refresh/totals; download/open local UI; action sequence. Use outlines, arrows, labels and numbered steps with concise captions. Sketches support, not replace, written instructions.

### PDF requirements

Deliver **one** professional PDF (suggested `Tournament_Bot_User_Manual.pdf`):

- Page 1: title and clickable table of contents with the five chapter titles in exact order, short descriptions, actual starting page numbers, working internal links and useful subsection links where appropriate.
- Page 2: one- or two-paragraph end-user summary describing the manual, the bot/Player/Admin relationship, intended audiences and index usage.
- Page 3 onward: all five chapters in exact order, clear hierarchy, numbered procedures, examples, tables/sketches and cross-references.

Format consistently; visually distinguish commands/arguments/filenames/buttons; use page numbers, recognizable links, appropriate metadata, selectable text and accessible structure where supported. Keep sketches readable in screen/print. Avoid clipping, overlaps, awkward splits, blank pages and cramped layout. Generate/update TOC links after pagination is final.

Validate all documented commands, buttons, controls, permissions, setup, examples and procedures against the actual implementation. Check all five chapters/order, readability, user/developer separation, index page/summary page, starting pages, all internal links, page numbering and rendered pages. Fix and recheck defects. Report saved PDF, commented files, chapter order, link/page/layout validation and any functionality/docs limitations.

---

## 8. Plan 6 — Separate developer documentation from end-user instructions

Plan 6 substantially overlaps Plan 5 but makes the audience separation explicit and should be treated as a reinforcing/final quality requirement, not permission to mix developer and user content.

### Developer-facing comments

Belong in source files (or separate developer documentation), use technical language, and explain internal responsibilities, architecture, data flow, validation, OCR, backend/storage, score calculations, authn/authz, dependencies, configuration, failure handling and maintenance. Comments should clarify non-obvious behaviour, not restate obvious code. Do not place end-user tutorials in source comments. Avoid behaviour changes, unrelated refactors, and secrets; validate affected code afterward.

### User-facing PDF

Belongs in a single plain-language manual and describes what the user can do, who is allowed, prerequisites, exact navigation/actions, expected results, confirmation and troubleshooting. Translate only the technical details necessary to use the application safely. Do not copy lengthy internal comments into the manual or substitute the manual for source comments.

It retains the same five chapter titles/order as Plan 5, with additional emphasis:

1. **General Overview — HTML and Discord Usage and Purpose.**
2. **How-to Instructions — Admin Use of the HTML Interface.**
3. **How-to Instructions — Player Participant Use of the HTML Interface.**
4. **How-to Instructions — Admin Use of Discord.**
5. **How-to Instructions — Player Participant Use of Discord.**

The required coverage, step-by-step guidance, realistic examples and actual-control sketches are those in Plan 5. Plan 6 further requires explicit Admin vs Participant scope; example outputs must be labelled; user instructions must not expose unnecessary code architecture; and a running backend/service must be explained in user-friendly terms if required.

The PDF structure remains exact: page 1 clickable index; page 2 one/two-paragraph summary; page 3 onward chapters 1–5 in order. Validate source comments, code functionality, user instructions, actual commands/controls/permissions, examples and sketches, internal links, page numbers, rendered layout, text selection/metadata and absence of clipping/overlaps/broken links. Deliver a single PDF plus updated commented source. Report actual source files, chapter sequence and what was actually validated.

---

## 9. Added OCR instruction — local computer-vision-assisted recognition

`addedImgProcess.txt` is an additional OCR workstream referenced alongside the six sequential plans. It says to pause the then-current plan and stop other changes/testing while this task is implemented, then reconcile the full plan and prior tests with the new results before resuming iterative review → test → implement cycles. Its top instruction says local-only/no external API; its detailed body evaluates cloud fallback only as an explicitly optional possibility. The latest project resumption records local/offline as the default and cloud services as nonessential/disabled unless authorized.

### Intended architecture

**OpenCV field isolation → primary local OCR → field-specific parsing/validation → optional second local PaddleOCR engine → optional authorized cloud/vision fallback only if later approved → accept only under explicit criteria, otherwise human review.**

The normal pipeline must continue locally/offline. Do not replace Tesseract.js simply because another engine is available. The high-level instruction says to keep PaddleOCR/OpenCV; the dated comparison evidence says the tested PaddleOCR hybrid was worse. The safe reconciliation is: continue OpenCV; keep PaddleOCR locally available behind a feature flag, initially disabled (`PADDLEOCR_FIELD_FALLBACK=0` in the latest historical evidence), and enable/integrate only if current same-fixture evidence shows material improvement without increased accepted-wrong critical values, unacceptable latency, or complexity.

### OCR implementation requirements

**Baseline and source control:** identify the authoritative source ZIP/revision; inspect dependencies, tests, fixtures, expected values and reports; confirm Node.js 24 and Windows target; trace ingestion → preprocess → OCR → parse → candidate selection → validation → record/scoring; run and record exact baseline commands/source/runtime; preserve original archives/fixtures/reports and work separately. Do not silently substitute Node 22 or Linux for Windows acceptance.

**OpenCV geometry:** prefer stable anchors, fixed geometry, template matching and measured crop boundaries; do not introduce a trained detector unless simpler methods fail. Keep original images unchanged; store derived crops separately. Retain screenshot ID/dimensions, field, crop coordinates, reproducible crop, preprocessing parameters, engine/model/version/config, raw OCR text and alternatives, parsed candidate, validation/rejection reasons, confidence, final decision and review outcome. Check for clipped leading/trailing digits, neighbour contamination and missing context.

**Field-specific logic:**
- Numeric: damage, XP, Free XP, credits and rewards; isolate/scale/preprocess appropriately; numeric constraints where supported; strict parse. Test missing leading/trailing digits, duplicates/extras, similar glyphs, clipped glyphs, separators, formatting and wrong candidate choice. Do not automatically prefer the largest/most common/highest generic confidence value.
- Player identity: treat player names/clan separately; use approved roster only as validation evidence. Never auto-map ambiguous or unfamiliar names to the nearest roster entry; preserve candidates and request correction.
- Metadata: map, mode, battle start, ship, victory/defeat and other required fields; validate known values and strict date/time formats; account for game updates; do not infer absent fields from similar screenshots.

**PaddleOCR benchmark:** verify appropriate release/model/license/platform/dependencies/resources; choose Python worker/local service/other integration that fits; retain Tesseract baseline and feature-off switch; separately benchmark raw engine recognition and full field-specific pipeline on same approved screenshots/ground truth; measure exact accuracy, latency, CPU/RAM, failures, deployment burden. Investigate correlated models/preprocessing; different package names do not prove independence. If unavailable, report and supply repeatable procedure, never fabricated numbers.

**Candidate selection and ambiguity:** add second recognition only when critical field missing, invalid, ambiguous or conflicting. Compare genuinely independent evidence; repeated reads of same pixels do not count as independent without justification. Define per-field syntax/range, crop-boundary correctness, agreement, contradiction, missing evidence, calibrated confidence/thresholds and human-review criteria. Never accept a value merely because a fallback returns a plausible answer.

**Custom recognizer:** first classify errors as crop geometry, image quality/scaling, recognition, parsing/selection or field association. Fix upstream geometry/parsing first. Only train on sufficient labeled examples; separate train/tune/holdout, avoid image leakage, compare with existing engines and justify labeling/maintenance/inference cost before adopting.

**Benchmark corpus and measures:** target 100–200 labeled representative screenshots when available; report sample-size gap if less. Manifest fixture ID, approved fields, source and metadata. Keep development, tuning and untouched final holdout separate. Run same fixtures through: A) existing; B) improved OpenCV/validation; C) plus PaddleOCR; D) selective local fallback; E) optional authorized cloud; F) custom recognizer if justified. Report exact-field accuracy per field; complete-record accuracy; critical false-acceptance; unresolved and human-review rates; false-rejection; breakdown by field/image/failure type; median and P95 latency where valid; throughput/resources; optional cloud cost; exceptions/timeouts/repeatability. Define every numerator/denominator and unresolved convention. Run sequential/reversed orders and analyze improvements/regressions.

**Regression/security tests:** leading/trailing digit loss; extras/similar characters; candidate conflict; crop/clipping errors; unknown names; missing/legitimately missing metadata; empty/corrupt files; resolution/layout variations; engine crash/timeout/dependency absence; Paddle worker failure/termination; cloud credential missing/timeout/rate-limit/unavailable; ambiguity/human review; false acceptance prevention; sequential cleanup/recovery; scoring/data contract compatibility. Use independently approved expected values and negative controls. Preserve event behaviour, data contracts, Discord and scoring; test any schema changes. Never remove failing fixtures or weaken tests.

**Priorities:** P0 baseline + crop/selection/false acceptance; P1 Paddle benchmark + explicit validation/ambiguity/regressions; P2 evaluate selective cloud fallback only if approved; P3 custom recognition only if justified; P4 full acceptance, Windows, report and package.

**Deliverables:** architecture/baseline review; prioritized plan; file-level changes; dataset manifest/methodology; baseline-vs-candidate tables; field error analysis; regression/acceptance outputs; platform/dependency/latency/cost findings; setup/config incl. optional service; tested-source ZIP; truthful final report.

### Cloud-service tension

The detailed OCR plan mentions Google Cloud Vision, Azure AI Vision and vision-capable models as candidates, but says these must be optional, explicitly configured, disabled by default unless authorized, cost/retention/network impacts documented, minimum necessary crops sent, no credentials/unrelated content sent, and cloud failure must not crash local processing. The added instruction's opening says “keep it all local, don't use any external api”; therefore **local-only is the governing default**. No cloud API should be used unless the user later explicitly authorizes it and the plan is reconciled accordingly.

---

## 10. `plan1.txt` — Master OCR/bot roadmap and accepted technical constraints

`plan1.txt` is described as the single master plan and authoritative roadmap. The following phase order is the established technical plan in the provided source. Phase statuses are time/source-specific; later dated addenda supersede older prose, but historical results must remain preserved.

| Phase | Scope | Exit condition / principal evidence |
|---:|---|---|
| **0 — Baseline** | Identify/hashes of authoritative input/candidate ZIPs, runtime/dependencies, workbook, source/manifests, tests, historical failures, and audit whether claimed watchdog/worker/crop/offline features actually exist. | Baseline inventory/claim audit complete; this does **not** certify accuracy or production readiness. |
| **1 — Real dependencies and regression baseline** | Fix real `discord.js` panel test using actual builders/serialization; preserve totals/event/channel assertions; cover malformed/missing/unsupported interaction input. Replace POSIX-only process cancellation gaps with real child-process tests that observe exit/`close`, while retaining POSIX fixtures. | `npm ls --depth=0`, `npm test`, platform-equivalent cancellation/cleanup evidence. Historical later runs vary by source: see evidence chronology below. |
| **2 — Tesseract.js acceptance harness** | Cross-platform `npm run test:tesseractjs`, Windows PowerShell-compatible; explicit `OCR_ENGINE=tesseractjs`; local asset/dependency checks; reported screenshot; four fixtures; five-image sequential batches; both two-image orders; timeout/recovery; exact fields/completeness; offline/no-network. Reports must capture source/runtime/package/engine/model/asset hashes, fixture order, latency, exact field comparisons, cleanup/recovery and exit status. Negative control changes only test expected damage and must exit nonzero with validated mismatch; use child output files and process-tree cleanup. | Every mandatory command/fixture passes on supported current source; preserve timestamped per-image JSON and all prior failures. Local Node 22 tests are not Windows Node24 acceptance. |
| **3 — Sequential OCR reliability** | Instrument image/job/queue/worker/pass/crop/PSM/preprocess/recognize/timeout/termination/close/parse/validate/report operations. Diagnose historical second-image/pass-16 stall without assuming root cause. Test Hoffmann/Asashio both orders, 4-/5-image batches, at least 3 repetitions, separate processes, and injected first/middle/final recognition stalls. Use operation and image deadlines, bounded backlog, explicit overflow, fail-closed cancellation, confirmed worker/child exit before next image, settled promises/resource release and no overlapping jobs. Start diagnostic budget 90 seconds/image and provisional 3-minute batch, then measure Windows. | Forced 30-second timeout within documented deadline + cleanup grace; confirmed exit; fresh recovery succeeds; no overlap; both orders and three batches pass; cleanup failure halts safely; no incomplete/false record. Historical pass-16 root cause must be proven or remain explicitly unknown. |
| **4 — OCR field accuracy** | Compare source image/crop/raw text/parameters/candidates/selected/expected value; distinguish recognition, crop, parser, selection and mapping errors. Correct damage, XP/Free XP, credits, player/clan, map/mode/start metadata and related geometry. Keep states separate: detected, consistent, verified. Route ambiguous mandatory values to correction. | Original five required images exact; reported image 9/9; each fixture exact; 5-image batch 5/5 for 3 runs; both orders exact; no wrong/ambiguous critical values accepted. No changes to workbook/event/player/scoring behaviour. |
| **5 — Native Tesseract comparison** | Locate/install authorized Windows `tesseract.exe`; check `Get-Command tesseract`, version and languages; compare native and JS on same images/crops/preprocess with versions/model metadata. Keep reports separate; native engine is diagnostic, not a substitute for JS fallback criteria. | Windows native comparison only after CLI exists; otherwise external blocker recorded. Linux Tesseract diagnostics do not meet Windows gate. |
| **6 — Privacy-safe diagnostic/correction system** | Optional local `data/ocr-diagnostics/`; dedup hash; original/retained image policy; dimensions/source/model; crop/preprocess/PSM; raw/final fields/status; timings/failures; user-confirmed corrections and label provenance. | Consent, minimum collection, access limits, quotas, rotation, retention/deletion, duplicate control, no automatic upload/secrets, verified labels only. Separate tune/holdout and show improvement without regressions. This phase remains optional and must not start before privacy policy. |
| **7 — Bot/scoring integrity** | Full application/workbook regression after OCR changes. Preserve Node24; native CLI + JS fallback; 50-player workbook; `$12.49` default dollar behaviour; four tournament events × seven game slots; player management, results/corrections/mapping/standings/import/export; SQLite, JSON mirror/recovery; prefix commands/panel; one configured public Discord channel; slash commands disabled until channel-restricted. | Full regression on target Windows Node24 and no behaviour/data regression. Any unrelated failure is a release blocker unless proven invalid without weakening intended behaviour. |
| **8 — Final acceptance and versioned packaging** | Clean dependency install; full suite; Tesseract acceptance; native tests if available; 3 × five-image batch; reverse-order tests; injected timeout/termination/recovery; offline assets; 50-player workbook; source/ZIP manifests, versions, assets, hashes. Preserve source history and exclude secrets, live state and unnecessary `node_modules`. | New candidate only after feasible gates; archive integrity/hash; exact tested source; no production label until all mandatory acceptance, Windows/native/live gates pass. |

### Required OCR record contract — latest dated project decision

The October 28 resumption addendum states the active mandatory field order as exactly nine fields:

1. `result`
2. `player`
3. `map`
4. `mode`
5. `battleStart`
6. `credits`
7. `freeXp`
8. `damage`
9. `xp`

All nine are mandatory. XP is ninth/final; missing, invalid, uncertain, conflicting or incorrect XP blocks acceptance. This dated 9-field instruction explicitly supersedes historical 8-field/optional-XP assumptions. Do not change approved ground truth or silently omit XP. Keep historical reports under the contract version they originally tested.

---

## 11. Evidence chronology and current recorded status

The source contains several snapshots with conflicting results because they refer to different source revisions, runtimes and dates. The correct reading is chronological and source-bound—not to average the outcomes or transfer a passing result from an old build to a newer one.

### Baseline project identity and preserved calculations

- Original input archive named `wows_yolo_tournament_discord_bot_v2_5_0_path2_reliability_retry (2).zip`; SHA-256 `c7e8255785aad4e36063486e3b02ef8e8f5c357784e5a7488f0e6da309218196`.
- Package `wows-yolo-tourney-discord-bot` version `2.5.0`; declared Node engine `>=24.17.0`.
- Recorded direct dependencies: `discord.js@14.27.0`, `dotenv@16.6.1`, `tesseract.js@6.0.1`, `tesseract.js-core@6.1.2`.
- Authoritative workbook SHA-256 `12ad80209ef77451b3586b52359a06b5361a68bc9926fc81a9da3d6c4b586397` (reported unchanged). OOXML inspection recorded `Totals!G12 = SUM(G3:G11,G14:G54)`, cached `2312.5598233298197`; `Totals!H12 = 0.54*G12/100`, cached `12.487823045981026`, displayed `$12.49`. Recorded test coverage includes 50-player randomized scoring/archive tests.
- Preserve the five screenshot fixtures, the historical raw reports, the reported-screen baseline mismatch, and all expected data. Pipeline completion or nonempty fields do not prove OCR correctness.

### Phase 0 archive and Windows baseline ledger

- Phase 0 candidate archive: `wows_yolo_tournament_discord_bot_v2_5_0_phase0_completed.zip`, SHA-256 `15992275fabdc40386c0b55e5f0794e1b0717a44469c96afdf15a9e92a6d64fc`; embedded `SHA256SUMS.txt` hash `fe1196a30119ad80597193dd663a3eda5a998f24076098ddd4605003801f85c0`. Its manifest covered 72 project files (71 hashed entries because the manifest does not hash itself); all entries and ZIP integrity passed. It excluded `node_modules`, `.git`, live `data/` and `.env`. The input had 58 project files outside `node_modules`; the candidate had 72 and removed no original project file. Three files differed (`VALIDATION-STATUS.md`, `scripts/run-reported-screenshot-regression.js`, `tests/full-system.test.js`); 14 were candidate-only, including manifest/evidence. Core OCR files (`src/bot.js`, `src/ocr-worker.js`, `src/serial-task-queue.js`, `src/image-processor.js`, `src/battle-record.js`) were byte-identical, so Phase 0 did not implement the outstanding OCR algorithm/lifecycle changes.
- Supplied Windows baseline environment at that point: Node `v24.22.1`, npm `11.19.1`, ImageMagick `7.1.2-34 Q16 x64`; `npm ci` (39 packages added, 40 audited, zero vulnerabilities reported) and `npm ls --depth=0` passed on the candidate. Windows could not find `tesseract.exe` through PATH (`Get-Command`, `--version`, `--list-langs` failed).
- Original Windows full suite: 74 tests, 71 passed, 1 failed, 2 skipped. The failure was `tests/full-system.test.js:808–817`, reading `.map` from undefined `menu.options`; two skips used POSIX process-group behaviour for ImageMagick/native-Tesseract cancellation. Candidate-specific Windows suite: 74 tests, 72 passed, 0 failed, 2 skipped; panel test passed, but no Windows-equivalent proof replaced the two skipped fixtures. Original transcript SHA-256 `6a02975205ec9f57962027967a3fd89fcd9707d3e21c8f333060e0b868f00610`; candidate transcript SHA-256 `f8aa3987c07d4a6fbeef95154d1db85171a4d9f8a0a6e13cf69ab43b2030c3b1`.
- A separate Linux work-copy result was 74/74 plus targeted panel tests 5/5 on Node `v22.16.0`, using copied dependency directories because fresh `npm ci` timed out after 120 seconds. It is diagnostic, not a clean install or Node24 result. Full log SHA `ca89f1e68bbb704352695e05c39b3a8e831f36e78b7e934a255b832a3a12f883`; panel log SHA `cfdb7c050516809cb1527b4018776c40041412ea6cfb9afdaa87387183902026`.

### Earlier OCR and reliability evidence

- Early baseline claimed reported-screen damage `87313` vs expected `87373` (8/9); four-image run completed 4/4 jobs but exact match was 0/4 and required fields complete only 1/4. Linux native Tesseract 5.5.0 PSM 3 read raw reported-screen damage as `87373`, but full bot native pipeline timed out at 120 seconds: diagnostic/inconclusive, not a Windows comparison pass.
- Frozen Phase 0 code audit found: claimed independent full-screen damage precedence absent; no per-operation watchdog racing `setParameters`/`recognize`; worker cached after successful images; fail-closed cleanup only partial because pinned Tesseract.js 6.0.1 public `terminate()` wrapper did not prove underlying worker exit; local asset path code/tests existed, but no true offline end-to-end recognition had yet been run.
- Earlier RC1 Windows (Node `v24.22.1`) reported `npm ci` pass (39 packages added, 40 audited, 0 vulnerabilities), `npm test` 102 pass/0 fail/2 POSIX-only skips and watchdog 14/14, but OCR acceptance only 2/10 because eight scenarios failed rapidly at `internal/preload` under `NODE_OPTIONS`. The exact first error line was missing; preload path issue was a hypothesis.
- RC2 introduced `scripts/node-options-path.js` to normalize quoted Windows `--require` paths; focused Linux Node22 tests 14/14. Subsequent exact RC2 Windows results: main suite 104 pass/0 fail/2 skips, watchdog 14/14, but Tesseract acceptance 3/10; reported damage ambiguity, lifecycle/recovery combined gate failure and fixture-specific errors remained. The 3/10 run was a real failure, not a pass.
- RC3 added: separate known-good Asashio lifecycle-only gate; strict negative control requiring all-known-good baseline and only deliberately wrong damage comparison; reward geometry for Credits/XP/Free XP with multiple crop widths/PSMs and unique quorum; cautious leading map OCR-artifact cleanup; regression tests. Focused Linux Node22 suite 60/60 and syntax checks passed, but no actual RC3 OCR acceptance or Windows Node24 run. RC3 source fingerprint `1dd915e1a457a51eca5c2ca1c039697647643a274d6107cacb831e1ca81183ab` (50-file source). Production remained NO-GO.

### October 25 master-plan closeouts and audits

- Phase 1 local run: `npm test` 102/102, Node22 Linux. `npm run test:tesseractjs` recorded 9/9 or later metadata run 8/8 depending on launcher/report revision; reported screenshot 9/9, three 5-image batches each 5/5, both Hoffmann/Asashio orderings 2/2, separate 4-fixture run 4/4, zero observed blocked network attempts. All are Node22 Linux evidence, below required Node `>=24.17.0` and not Windows proof.
- Integrated real-recognition → injected next-recognition stall: reports at `02-34-28`, `02-54-30`, `02-57-32` showed a real recognition, 15-second watchdog, worker termination/child closure and fresh recovery at 9/9. A later repeat stalled before recovery output under the outer tool timeout; an October 25 re-audit therefore marked it intermittent/partially verified despite earlier passes. Do not describe the entire gate as reproducibly closed based on a single success.
- Phase 2 recorded: `npm test` 103/103 on Node22; `npm ls --depth=0` showed the stated versions; full acceptance `2026-10-25T03-20-04-937Z-47361` passed 10/10 and metadata run `2026-10-25T03-31-59-739Z-51914` passed 8/8. Reports: `abde2ea8fd7331c92734ef716ee00a4a10c53f12dcc2e177ecbf62cfea5b07e0` and `ecb5861ad7a8a8f865209fb53196740b784d993e89508615e1a1250993a27656`. Negative control used wrong expected `damage=87313` against correct `87373`, expected exit 1 and only damage mismatch. The reported Phase 1 model hash `9d7c...` was later clarified to be the final WASM core asset, not `eng.traineddata`; Phase2 metadata hash for English model was `5dc5d8d640a212c9d6184921ba103b186f50e0fed9ee716c53e6b312b400d747`. Preserve reports with correct asset roles.
- Phase 2 local pass results do not transfer to later RC2/RC3 or to Windows unless source fingerprints/versions match.
- Phase 0 closure only means baseline/artifact/claim reconciliation was done. It is not a release or OCR pass.

### October 27 source recovery and Iteration 21 patch

- V4 source archive `YoloDiscordBotV4.zip`: SHA-256 `b57942298f9d1405946f2eadf249ece94cf1cde05131172e44d0a4cd51099899`; ZIP integrity passed. 4,000 archive entries (3,749 files/251 directories), 319,940,567 bytes uncompressed; app tree 3,680 files (3,298 node_modules; 382 outside). Package still requires Node `>=24.17.0`; bundled `node_modules` is not clean-install proof.
- Required Iteration21 patch `DWBOT_ITERATION21_PATCH.zip`: SHA-256 `35bdedfcfdeb3f861bb6b8e444732962644a053b7140c7494504a13e6c858d14`. `artifacts.zip` SHA-256 `daabff336d8182fcc72e0b065a6fbb07697bdda942d3eabddc9007589208dad2`. Later addendum records all 21 patch manifest entries matched, and patch applied to isolated `/mnt/data/DWBOT_ITERATION21_WORK`; original archives preserved; 18 files updated plus acceptance report/evidence.
- `plan1.txt` copies inside V4 and `plan1ext(1).zip` were byte-identical. The `addedImgProcess.txt` variants were not: V4 version 19,452 bytes/325 lines/hash `307f4575a0b34e5d8d9c7a9c0069086e92f41da61a8fb3934d32455ac103f125`; plan1ext version 18,860 bytes/321 lines/hash `484dcfee0e9a5a2d5df4c5fb5ab6caa63aaa7251b342701d026d7e178f5f4f4c`. Preserve both and reconcile by diff before choosing instruction variant.
- The applied patch's then-current contract was 8 required fields (result, player, map, mode, battleStart, credits, freeXp, damage), XP optional/diagnostic. It rejects U+FFFD in OCR/manual values. Supplied patch report said ground truth and image hashes unchanged.
- Patch report's paired Windows comparison: Tesseract-only 111/128 exact mandatory fields and 7/16 fully exact records; hybrid 108/128 exact fields and 3/16 fully exact records; hybrid accepted more wrong mandatory fields (4 vs 2) and was slower (median 42,601 ms vs 34,898 ms). Keep `PADDLEOCR_FIELD_FALLBACK=0`. This is the measurement behind disabling the hybrid pending improvement.
- Local Node22 focused tests 36/36 and nine JS syntax checks passed. Patch-supplied report recorded a prior isolated Node24.17 test 178/178, but that result was not independently reproduced in the noted execution. No Windows target acceptance, full OCR run, Discord smoke, restore rehearsal, production deployment, repository migration, commit or push occurred in that step.

### October 28 latest resumption and package status

**Latest recorded project status in this text: CANDIDATE / BLOCKED; production NO-GO.**

- The October 28 resumption explicitly reinstates **nine** mandatory fields, in order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. This is later than and supersedes the Iteration21 eight-field/optional-XP decision. XP is required for acceptance; historical eight-field reports remain historical.
- Continuation archive had 26 stale manifest mismatches. They were classified: 11 files match V4, 3 match verified Iteration21 patch, 5 are patch files with nine-field overlay, 2 V4 files with nine-field overlay, 4 unchanged continuation-only synthetic JSON files (not canonical ground truth), 1 current plan update. A fresh candidate manifest verified 399/399. Original failed manifest/log preserved. This resolves the candidate's stale manifest, not Git ancestry.
- Latest source fingerprint `69c03ff05b7c796707a15bac24abd50603088559d8e7c8ee1695c0c614156808` (72 source files). `scripts/accept-tesseractjs.js` uses reported-issue screenshot as same-runtime negative-control baseline; deliberately wrong damage must be the only mismatch. `src/battle-record.js` fails closed when ≥3 exact player spellings differ only by OCR-confusable glyphs and no exact spelling has strict majority; no O/0/I guessing. Asashio player becomes `Not detected` and requests correction rather than falsely accepting `O0ldschoolGaming_YouTube`.
- Latest local test evidence: full `node --test` 180 pass/0 fail/0 skip on Linux x64 Node `v24.17.0`, but using a temporary symlink to dependencies from hash-verified V4—not clean `npm ci`. Focused battle-record/workflow/acceptance tests 44/44; edited JS syntax passed. `npm ls --depth=0` exit 0 with extraneous packages, diagnostic only. `npm ci` timed out after 120 seconds and partial `node_modules` was removed; no clean install is claimed.
- Five-image tests before player guard: 3/5 exact, 4/5 complete and exposed wrong O/0 identity acceptance plus missing Credits/XP. After guard: 3/5 exact, 3/5 complete, zero incorrect accepted fields; Asashio player and Schlieffen Credits/XP remain unresolved. Supervised lifecycle recovery and reported-screen image passed individually, but the full acceptance runner was interrupted before the five-image batch because the old Asashio baseline precondition failed. After correction and separate negative-control recheck, the full runner had not yet been rerun. Therefore no current full acceptance pass.
- Candidate has no `.git`; live GitHub metadata read reported private `bootheburd-glitch/dwbot`, default `main`, admin/push permission, but authenticated local checkout, original commit ancestry and history-preserving migration are unverified. No repository migration or deployment was done.
- Latest Route C package `DWBOT_MILESTONE_ROUTE_C_RECONCILIATION_2026-10-28.zip`: SHA `e10c67da80b6ba7113dfb18ea3193b8467245f8e327722612629725d538963d1`; ZIP integrity passed; outer checksums 450/450; candidate manifest 399/399; no `.env`, `.git`, `node_modules` or SQLite/database files; still candidate/blocked. Package plan snapshot intentionally predates its detached ZIP checksum.
- Another candidate handoff package `DWBOT_MILESTONE_NINE_FIELD_CONTRACT_2026-10-28.zip`: SHA `35b7f37d6a834a9690bed4cc5c8854c586c10ad5f180737666c83436447ad4ed`; integrity/internal manifest passed; labelled CANDIDATE/BLOCKED, not authoritative.
- GitHub update was documentation/status only: `PROJECT_STATUS.md` change on `main`, commit `6c42cc45560dc42227f275ddf8e3640f13f9c427`, verified blob SHA `ce2651c00e40bca34f73023ffad09bf0aef2a920`; application source not imported.
- The 16-image set is a development/tuning corpus, not an independent holdout. No independent never-tuned holdout with two independent labels for all nine fields, current-source full Windows Node24 acceptance, live Discord staging, backup/restore rehearsal, authenticated Git checkout, migration, or deployment is claimed.
- Preserve `docs/limits/chtGptLimits.txt` as user-supplied historic reference only; figures are not live quota information. Consult the referenced official links for current limits; do not claim visibility into remaining quota. Respect any user instruction to pause quota-restricted operations rather than route equivalent work through another executor.

### Latest next-action sequence recorded by the project

1. Reconcile source archives, the V4 base, selected patch, both `addedImgProcess.txt` versions, nine-field overlay/manifest, and Git ancestry. Preserve original archives; do not make a new repo/migration before source lineage is established.
2. Obtain/verify exact patch and overlay hashes, then maintain one clean, isolated working copy and regenerate manifests/checksums after edits.
3. On clean Windows x64 with Node `>=24.17.0`, run `npm ci`, `npm ls --depth=0`, `npm test`, then the complete supervised nine-field OCR acceptance runner. Preserve full stdout/stderr, logs, exit codes and JSON.
4. Rerun the full five-image batches, repeated and reverse-order sequences, all 16 additional screenshots, no-network proof, timeout/lifecycle/negative-control stages, and final acceptance JSON. Do not tune against the final holdout.
5. Create an independently labelled never-tuned holdout with two independent labels for all nine fields. Report exact-field/complete-record accuracy, accepted-wrong rate, unresolved/human-review rate, latency/resources and zero OCR/model network attempts.
6. Finish OpenCV crop-boundary tests; benchmark local PaddleOCR versus Tesseract-only on the same approved fixtures; keep `PADDLEOCR_FIELD_FALLBACK=0` unless evidence supports enabling it.
7. Complete Windows native Tesseract comparison if `tesseract.exe` can be made available with authorization.
8. Complete authorized Discord staging tests, persistence/recovery, workbook/scoring, backup/restore and rollback checks.
9. Implement optional OCR correction diagnostics only after consent, minimal data, access, retention/deletion, quota and holdout rules are defined.
10. Package a versioned candidate with `read me.txt`, active plan, source/change summary, decisions, actual commands/runtime/logs/exit codes, risks/blockers, manifests and SHA-256 checksums. Exclude secrets, `.env`, `node_modules`, private runtime data and obsolete files. Verify fresh extraction, ZIP integrity and internal hashes; record detached ZIP hash in the active plan. Candidate/blocked until all mandatory gates pass.
11. No production release until every mandatory exact-match, lifecycle, offline/local, Windows, workbook/scoring, Discord and recovery gate has the required evidence.

---

## 12. Key dependencies and conflict register

| Topic | Requirement/evidence conflict | Safe interpretation / resolution needed |
|---|---|---|
| Six-file sequence vs OCR addendum | Wrapper demands strict `1.txt`→`6.txt`; `addedImgProcess.txt` says pause the existing plan and implement OCR first, then reconcile/resume. | Treat the OCR addendum as an explicitly inserted workstream only after confirming its authorized place in the sequence; do not silently reorder the six mandated files. User/project authority must reconcile this sequencing conflict before execution. |
| Local-only vs cloud fallback | Addendum opens with “keep it all local, don't use any external api”; detailed section discusses cloud OCR as optional. | Local/offline is default and currently governing. Cloud services remain disabled/unimplemented absent explicit authorization. |
| PaddleOCR requested vs evidence | Top command says keep PaddleOCR and OpenCV; later Windows benchmark shows hybrid worse than Tesseract-only and accepted-wrong values increase. | Retain PaddleOCR as optional local engine behind disabled feature flag; continue OpenCV. Enable only after repeatable evidence proves benefit and no unacceptable false acceptance. |
| Mandatory field count | Iteration21 patch says 8 mandatory and XP optional; October 28 resumption says 9 mandatory, XP final. | Latest dated master addendum establishes nine mandatory fields. Keep eight-field results only as historical and do not omit XP. |
| `addedImgProcess.txt` variants | V4 embedded and plan1ext versions differ (hashes/lengths above). | Preserve both; complete a line-level diff and authorize the governing variant before next implementation. |
| `2.txt` completeness | The source ends in mid item 9. | Missing tail remains unknown; obtain complete original `2.txt` before treating all its instructions as captured. |
| Plan5 vs Plan6 docs | Strong overlap in comments/manual, same five chapters and PDF structure; Plan6 formalizes strict audience separation. | Execute sequentially; retain Plan5 specifics and apply Plan6 as final separation/quality rules. Avoid duplicating manual content or skipping unique requirements. |
| HTML local-file vs integration | Player HTML should be placed on Desktop, but private data/OCR/bot permissions may need a service. | Do not promise functionality from a `file://` page alone. Prove a no-backend workflow or request choice for a minimal secure service. |
| Admin UI vs no backend | Admin authorization must be enforced server-side; hiding controls is insufficient, while backend is dispreferred. | Security takes precedence; offer architecture options and pause for approval if no sound no-backend option exists. |
| Native Tesseract vs Tesseract.js | Linux native diagnostics do not satisfy the Windows CLI comparison. | Keep native Windows comparison as a separate environment-gated diagnostic. It does not replace Tesseract.js acceptance. |
| Historical pass vs reliability | Some earlier integrated stall/recovery tests passed; later rerun intermittent, newer acceptance runner interrupted. | Do not infer stable current-source recovery. Repeat controlled tests and require confirmed process close before recovery. |
| Windows vs Linux runtime | Package requires Node `>=24.17.0`; many older test results are Node22 Linux. | Label each result by exact source, OS, Node/npm, dependency install method and command. Windows certification still requires a current clean Windows Node24 run. |
| Project plan and user-manual order | Plan4 says append web-interface work at end without altering prior phases; Plan5/6 manual chapters have an exact order. | Keep existing roadmap and appendix order; manual's five-chapter order is independent and fixed. |
| Overall final-validation heading | Wrapper says final validation after `5.txt`, though order includes `6.txt`. | Perform final combined validation after `6.txt`; preserve the discrepancy in the record. |

---

## 13. Consolidated completion roadmap (planned, not executed here)

The sequence below captures the cross-file dependencies without authorizing any out-of-order implementation.

1. **Establish inputs and tools:** inspect actual archives/files; verify all `1.txt`–`6.txt`; check five app connection statuses; capture versions, permissions and user actions. Preserve files; no project changes during plugin setup.
2. **Reconcile source of truth:** inventory source/ZIPs/plans/reports/fixtures/Git lineage; recover complete `2.txt`; compare `addedImgProcess.txt` variants; reconcile 8/9-field history and current nine-field requirement; update status report and master plan; record genuine blockers.
3. **Build verified handoff archive:** include exact current source, plan, tests/evidence, context, manifest, checksums and readme; exclude secrets/private live state; verify fresh extraction; mark candidate until acceptance allows authoritative label.
4. **Establish test environment:** inspect Node/OS/dependencies, authorized Discord app/server/roles/channels, credentials through secure mechanism, persistent runtime and storage. Build local/mock/live test layers with status labels.
5. **Execute Discord integration tests:** login, allowed/denied permissions, attachment delivery + actual processing, safe rate-limit recovery, stop/restart/persistence. Test live only with authorization; mocks never become live PASS.
6. **Plan HTML integration:** inspect existing named HTML assets and bot architecture. Evaluate JSON-to-Discord, browser-side OCR and direct upload alternatives before backend. Agree on secure connectivity and launch model. Append web phase to `plan1.txt` without modifying prior phases.
7. **Implement Player then review:** implement participant-only operations, authoritative data/refresh, screenshot processing and truthful status; review usability/accessibility/responsiveness and every permission/error case.
8. **Implement Admin then test both:** derive from Player; add secure admin auth and full manual scoring; keep image optional; test role denial, calculations, cross-interface consistency and bot regression.
9. **OCR accuracy/reliability gates:** retain OpenCV and local Tesseract; benchmark local PaddleOCR feature-off first; complete crop analysis, nine-field candidate rules, human review, frozen fixtures, clean Windows Node24 runs, repeat/reverse order, fault injection/recovery, no-network tests and an independent untouched holdout. Native Windows Tesseract is separate.
10. **Preserve scoring and tournament behaviour:** verify workbook formula/hash, 50-player regressions, four events/seven slots, `$12.49`, player/event mapping, commands/panel, SQLite/JSON and recovery.
11. **Documentation:** Plan5 then Plan6; inspect actual operations, add accurate developer comments, create separate user manual with five exact chapters and sketches, PDF page1 index/page2 summary and correct links.
12. **Package and hand off:** final source/HTML/docs/tests/PDF + readme/plan/report/manifests/checksums; validate ZIP and PDF after rendering/link checks; document exact unverified conditions and next actions. Do not deploy/push or claim production readiness until authorized and all mandatory gates pass.

---

## 14. Review conclusion and execution boundary

The consolidated text describes **one integrated tournament-bot programme**, not six unrelated coding tasks: secure project setup → source/evidence reconciliation → Discord integration verification → browser interfaces → developer/user documentation → controlled OCR and release readiness, all governed by strict sequential gates and the exact-match integrity rule.

The latest dated status contained in the supplied material is **October 28, 2026: candidate/blocked; production NO-GO**. The text reports meaningful implementation and test progress, but also unresolved nine-field accuracy, full acceptance rerun, independent holdout, clean Windows Node24 installation and acceptance, native Windows Tesseract, live Discord staging, recovery/restore and Git-lineage requirements. Some earlier successes belong to different source revisions and environments and cannot close these later gates.

This file is a condensed project plan and evidence map. It does not assert that the referenced project ZIPs or source files have been re-opened in this session, and it does not perform any of the six implementation plans. The incomplete `2.txt` tail and the identified decision conflicts remain explicit rather than being filled with assumptions.
