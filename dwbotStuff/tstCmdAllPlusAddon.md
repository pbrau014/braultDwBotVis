make the following rules for this chat, make them rules not, consider them now before continuing:
list the rules and instructions that are currently in effect in this chat. put it in a table with each rule or instruction having its own line, give the name and a brief description of each. include any rules or instructions found in the instructed reading of the previous message, if any of these are not in effect then make it so they are now rules in this chat, update the table and show me the table.
Active rules and instructions for this chat
I have consolidated the instructions supplied in this conversation, the contents and requirements discussed from plansVis.zip, the carried-forward DWBOT project context, and your additional operating requirements.
The applicable instructions are now treated as active operating rules for this chat. Where an earlier instruction was incomplete, ambiguous, or inconsistent with a later correction, I have identified that rather than silently discarding it.
There is one important scope distinction: this chat's main project is DWBOT / World of Warships Computer-Vision-Assisted OCR. The general governance and documentation requirements from the Partial Dyson Sphere document are adopted here, but its Dyson Sphere-specific engineering decisions do not become DWBOT technical requirements.
1. Governing and operating rules
ID
Rule or instruction
Active requirement
G-001
Standing IMPLEMENT Rule
Apply the user's Standing Implement Rule automatically across this project.
G-002
THINK → REASON → ACT
Analyze objectives, dependencies, alternatives, risks, and evidence before implementation and verification.
G-003
Mode 4
Apply comprehensive reasoning and implementation discipline proportionately to the task.
G-004
Independent problem-solving
Resolve ordinary implementation problems independently using sound engineering judgment. Do not unnecessarily return technical decisions to the user.
G-005
No unnecessary questions
Do not ask the user to make routine architectural, technical, or implementation decisions. Make defensible decisions independently.
G-006
Higher-priority instructions
User-granted authority does not override system instructions, safety requirements, applicable law, or tool limitations.
G-007
Scoped authorization
Perform explicitly authorized project work. Do not assume authorization for unrelated consequential actions.
G-008
No false completion claims
Never claim that something was created, transferred, tested, verified, or accepted unless the corresponding evidence exists.
G-009
Evidence classification
Distinguish verified facts, source-reported information, calculations, assumptions, inferences, recommendations, and unresolved issues.
G-010
Source integrity
Preserve original source materials, derivatives, provenance, and historical information.
G-011
No fabricated information
Never invent missing source content, results, test outcomes, dependencies, or evidence.
G-012
Conflict preservation
Do not silently reconcile conflicting instructions, source records, technical values, or historical decisions.
G-013
Continuous implementation
Carry authorized work through implementation, testing, verification, correction, and reporting as far as the available environment permits.
G-014
No incomplete code shortcuts
Do not use placeholders, ellipses, unfinished methods, or TODO shortcuts in deliverable implementation code.
G-015
Tool and access honesty
Do not claim access to local systems, files, accounts, or external services unless access has actually been established.
G-016
Practical completion
Prefer finished, executable, integrated solutions over standalone recommendations, disconnected prototypes, or plans alone.
2. File inspection and research rules
ID
Rule or instruction
Active requirement
F-001
Search archive contents

Inspect ZIP contents, not merely filenames or archive descriptions.
F-002
Recursive archive inspection
Inspect nested ZIP archives and other inspectable archives recursively where technically possible.
F-003
Source-file inspection
Read relevant application code, scripts, configuration, dependency manifests, lockfiles, tests, and documentation.
F-004
Project reconciliation
Compare inspected files against the actual project requirements and implementation state.
F-005
Inspection records
Record which files and archive members were actually inspected and what remains uninspected or inaccessible.
F-006
Original preservation
Preserve original files and checksums when creating updated or derivative artifacts.
F-007
Research
Use external technical research when it materially improves implementation accuracy.
F-008
Source citations
Cite external research when factual claims depend on it.
F-009
Local-first processing
Keep OCR processing and application operations local-first. Do not introduce unnecessary external OCR or AI-service dependencies.
F-010
ADD-047
Apply its Section 14 triggers when met: conduct the specified read-only Library review, report coverage and limitations, and pause before consequential changes requiring approval.
3. DWBOT project identity and repository rules
ID
Rule or instruction
Active requirement
D-001
Main project
The main project is the DWBOT World of Warships tournament Discord bot and its computer-vision-assisted OCR infrastructure.
D-002
Existing source baseline
Use the inspected DWBOT source and the Grand Tournament Instruction Set as project baselines.
D-003
Current repository
Use the existing GitHub repository pbrau014/dwbot.
D-004
Designated branch
Use dwbotVis as the working and delivery branch.
D-005
Protect main
Do not attempt to push project changes to, replace, or overwrite GitHub main.
D-006
Complete source transfer
Transfer the complete DWBOT application source and required supporting project materials to dwbotVis.
D-007
Remote verification
Verify the resulting GitHub commit, branch, tree, and actual file contents before reporting that source transfer is complete.
D-008
Repository integrity
Preserve usable Git history and source relationships where practical.
D-009
No partial-source claims
A README, status report, Git bundle, or small implementation ZIP is not equivalent to the complete application source being present on GitHub.
D-010
Repository visibility
Treat the repository as intentionally public. Do not change its visibility.
D-011
Source exclusions
Do not publish credentials, secrets, private .env files, live databases, personal information, or disposable runtime directories as ordinary source files.
D-012
Repository continuity
Use the existing designated repository and branch rather than creating another repository unnecessarily.
4. Runtime and dependency rules
ID
Rule or instruction
Active requirement
R-001
Node.js version
Node.js 22.16.0 is the required standing DWBOT runtime baseline.
R-002
Dependency consistency
Maintain the dependency manifests and lockfiles consistently with Node.js 22.16.0.
R-003
Runtime verification
Verify the actual Node version used for each test, build, and execution.
R-004
No silent upgrades
Do not upgrade the project to Node 24 or another major runtime without an explicit change to the runtime rule.
R-005
Reproducible dependencies
Preserve exact dependency versions and reproducible installation procedures.
R-006
Dependency validation
Test compatibility of native dependencies and supporting libraries against the required runtime.
5. OCR architecture and implementation rules
ID
Rule or instruction
Active requirement
O-001
Preserve Tesseract.js
Keep the existing Tesseract.js implementation as the baseline OCR engine.
O-002
Independent PaddleOCR evaluation
Evaluate PaddleOCR independently using appropriate models and comparable test data.
O-003
Evidence-based replacement
Do not replace Tesseract.js unless measured evidence demonstrates that the alternative performs better for the relevant workloads.
O-004
OpenCV assistance
Implement computer-vision-based image detection, cropping, preprocessing, and region isolation where testing demonstrates benefit.
O-005
Exact-value validation
Preserve strict exact-value validation. Never weaken it merely to increase apparent OCR acceptance rates.
O-006
Player identification
Improve player-name recognition while preserving exact identity validation.
O-007
Numeric recognition
Improve recognition of numeric statistics without accepting unsupported or ambiguous values.
O-008
Battle metadata
Improve map, battle mode, battle time, and related metadata extraction.
O-009
Canonical data contract
Preserve the nine-field contract: result, player, map, mode, battleStart, credits, freeXp, damage, and xp.
O-010
Field-level provenance
Retain the originating OCR engine, source region, confidence information, validation outcome, and relevant processing information for extracted fields.
O-011
Uncertain values
Reject or flag uncertain values for review rather than silently manufacturing or guessing values.
O-012
Image-region detection
Use OpenCV-assisted region detection and field isolation as an evaluated component of the pipeline.
O-013
Dual table extraction 

Support morphological line detection for bordered tables and spatial projection/profile analysis for borderless tables.
O-014

Spatial alignment

Use word coordinates and horizontal/vertical relationships to identify borderless table rows and columns.

O-015

Integrated implementation

Incorporate the required OCR capabilities into the existing architecture without creating unnecessary duplicate subsystems.

6. Ingestion, concurrency, and persistence rules
ID

Rule or instruction

Active requirement

I-001

25 MB maximum

Enforce the specified maximum upload size of 25 MB.

I-002

Streamed ingestion

Avoid loading large uploads entirely into memory unnecessarily.

I-003

Incremental staging

Validate upload sizes incrementally and stage uploads into controlled storage.

I-004

Checksum integrity

Calculate and preserve SHA-256 checksums for staged inputs.

I-005

Worker handoff

Pass controlled file/job references to background workers rather than large raw file byte arrays.

I-006

Storage cleanup

Implement cleanup of completed, failed, and abandoned staged uploads.

I-007

Storage quotas

Enforce configured staging-storage capacity limits.

I-008

Safe image decoding

Enforce appropriate decoded-image pixel and resource limits.

I-009

Model ownership

Default to controlled model ownership, ordinarily one model instance per worker process unless benchmarking establishes otherwise.

I-010

Bounded inference

Use bounded inference queues and controlled concurrent execution.

I-011

Thread safety

Use safe model checkout/ownership mechanisms where multiple model instances are necessary.

I-012

Database connection budget

Calculate total possible database connections across processes, workers, replicas, and administrative services.

I-013

Separate pool configurations

Keep PostgreSQL-specific and SQLite-specific configurations separate.

I-014

Small initial pools

Use conservative per-process connection pools and calculate their aggregate capacity.

I-015

Async SQLAlchemy

Use appropriate asynchronous pool implementations rather than attaching synchronous QueuePool incorrectly.

I-016

PgBouncer evaluation

Evaluate PgBouncer where appropriate, including pooling semantics and prepared-statement compatibility.

I-017

Failure handling

Test pool exhaustion, connection timeouts, database unavailability, recycling, and transaction rollback.

7. Distributed processing, tests, and observability
ID

Rule or instruction

Active requirement

T-001

Asynchronous processing

Offload expensive OCR jobs to background workers rather than blocking the API gateway.

T-002

Celery integration

Implement the required Celery processing configuration where compatible with the existing architecture.

T-003

Backpressure

Bound queues, retries, concurrency, and worker resource consumption.

T-004

Image-processing tests

Test resizing, preprocessing, cropping, and image-region detection.

T-005

Recognition tests

Test spelling correction, fuzzy matching, exact-value validation, and rejection behavior.

T-006

Error-rate calculations

Calculate Levenshtein-based CER and WER using verified ground truth.

T-007

Held-out evaluation

Maintain separate held-out evaluation datasets rather than evaluating only against training or tuning data.

T-008

Integration tests

Verify API routes, worker handoffs, persistence, and system integrations.

T-009

Regression tests

Preserve existing passing functionality while implementing improvements.

T-010

Canonical metrics

Standardize the metric names and types across the application and Prometheus configuration.

T-011

Accuracy integrity

Do not report CER for unlabelled production screenshots as though verified ground truth exists.

T-012

Operational metrics

Monitor processed documents, failures, latency, queue depth, review-required fields, and rejected fields.

T-013

Alerting

Implement availability, latency, failure-rate, and held-out accuracy alerts.

T-014

Alert verification

Verify that alert rules actually load and fire under controlled test conditions.

T-015

Privacy

Do not expose player identities, personal data, or other sensitive information through metric labels.

T-016

Threshold calibration

Treat suggested thresholds as initial values until calibrated against measured performance.

8. Packaging and deployment rules
ID

Rule or instruction

Active requirement

P-001

Docker packaging

Provide reproducible Docker build and runtime configurations where required by the architecture.

P-002

Multi-stage builds

Use appropriate multi-stage builds to separate build dependencies from runtime dependencies.

P-003

Native libraries

Include and verify required native dependencies such as Poppler and relevant rendering libraries.

P-004

Model-cache handling

Make model weights available locally and verify their runtime accessibility.

P-005

Build warm-up

Evaluate build-time model-cache preparation while separately verifying actual runtime startup and inference.

P-006

Non-root execution

Run production containers under an appropriately restricted Linux user.

P-007

Resource limits

Configure and test memory, CPU, shared-memory, temporary-storage, and concurrency requirements.

P-008

Container verification

Verify native imports, permissions, storage mounts, model files, and operational behavior.

P-009

Reproducible startup

Provide documented and tested local initialization and execution commands.

9. Master plan, documentation, and milestone rules
ID

Rule or instruction

Active requirement

M-001

Master phase structure

Retain the existing 20-phase master implementation plan.

M-002

Four additional work packages

Incorporate model-resource management, database connection budgeting, secure streamed ingestion, and Prometheus alerting.

M-003

Six additional acceptance gates

Track model resources, database resources, secure ingestion, container correctness, monitoring, and release reliability.

M-004

Phase integration

Integrate new work into the existing phases rather than creating duplicate independent implementations.

M-005

Living documentation

Maintain the applicable project documentation as the implementation evolves.

M-006

Change history

Preserve previous decisions, historical information, meaningful changes, and supersession records.

M-007

Cross-references

Cross-reference related requirements, tests, implementation changes, and decisions.

M-008

Milestone records

Record meaningful milestones and the actual state of the project at each milestone.

M-009

Complete handoffs

Ensure handoffs communicate actual current status, outstanding problems, dependencies, and next work.

M-010

Downloadable packages

Produce complete, verified downloadable project packages at meaningful milestone boundaries.

M-011

Original source protection

Preserve original source materials when producing modified or derivative project packages.

M-012

Status language

Distinguish planned, attempted, implemented, tested, verified, and accepted work.

M-013

No duplicate subsystems

Do not create parallel model-management, database, upload, or monitoring implementations without a demonstrated reason.

M-014

Complete lifecycle

Continue through integration and verification, not merely individual component implementation.

10. Release and acceptance rules
ID

Rule or instruction

Active requirement

A-001

Full OCR acceptance

The complete OCR acceptance suite must pass.

A-002

Windows/native-Tesseract gate

The Windows/native-Tesseract environment must be independently verified.

A-003

Discord smoke-test gate

Discord bot operation must pass its separate smoke-test gate.

A-004

No premature RC3 release

RC3 must not be declared release-ready until all required release gates pass.

A-005

Performance verification

Verify resource consumption, concurrency, throughput, and processing latency.

A-006

Accuracy verification

Verify exact-value extraction and field-specific acceptance against approved ground truth.

A-007

Dependency verification

Verify the exact dependency installation and runtime environment.

A-008

Release authorization

Keep production deployment separate from local implementation and testing authorization.

A-009

Final acceptance

Do not claim project completion merely because individual components or unit tests pass.

11. Explicit implementation commands and outstanding conflicts
These are active requirements or reconciliation items from your submitted engineering specification.

ID

Rule or instruction

Active requirement

X-001

Local cluster startup

Preserve the required command docker-compose up --build -d.

X-002

Cluster log verification

Preserve docker-compose logs -f web-api ocr_celery_worker.

X-003

Automated validation

Preserve docker-compose exec web-api pytest -v tests/test_pipeline.py.

X-004

Core OCR pipeline

Provide the specified integrated OCR functionality, including ingestion, preprocessing, model management, layout analysis, table extraction, routing, and metrics.

X-005

Monolithic versus integrated architecture

Reconcile the original request for a single EnterpriseOCRPipeline.py with the later instruction to avoid duplicate subsystems. Do not silently sacrifice either requirement.

X-006

Prometheus scrape interval

Preserve the original 5-second requirement and the later proposed 15-second configuration as a documented conflict pending engineering calibration.

X-007

Accuracy thresholds

Do not treat the illustrative 5% CER threshold as universal acceptance for exact player identities or numeric statistics.

X-008

Alert delivery

Prometheus alert evaluation and Alertmanager notification delivery must be treated as separate capabilities.

X-009

Illustrative database budget

Treat the proposed 80-connection allocation as a planning example, not verified database capacity.

X-010

Source-to-runtime traceability

Every accepted implementation should be traceable to its applicable requirement and verification evidence.

12. Priority and interpretation
The following precedence applies when instructions conflict:

System instructions, safety requirements, and actual tool capabilities.

Your Standing Implement Rule and applicable authorization requirements.

Your latest explicit, project-specific instructions.

Approved DWBOT engineering requirements and master-plan decisions.

Earlier proposals, illustrative configurations, and historical recommendations.

The following decisions are particularly important:

Node.js

22.16.0 required
GitHub working branch

dwbotVis only
GitHub main

Do not modify
Tesseract.js

Preserve baseline
Exact-value validation

Must preserve
Production RC3

Acceptance gates required
Two important qualifications:

The 5-second versus 15-second Prometheus scrape interval remains an explicitly recorded engineering conflict. It must be resolved through measured requirements and documented rather than silently choosing one.

The single-file EnterpriseOCRPipeline.py requirement must be reconciled with the requirement to integrate into the existing architecture without duplicate subsystems.

13. Overall operating commitment
The consolidated rules are now the operating framework for DWBOT in this chat.

The central objective is to build and verify the complete DWBOT application and its OCR improvements, preserve the original engineering requirements, and transfer the complete, usable source tree to GitHub dwbotVis without modifying main.

This table is the consolidated working rule register. It does not establish that every underlying document, archive member, or historical requirement has been exhaustively inspected; those inspection records remain part of the project's evidence and provenance requirements.

# DWBOT / WoWS OCR — Governing Instructions, Consolidated Project Plan, and Next-Chat Handoff

**Document status:** Consolidated working handoff derived from four user-supplied text files  
**Prepared:** 2026-11-03  
**Project:** World of Warships Discord Bot (DWBOT), with a computer-vision-assisted OCR subsystem  
**Canonical format decision:** Markdown (`.md`)  
**Authority note:** This is a carefully consolidated derivative. It does not replace the original project repository, source archives, original 455-page OCR-derived transcript, governing project documents, or actual code. Where source records conflict or cannot be independently verified, the conflict/status is preserved below.

---

# PART 0 — RULES AND INSTRUCTIONS FOR THE NEXT CHAT
## Read and apply this section before doing anything else

These are the active operating instructions for continuing the DWBOT project. They consolidate the supplied instructions and the latest amendments. They apply only within the DWBOT project scope unless a rule is explicitly universal. They do not grant unavailable access or override higher-priority instructions, safety, law, or tool limits.

### 0.1 Project identity and separation

1. The primary project is the **World of Warships Discord Bot (DWBOT)** and its OCR infrastructure.
2. The OCR subsystem's primary domain is WoWS screenshots: battle-result screens, scoreboards, player identities, ship names, battle statistics, teams, outcomes, dates, and other reliably identifiable game-interface fields.
3. Do not merge DWBOT with the separate **Partial Dyson Sphere (PDS)** project. PDS calculations, source documents, decision IDs, technical assumptions, document package rules, and project-specific requirements remain separate.
4. Preserve the existing Node.js Discord bot as the application baseline. Do not replace it with a Python-only document-processing application or a disconnected demonstration.
5. Generic document OCR (PDFs, invoices, forms, multipage documents, generic tables) is an optional, separate profile. It is not a prerequisite for WoWS OCR unless the project is explicitly expanded.

### 0.2 Standing implementation method

For substantial work, follow this cycle:

1. **THINK:** Define the requested result, scope, current state, constraints, dependencies, evidence, risks, and deliverables.
2. **INVESTIGATE:** Inspect the actual available repository, branch, commit, source files, configuration, lockfiles, tests, logs, archives, nested archives, and prior decisions relevant to the work. Search file contents, not only filenames.
3. **REASON:** Identify root causes, viable approaches, compatibility issues, trade-offs, assumptions, conflicts, and uncertainty. Research current external facts when they materially affect the solution.
4. **PLAN:** Select a coherent, modular implementation path. Establish requirement-to-component-to-test traceability and acceptance criteria.
5. **AUTHORIZE:** Confirm that each consequential action is within the user's scoped authorization and permitted by higher-priority rules. Do not treat a request to analyze or recommend as permission to modify, publish, delete, share, transmit, commit, or deploy.
6. **IMPLEMENT:** Make authorized changes in the actual project. Preserve existing working behavior and interfaces. Avoid needless rewrites, duplicate subsystems, disconnected prototypes, and placeholders.
7. **TEST:** Run appropriate unit, integration, regression, negative, compatibility, performance, resource, and end-to-end tests.
8. **DIAGNOSE:** Inspect failures and evidence, classify the failure, and identify the root cause.
9. **CORRECT:** Fix authorized defects and rerun the original failure plus relevant regression tests.
10. **VERIFY:** Inspect actual files, runtime behavior, outputs, test reports, archive contents, and remote repository state before making claims.
11. **REPORT:** Distinguish proposed, planned, authorized, attempted, saved, completed, tested, verified, accepted, rejected, deferred, blocked, and unresolved work.

The user expects autonomous, expert-level technical judgment for ordinary project decisions and authorized implementation. Do not unnecessarily ask the user to choose between routine technical options. However, autonomy does not override higher-priority rules, unavailable access, safety, or explicit narrower task instructions. Pause when a material ambiguity or conflict prevents safe action.

### 0.3 Evidence, provenance, and source integrity

1. Classify material statements as:
   - **Verified fact:** directly supported by inspected evidence or a performed verification.
   - **Source-reported:** stated in a supplied source or earlier report, but not independently verified now.
   - **Assumption:** provisionally adopted; state its basis and effect.
   - **Calculation:** reproducible from identified inputs, units, constants, and equations.
   - **Inference:** reasoned interpretation, not direct observation.
   - **Recommendation:** proposed action, not proof of approval or completion.
   - **Unresolved:** evidence does not establish one definitive conclusion.
2. Preserve original sources, source archives, raw OCR, screenshots, original values, logs, and historical decisions. Make corrections and summaries as traceable derivatives unless the user has authorized changes to the original.
3. Do not silently alter, overwrite, or reconcile conflicting values. Preserve the prior position and append a correction or supersession record with its rationale and evidence.
4. A filename, ZIP listing, previous assistant statement, summary, OCR extract, page count, or test count is not independent proof of source content or current runtime state.
5. Record useful provenance: exact filename, source/origin, byte size, SHA-256, version, format, inspection status, relation to other versions, known damage, omissions, and verification status.
6. Never invent source content, tests, results, dependencies, access, approvals, or completed work.
7. Do not claim exhaustive archive or repository inspection if some files, nested archives, binary assets, or source pages were not inspected.

### 0.4 Runtime rule — latest explicit DWBOT amendment

**The following is the governing runtime rule for this chat and future DWBOT work unless the user changes it:**

1. **Node.js 22.16.0 is an acceptable DWBOT runtime.**
2. Tests that actually passed under Node.js 22.16.0 are acceptable results for that runtime. They do not need to be invalidated merely because another historical plan required Node 24+.
3. Node.js 22.16.0 may be used for future DWBOT purposes, including development and testing, where compatible with the task and dependency set.
4. If a specific test, tool, dependency, or execution requirement genuinely requires Node.js 24 or later, run that requirement using the Node.js 24+ version actually installed and available at that time. Do not falsely label a Node 22 run as a Node 24 run.
5. Record the exact Node version used for each test/build/execution. Maintain lockfile and dependency consistency. Do not silently upgrade Node or dependencies.
6. The earlier requirement in the condensed historical material that Node.js 24.17+ was mandatory is **superseded for general acceptance by this later explicit amendment**. Any test genuinely requiring 24+ remains a separate version-specific test.
7. **Windows compatibility-test direction:** The latest user amendment directs the project to bypass a generic Windows compatibility test where the already-established Windows compatibility information is sufficient, applying that knowledge where relevant rather than repeating a redundant test. Treat this as a waiver of that generic compatibility test, not as a test pass. It does not prove that native Tesseract assets, OCR execution, or Discord integration work on the actual Windows installation; report those separately and do not claim an unrun functional check passed.

### 0.5 OCR architecture and service-use rule — latest amendment

1. Implement the **recommended WoWS Computer-Vision-Assisted OCR pipeline** as the governing OCR direction.
2. Combine computer vision (classical and/or deep learning where justified), image/region localization, text recognition, layout/geometry analysis, field-specific parsing, validation, evidence capture, and review.
3. Keep the pipeline modular and integrated with the existing DWBOT application.
4. **Local-first remains the default processing path.** Preserve the current Tesseract.js path and evaluate local PaddleOCR independently.
5. Network/API calls and external services **may and should be used when necessary and appropriate** to improve accuracy, efficiency, reliability, or coverage, provided the service is free to use and acceptable for the intended data and operation.
6. A network/API fallback is not an automatic replacement for local OCR. Evaluate it as a controlled primary or secondary operation only where evidence supports the benefit.
7. Before sending screenshot or user-derived content to an external service, assess the provider's actual free-tier limits, privacy/retention terms, data handling, rate limits, reliability, availability, security, and technical fit. Minimize transmitted data where practical. Do not introduce paid usage, surprise billing, or an unapproved cost path.
8. Record the provider, endpoint/service, purpose, input scope, data handling assumptions, response, errors, and fallback behavior. Keep local operation viable when the network is unavailable.
9. Do not assume a cloud API is more accurate merely because it is newer or larger. Benchmark it against the same labeled images and exact-value acceptance rules.
10. Do not add unnecessary OCR engines, detectors, VLMs, frameworks, or cloud dependencies. Introduce them only where actual failure analysis or measured benefit justifies them.

### 0.6 Required fields and additional text-field expansion — latest amendment

1. Preserve the existing **strict nine-required-field acceptance rule**, including the historical requirement that XP is mandatory.
2. The complete canonical names of all nine fields must be confirmed from the current authoritative schema/code and actual accepted records. Do not invent the missing field names from an incomplete transcript.
3. Expand the extraction schema to include additional text fields wherever the field and its identifier, title, heading, label, or meaning can be reliably interpreted from supported WoWS screenshots.
4. Additional fields must be introduced in a structured, ordered, backward-compatible way. They must not silently replace or weaken the original nine required fields.
5. Use a field registry/schema with stable field identifiers, display labels, type, source region/layout profile, extraction method, validation rules, required/optional status, and version.
6. Classify fields as:
   - **Core required:** the established nine fields; all existing acceptance requirements remain.
   - **Supported optional:** additional text or metadata fields reliably identifiable and testable.
   - **Conditional:** fields available only on specific screen types, game modes, or layouts.
   - **Unsupported/ambiguous:** retain evidence and mark unavailable/uncertain; do not manufacture a value.
7. A new field is eligible for normal extraction/output only when its label/identifier and value mapping are reliable, its schema is defined, its provenance is preserved, and tests verify its extraction and failure behavior.
8. Expand tests and documentation whenever a new field is introduced. Do not claim a field is implemented merely because OCR can see some text near it.
9. Keep raw text, parsed value, selected/accepted value, and any human correction separate.
10. Never silently autocorrect player names, ship names, numbers, XP, damage, or other exact-value fields.

### 0.7 Images, Excel, and JSON assets from the requested ZIP

1. The user has directed that all images in the specified attached ZIP, in addition to the four images already being tested at the time of that instruction, be included in the project test corpus.
2. The user also directed that the Excel file and JSON file contained in that ZIP be incorporated into the project where they fit their intended use.
3. Inventory the ZIP contents, including nested archives where technically possible. Identify every image, spreadsheet, JSON file, and other relevant project asset.
4. Preserve original assets and provenance. Do not modify source images or spreadsheets merely to make tests pass.
5. Add image assets to the regression/benchmark corpus with stable identifiers, checksums, image metadata, screen/layout category, and field-level ground truth where available.
6. The Excel file must be inspected to determine its actual purpose, formulas, data, and relationship to the DWBOT/OCR project before integration. Do not assume its role from its extension.
7. The JSON file must be schema-inspected, validated, and mapped to the actual project data contract before integration.
8. No such ZIP archive is among the four text files attached to the current task. The archive's presence and contents are therefore **not verified in this review**. This requirement remains active but blocked until the actual ZIP/source archive is available in the working context.
9. The historical filenames mentioned in the conversation include `allFiles.zip`, `DWBOT_RC3_CURRENT_SOURCE.zip`, and `Grand_Tournament_Instruction_Set_v3.22.zip`. Their names in a transcript do not establish that their bytes are currently accessible.

### 0.8 Archive and source inspection

1. Search attached ZIP contents and file contents for project-relevant source, configuration, tests, documentation, assets, and dependencies.
2. Inspect archive member lists and contents, not just filenames.
3. Inspect nested ZIPs/archives recursively where technically possible.
4. Record archive names, sizes, hashes, member counts, nested archive counts, exclusions, unreadable/encrypted files, and inspection coverage.
5. Compare the actual source archive/repository against project requirements and reported checkpoints.
6. Preserve originals and distinguish originals from working copies, corrected copies, and generated derivatives.
7. Never infer that a historical archive is present simply because its name appears in an earlier conversation.

### 0.9 Repository and GitHub rules

1. The historical target repository is `pbrau014/dwbot`.
2. The designated working/delivery branch is `dwbotVis`.
3. **Do not push to, replace, overwrite, or otherwise modify GitHub `main`.** The user explicitly prohibited further attempts to push to `main`.
4. Use the actual repository and current source as the baseline; do not create a disconnected duplicate application.
5. The conversation contains historical references to a separate repository/branch and a request to create a new repository. Later, the project-specific rule set identifies `pbrau014/dwbot` and `dwbotVis` as the governing continuity target. Use the current verified repository state rather than assuming an earlier branch or remote state.
6. The repository was described by the user as intentionally public; do not change visibility. Treat this as a user instruction, not independent verification of current visibility.
7. Exclude secrets, credentials, private `.env` files, live databases, personal information, generated runtime state, and disposable dependency directories such as `node_modules` from ordinary source publication.
8. A local Git commit, Git bundle, ZIP, README, or status report is not equivalent to a successful GitHub source transfer.
9. Verify the actual remote branch commit, tree, file inventory, and important source contents before reporting a transfer as complete.
10. Preserve useful Git history where practical. Never claim a remote push/commit succeeded without remote evidence.
11. A historical report states that DNS resolution for `github.com` blocked a push. That is a **source-reported historical blocker**, not proof of current network status.
12. A later historical report states that `dwbotVis` existed but still pointed to the same starting commit as `main` and contained only a small documentation/evidence tree. This is a historical state report; inspect GitHub now before relying on it.

### 0.10 Engineering quality and safety rules

1. Preserve established interfaces and working functionality unless a justified and authorized change is required.
2. Diagnose root causes, not symptoms.
3. Keep implementations modular and independently testable. Do not combine ingestion, inference, parsing, persistence, routing, and telemetry into one giant file merely because an early generic proposal requested a single `EnterpriseOCRPipeline.py`.
4. Do not add unnecessary frameworks, services, models, APIs, or dependencies.
5. Verify OS, runtime, dependencies, lockfiles, native libraries, environment variables, model files, hardware, and service dependencies.
6. Do not silently upgrade dependencies.
7. Bound memory, CPU/GPU use, file sizes, image dimensions/pixels, queues, concurrency, database pools, retries, and staging storage.
8. Test success, failure, malformed input, boundary conditions, missing values, conflicting OCR candidates, interrupted work, duplicates, resource exhaustion, and recovery.
9. Synthetic tests are not real-world acceptance. Use representative actual WoWS screenshots.
10. Never weaken exact-value validation, security, or acceptance criteria to make tests pass.
11. Do not use placeholders, ellipses, unfinished methods, fake implementations, or TODO shortcuts in deliverable production code.
12. Preserve every original OCR candidate and the reason a candidate was accepted, rejected, or sent for review.
13. Keep confidence scores engine-specific unless calibrated. Engine agreement is evidence, not proof of correctness.
14. Do not silently autocorrect or choose a plausible-looking value. Abstain or request review when evidence is insufficient.

### 0.11 Documentation, change history, and handoff

For each material change:

1. Assign a stable unique ID and date.
2. Identify affected project component/document/section.
3. Record the prior state and new state.
4. Identify source/provenance and verification status.
5. Explain rationale and compatibility impact.
6. Cross-reference superseded or unresolved records.
7. Update relevant project plan, README, changelog, technical documentation, test report, and next-chat handoff.
8. Keep a requirement-to-code-to-test-to-result trace.
9. Distinguish completed, tested, verified, and accepted.
10. Do not claim the PDS-specific seven-document system or its mandatory milestone ZIP release process applies to DWBOT. Adopt its general provenance and handoff principles only where appropriate; keep project-specific PDS rules separate.

### 0.12 ADD-047 boundary

ADD-047 is a conditional, read-only File Library review rule, not a universal requirement to audit the entire Library for every isolated task. Apply it only when its stated Section 14 trigger conditions are met. If triggered, inventory/read the accessible relevant Library material, inspect nested/inspectable archives, reconcile, report coverage and limits, and pause before consequential changes. This current task concerns four specifically attached text files; it does not by itself authorize a broad Library audit.

---

# PART I — EXECUTIVE PROJECT VIEW

## 1. Mission

Build and maintain a reliable, accurate, maintainable, local-first (with controlled free-service fallback where justified), computer-vision-assisted OCR system integrated into the existing World of Warships Discord bot.

The system must transform supported WoWS screenshots into validated, traceable battle records and Discord-compatible output. Accuracy and provenance take priority over plausible-looking output, raw OCR throughput, or a high percentage of fields filled.

## 2. The actual problem being solved

The system is not a generic invoice/document OCR product. WoWS screenshots have relatively predictable interface layouts, but vary by screen type, resolution, UI scaling, image quality, and game state. The core engineering challenge is to identify the correct screenshot layout, isolate the correct field/cell, recognize its content, interpret it under the right field schema, validate it exactly, and retain enough evidence to explain every result.

A wrong player name or plausible but incorrect damage/XP value is more harmful than a field being marked uncertain. The system must be able to abstain.

## 3. Governing design position

- Existing Node.js Discord bot remains the application and integration baseline.
- Tesseract.js remains the preserved baseline OCR engine.
- PaddleOCR is an independent candidate engine and must be benchmarked, not presumed superior.
- OpenCV provides field localization, geometry, preprocessing, and crop support where measurable.
- External free OCR/API services may be used as controlled fallback/secondary paths when necessary and acceptable.
- Field-specific extraction and validation govern the system.
- Raw screenshot evidence and all candidate outputs remain traceable.
- Human review handles unresolved, conflicting, or suspicious values.
- Production readiness is determined by separate evidence-backed acceptance gates.

---

# PART II — SOURCE SET, PROVENANCE, AND RECONCILIATION

## 4. Four files reviewed

| File | Role and content | Important limitation |
|---|---|---|
| `addons.txt` | Five explicit project amendments: Node 22.16.0 runtime acceptance; recommended WoWS OCR pipeline and acceptable free network/API services; expansion beyond nine fields when reliably identifiable/testable; add images, Excel, and JSON from a ZIP; incorporate these changes into the overall plan. | Short instruction file; references an attached ZIP whose contents are not present among the four current attachments. |
| `tstCmd3.txt` | Chronological conversation and operating-rule history, including OCR architecture, source/repository transfer history, user authorization statements, runtime conflict, current branch discussions, and later rule amendments. | Conversation transcript contains historical statements and assistant claims; those are not independently verified current state. |
| `tstCmdCondensed.txt` | Organized derivative consolidating governance, DWBOT architecture, 20-phase roadmap, engineering requirements, source status, acceptance gates, and next actions. | It is explicitly a derivative, not a replacement for the original source PDF, repository, source archives, or governing documents. |
| `tstCmd2_ocr.txt` | OCR-derived transcription of a 455-page source conversation/PDF. Contains original OCR architecture discussion, iterative WoWS-specific recommendations, code proposals, test/report history, production-hardening addenda, and later governance material. | OCR/formatting damage exists. The file also contains PDS material in its later portion; that material must remain separate from DWBOT. Exact names, numbers, code, and identifiers must be checked against originals when material. |

## 5. Source hierarchy and interpretation

Use the following hierarchy when reconciling future project materials:

1. Latest explicit user instruction applicable to the DWBOT task.
2. Actual current source code, schemas, tests, runtime configuration, and repository evidence.
3. Original source archives and authoritative project documentation, once their provenance and contents are verified.
4. The four supplied files, with `addons.txt` treated as the latest amendment for the specific rules it changes.
5. Condensed summaries and historical assistant reports as navigation/context, not proof of current state.

A later user instruction supersedes an earlier conflicting project instruction only within its scope. Preserve the historical conflict and document the resolution. Do not silently erase earlier records.

## 6. Important reconciliations

### 6.1 Runtime

The condensed historical source says Node.js 24.17+ was previously required for full acceptance. `addons.txt` later explicitly says Node.js 22.16.0 is acceptable and tests passing under it are acceptable; Node 24+ is used only when a test genuinely requires it and that version is installed. The later explicit rule governs general DWBOT runtime acceptance.

### 6.2 Local-first OCR versus network/API services

Earlier architecture discussion preferred local-only OCR and rejected cloud OCR APIs in the baseline. The latest amendment authorizes free services and network/API calls when necessary and appropriate. Reconcile this as **local-first with controlled, free, evidence-justified network fallback**, not unrestricted cloud processing and not a mandatory cloud dependency.

### 6.3 Nine required fields versus field expansion

Keep the existing strict nine-field acceptance baseline and mandatory XP. Add reliably identifiable and testable optional/conditional text fields without weakening the original nine. The canonical full nine-field list must be read from current code/schema; the supplied text does not reliably enumerate all nine.

### 6.4 Generic enterprise OCR proposal versus WoWS bot architecture

Early instructions proposed a single Python `EnterpriseOCRPipeline.py`, FastAPI, Celery, Redis, Prometheus, generic table extraction, and Docker stack. Later WoWS-specific analysis correctly identifies that the actual product is an existing Node.js Discord bot with a predictable game UI. Preserve the useful ideas (bounded ingestion, worker isolation, metrics, secure deployment, table geometry where applicable) but integrate them modularly into the actual DWBOT architecture. Do not replace the application or create an unnecessary monolith.

### 6.5 Images, spreadsheet, and JSON

The latest amendment requires their inclusion from a ZIP. The current four attached files do not include that ZIP. Do not pretend the assets have been inspected or added. The requirement is active and must be completed when the archive is available.

### 6.6 GitHub repository state

The historical conversation reports several branch/commit states and failed pushes. Those are not current verification. The designated target in the consolidated DWBOT rules is `pbrau014/dwbot`, branch `dwbotVis`, with `main` protected. Inspect the actual remote state before any further claim or action.

---

# PART III — TARGET ARCHITECTURE

## 7. End-to-end processing flow

```text
Discord attachment / supported screenshot input
                    |
                    v
          Secure screenshot intake
     type, size, decode, hash, provenance
                    |
                    v
       Screenshot classification/profile
   screen type, resolution, UI scale, layout
                    |
                    v
       Computer-vision localization layer
  anchors, templates, scoreboard, teams, rows,
       columns, cells, metadata, ROIs
                    |
                    v
        Field-specific image variants
  preserve original + controlled ROI variants
                    |
                    v
       Recognition adapters (independent)
       Tesseract.js | PaddleOCR | optional
          approved free API fallback
                    |
                    v
       Candidate parsing and field mapping
 raw text, coordinates, engine, model, confidence
                    |
                    v
      Exact-value validation and resolver
  schema, ranges, identity evidence, consistency,
     disagreement, abstention, review routing
                    |
                    v
       Evidence-backed structured record
  raw candidates + selected values + provenance
                    |
           +--------+---------+
           |                  |
           v                  v
   Human review queue     Accepted record
   approve/correct/       and export rules
   reject/defer                 |
           |                   v
           +------------> Discord output
                    |
                    v
      Persistence, metrics, audit, reports
```

## 8. Component responsibilities

| Component | Responsibility | Key design requirement |
|---|---|---|
| Discord intake adapter | Receive attachments and connect to existing bot workflow. | Preserve current commands/events and normal bot behavior. |
| Secure ingestion | Validate actual file bytes, format, dimensions, size, and hash. | Stream to controlled staging; do not duplicate full buffers. |
| Screenshot classifier | Identify supported screenshot and layout profile. | Unknown layouts must be rejected or routed to review. |
| CV/localization | Find scoreboard, teams, rows, columns, cells, metadata, and ROIs. | Preserve original pixel coordinates and mapping. |
| Preprocessing | Generate field-specific variants. | Never destructively replace the original; transformations must be benchmarked. |
| OCR adapters | Tesseract.js, PaddleOCR, and optional approved free API. | Independent adapters; preserve raw results and engine metadata. |
| Parser/schema | Convert candidate strings into typed field candidates. | Raw text and parsed values remain separate. |
| Validator/resolver | Apply field-specific exact-value and consistency rules. | No silent correction; abstain on insufficient evidence. |
| Evidence store | Preserve screenshots, crops, candidates, transformations, decisions, and hashes. | Full field-level provenance and audit history. |
| Review workflow | Allow authorized human decision on uncertain fields. | Corrections never overwrite raw OCR evidence. |
| Persistence | Store jobs, evidence, records, reviews, and audit trail. | Connection budget across all processes. |
| Worker/orchestration | Run OCR outside latency-sensitive Discord handling. | Bounded queue, concurrency, retries, checkpointing, idempotency. |
| Observability | Track health, accuracy, throughput, latency, queue, resource use, and failures. | Do not report CER without ground truth. |
| Discord output | Return validated results and useful error/review states. | Never publish unapproved values as verified. |

---

# PART IV — FIELD MODEL AND EXACT-VALUE RULES

## 9. Canonical field registry

The current authoritative nine-field list must be recovered from the actual code/schema. The following known field families are grounded in the source discussion; they are not asserted to be the complete nine:

- Player name
- Ship name
- Damage
- Experience / XP (mandatory under the reported nine-field rule)
- Kills
- Battle result
- Battle date/time
- Team assignment
- Other supported battle statistics and metadata

The exact canonical nine must be extracted from the actual project implementation and accepted battle records before changing schema or acceptance tests.

## 10. Field expansion design

Each field definition should contain:

- Stable `field_id`.
- Human-readable label/title.
- Field category and data type.
- Required/optional/conditional status.
- Supported screenshot types and layout profiles.
- ROI/column/cell mapping.
- OCR engines and preprocessing profiles allowed.
- Parsing rules and exact-value validation.
- Range/domain constraints where defensible.
- Ground-truth and acceptance test references.
- Provenance and review requirements.
- Schema version and introduction milestone.

### Field introduction gate

A proposed new field may be enabled only after:

1. The visual label/identifier is reliably interpreted.
2. The associated value region is reliably localized.
3. Its meaning and data type are unambiguous in the applicable game context.
4. The field is mapped to a stable schema identifier.
5. Parsing and validation rules are defined.
6. Representative labeled examples exist.
7. Positive, negative, ambiguous, and missing-field tests pass.
8. Existing required-field behavior remains unchanged.
9. Output consumers can tolerate the field or the schema version is updated.
10. Documentation and handoff are updated.

## 11. Exact-value policy

1. Preserve raw OCR candidates from every engine and preprocessing variant.
2. Do not automatically replace a player name with a fuzzy roster match.
3. Do not automatically replace a ship name with the nearest reference-list entry.
4. Do not convert ambiguous digits based on plausibility alone.
5. Do not discard low-confidence candidates; retain them with their confidence and review status.
6. Compare engines field-by-field. Engine agreement is supporting evidence, not proof.
7. Calibrate confidence separately by engine and field.
8. Validate type, syntax, separators, range, layout location, identity, and cross-field consistency.
9. Keep `raw_text`, `parsed_candidate`, `selected_value`, `accepted_value`, and `review_correction` distinct.
10. If evidence is insufficient, mark the field uncertain, conflicting, rejected, unavailable, or requiring review.
11. Preserve legitimate zero values.
12. Preserve fragmented XP/Free XP handling and all established exact-value protections.
13. Never allow an unapproved correction into accepted exports or Discord results.

---

# PART V — ENGINEERING WORK PLAN

## 12. Twenty-one work phases

The 20-phase roadmap from the consolidated source is retained, with the latest asset and field-expansion requirements added as cross-cutting work packages. Phase order is dependency-driven; a phase is not complete merely because code has been written.

### Foundation and architecture

**Phase 0 — Governance, objectives, and engineering rules**
- Confirm the governing rules in Part 0.
- Establish project scope, supported screenshot types, required fields, output contract, security requirements, and release gates.
- Preserve DWBOT/PDS separation.
- Create stable issue/decision/milestone identifiers.

**Phase 1 — Source inventory, project recovery, and reconciliation**
- Inspect actual repository, branches, commits, tags, working tree, source archives, and project documentation.
- Inspect ZIP members and nested archives.
- Identify original source, working source, generated files, historical reports, test images, and ground truth.
- Reconcile the current branch and source tree with reported checkpoints.
- Record inaccessible or unverified files.

**Phase 2 — Requirements, data contracts, and final architecture**
- Recover the complete nine-field schema from code and records.
- Define field registry and extension strategy.
- Define screenshot profiles, job lifecycle, evidence schema, review state, output contract, and API/worker boundaries.
- Map every requirement to implementation and tests.

**Phase 3 — Dependency restoration and environment stabilization**
- Verify Node.js 22.16.0 baseline and all other actual runtimes.
- Record any genuinely Node 24+ test separately and use the installed 24+ runtime when required.
- Verify npm/package lock consistency, Tesseract assets, OpenCV, PaddleOCR/PaddleX/PaddlePaddle, Python environment, native libraries, and model cache.
- Do not silently upgrade dependencies.

**Phase 4 — Ground-truth datasets and baseline acceptance framework**
- Inventory the four existing test images and all additional images once the ZIP is available.
- Preserve original images and hashes.
- Create stable image IDs, screen-type categories, field-level ground truth, and held-out evaluation set.
- Capture baseline Tesseract.js results before changing the pipeline.
- Separate synthetic unit tests from real screenshot acceptance.

### Core OCR implementation

**Phase 5 — Image ingestion and bounded decoding**
- Enforce upload limits at the HTTP/Discord and application layers.
- Validate actual streamed byte count, not only declared size.
- Incrementally hash and stage files to controlled storage.
- Pass file/job references to workers, not large byte arrays.
- Validate file signatures/decodability; enforce pixel/dimension limits.
- Clean staged files on success, failure, cancellation, and abandoned-job recovery.

**Phase 6 — Computer vision preprocessing and image normalization**
- Preserve original color image and coordinates.
- Generate field-specific variants for names, ship names, numbers, icons, and metadata.
- Evaluate scaling, contrast, denoising, sharpening, grayscale, and selective thresholding.
- Do not apply Otsu, morphology, deskew, unwarping, or whole-image rotation indiscriminately.
- Record transform parameters and source-to-crop mapping.

**Phase 7 — ROI localization, scoreboard geometry, and cell extraction**
- Classify screenshot and select the correct layout profile.
- Prefer stable anchors, known coordinates, templates, and geometry for predictable layouts.
- Locate team regions, rows, player-name/ship columns, statistics, metadata, and individual cells.
- Support explicit grid boundaries and measured CV-based detection where needed.
- Preserve row/column identity, bounding boxes, crop coordinates, and original-image mapping.
- Use spatial projection/word-coordinate alignment for genuinely borderless table layouts.
- Flag ambiguous, overlapping, missing, or out-of-bounds cells.

**Phase 8 — Tesseract.js and PaddleOCR recognition adapters**
- Preserve and regression-test the current Tesseract.js adapter.
- Build/verify independent PaddleOCR adapter using the actual installed major API family.
- Historical source reports PaddleOCR 3.7.x, PaddleX 3.7.2, and CPU PaddlePaddle 3.3.1; verify actual versions before relying on them.
- For PaddleOCR 3.x, use its current `predict()` interface and inspect the structured results actually returned.
- Initialize models once per worker lifecycle, not once per field.
- Add a free external API adapter only if justified by benchmark and provider review.
- Keep engine results independent and unmodified.

**Phase 9 — Layout analysis, parsing, and structured extraction**
- Map OCR boxes to scoreboard rows/columns/cells.
- Parse WoWS field formats rather than invoice/document assumptions.
- Build and version the field registry.
- Support core required fields plus validated optional/conditional fields.
- Preserve raw and parsed forms.

**Phase 10 — Exact-value validation and recognition decision engine**
- Apply field-specific validation and confidence policy.
- Compare independent candidates and supporting evidence.
- Detect disagreement and false acceptance.
- Implement abstention and review routing.
- Preserve zero values, fragmented XP/Free XP, and required-field behavior.
- Never silently autocorrect.

**Phase 11 — OCR benchmarking, failure analysis, and iterative accuracy improvement**
- Compare Tesseract.js, PaddleOCR, preprocessing variants, and any approved free service on identical cases.
- Measure exact-match accuracy, CER/WER, coverage, false acceptance, rejection/review rate, localization accuracy, latency, memory, and throughput.
- Generate per-image/per-field reports with original screenshot, crop, variants, engine outputs, expected values, validation, and root-cause category.
- Persist atomic progress as each image/job unit starts and completes.
- Profile crop/PSM passes; remove redundant passes only when measured and regression-tested.

### Application and operations

**Phase 12 — Background orchestration and worker management**
- Integrate with existing DWBOT job flow.
- Use bounded queues and concurrency.
- Initially prefer one model instance per worker process and one active inference per model until measurements justify concurrency changes.
- Use explicit timeouts, task ownership, shutdown, retry, restart recovery, and idempotency.
- Do not queue full file bytes.

**Phase 13 — Persistence, evidence storage, and database integrity**
- Store jobs, screenshots/evidence references, OCR candidates, field values, review actions, accepted records, and audit history.
- Calculate a global database connection budget across every process and service.
- Start with small measured per-process pools and explicit timeouts.
- Keep PostgreSQL-specific connection options separate from SQLite.
- For async SQLAlchemy, use the appropriate async pool rather than attaching synchronous QueuePool.
- Evaluate PgBouncer only when actual connection demand warrants it.
- Test rollback, pool exhaustion, timeout, recycling, unavailable DB, and worker restart.

**Phase 14 — Human-in-the-loop review and approval workflow**
- Show original screenshot, highlighted ROI, raw candidates, confidence, validation reason, and history.
- Support approve, correct, reject, defer/review-later.
- Record reviewer identity/role, old/new values, reason, and timestamp.
- Never overwrite original OCR evidence.
- Keep unapproved corrections out of accepted exports.

**Phase 15 — Secure webhook notifications and downstream integration**
- Integrate only required, authorized downstream systems.
- Use authenticated/signed webhooks where appropriate.
- Apply idempotency, capped retries, exponential backoff, and rate-limit handling.
- Do not retry invalid authorization or invalid payloads indefinitely.
- Keep secrets out of source control.

**Phase 16 — Observability, health monitoring, and alerting**
- Standardize metric names and labels.
- Track stage latency, throughput, queue depth, worker failures, OOMs, model initialization, candidate disagreement, rejection, review, and false acceptance.
- Distinguish ground-truth benchmark CER from human-reviewed production accuracy, candidate disagreement, and rejection rates.
- Never manufacture CER for unlabeled screenshots.
- Alert on sustained latency, queue growth, worker failures, resource exhaustion, accuracy regression, and service unavailability.
- Verify actual scrape and alert behavior; YAML existence alone is not proof.

**Phase 17 — Local packaging, Docker, and Compose orchestration**
- Package only after the real application and worker interfaces are established.
- Use multi-stage builds where useful, native dependencies verified against the selected image, non-privileged runtime user, controlled model cache, permissions, health checks, and resource limits.
- Verify offline runtime model availability if local operation is required.
- Do not assume build-time cache download equals model warm-up or runtime readiness.
- Do not impose a generic FastAPI/Celery/Redis stack unless actual DWBOT needs it.

### Verification and release

**Phase 18 — Continuous integration and automated regression testing**
- Run unit, integration, regression, negative, compatibility, and acceptance tests.
- Include all original and added screenshot cases.
- Include field-expansion tests.
- Preserve exact-value and provenance checks.
- Persist partial progress reports and support interruption recovery.

**Phase 19 — Performance, GPU, memory, and capacity engineering**
- Establish CPU baseline first.
- Measure median/P95/P99 latency, memory, worker utilization, queue depth, and accuracy.
- Test repeated inference, mixed image sizes, memory pressure, and bounded concurrency.
- Enable GPU only after verifying driver/CUDA/Paddle compatibility and actual inference.
- Measure GPU memory, utilization, OOMs, and recovery.
- Do not assume multiple model instances outperform one well-managed instance.

**Phase 20 — Final acceptance, release qualification, and project handover**
- Run the complete acceptance dataset.
- Verify the nine required fields and all approved additional fields.
- Verify exact player/ship/numeric behavior, XP/Free XP, zero values, provenance, review, exports, and Discord workflow.
- Run OCR acceptance and Discord smoke-test gates separately. Apply the user's waiver of redundant generic Windows compatibility testing; perform only any distinct native-Tesseract functional check still required to establish actual OCR operation, and report its status independently.
- Verify the target branch and remote tree.
- Produce a complete handoff and release report.
- Keep production NO-GO until all mandatory gates pass.

---

# PART VI — CROSS-CUTTING HARDENING REQUIREMENTS

## 13. Secure streamed ingestion

The generic proposal's 25 MB limit is a proposed ceiling, not an independently confirmed current project setting. Confirm the actual project requirement before enforcing it.

Required behavior:

- Enforce infrastructure/request limits and application limits.
- Stream in bounded chunks (64 KiB was an example).
- Count actual bytes and calculate SHA-256 incrementally.
- Write to a controlled staging location.
- Avoid validating in chunks and then reading the entire file back into RAM.
- Pass a job reference, checksum, and size to workers.
- Validate actual file format and decoding.
- Limit image pixels, dimensions, pages/frames, and decompression expansion.
- Apply staging quotas and safe filename handling.
- Clean up success/failure/abandoned files.
- Verify worker checksum before processing.

## 14. Model lifecycle and concurrency

- Start with one model instance per worker process and one active inference operation.
- Use a bounded pending queue.
- Record model initialization time, inference time, memory, and failure state.
- Explicitly manage timeout, cancellation, shutdown, and restart.
- Separate CPU and GPU worker profiles.
- Benchmark before adding model replicas or a general thread-safe model pool.
- Do not create four independent OCR engines merely because an early generic proposal suggested it.

## 15. Database connection budget

The source identifies a real pool multiplication risk. Pool size is per engine per process, not per deployment.

- Calculate the maximum possible connections across all API processes, workers, review services, and integrations.
- Start with small measured pools; an illustrative local SQLAlchemy example used `pool_size=3`, `max_overflow=1`, and bounded timeouts. It is not a universal final setting.
- Keep PostgreSQL-only `connect_args` out of SQLite configuration.
- Test connection timeout, statement timeout, recycle, rollback, unavailable DB, and autoscaling multiplication.
- Evaluate PgBouncer only after measuring need and testing its transaction/prepared-statement semantics.

## 16. Retry, idempotency, and partial progress

- Retry transient network failures and HTTP 5xx with capped exponential backoff.
- Honor HTTP 429 guidance.
- Do not endlessly retry invalid authorization or malformed payloads.
- Make job creation, persistence, export, and webhook delivery idempotent.
- Put terminal failures into a durable review/dead-letter state with evidence.
- Persist atomic progress/checkpoints after each image or bounded unit completes.
- On restart, determine completed/running/resumable work without duplicate side effects.
- Preserve partial results when a batch is interrupted.

## 17. Metrics and alerting

Track at least:

- Per-stage and end-to-end latency.
- P50/P95/P99 latency.
- Queue depth and age.
- Jobs started/completed/failed/retried.
- Model load time and inference failures.
- OCR candidate counts and engine disagreement.
- Field completeness, exact-match accuracy, rejection rate, review rate, false-acceptance rate.
- CER/WER only where ground truth exists.
- Localization quality/IoU where labels permit.
- CPU, RAM, GPU memory/utilization, OOMs, worker concurrency.
- Persistence and Discord delivery failures.

A historical example used P95 latency above 30 seconds for five minutes as an alert. Treat that as an example only; derive final thresholds from measured service objectives. An earlier proposal to scrape Prometheus every five seconds is also a proposed configuration, not a verified operational requirement.

---

# PART VII — DATASET, BENCHMARK, AND FAILURE ANALYSIS

## 18. Dataset management

1. Inventory all original test images and all additional images from the requested ZIP once available.
2. Preserve source bytes and calculate SHA-256.
3. Assign stable image IDs.
4. Record screenshot type, resolution, UI scale, source, quality, and known failure category.
5. Record field-level ground truth only when verified.
6. Separate tuning/training examples from held-out acceptance cases.
7. Never tune solely against the held-out acceptance set.
8. Preserve the four original images as baseline cases; additions extend the corpus rather than replacing them.

## 19. Benchmark metrics

Measure per field and per screenshot category:

- Exact-match accuracy for player names.
- Exact-match accuracy for ship names.
- Exact-match accuracy for numeric values.
- CER and WER against verified ground truth.
- Required/optional field coverage.
- Incorrect accepted-value rate.
- Rejection, review, and candidate disagreement rates.
- Localization accuracy and IoU.
- Stage latency, throughput, and end-to-end latency.
- Peak RAM and GPU memory/utilization.
- Queue depth and worker utilization.

Do not optimize CER/WER alone. Incorrectly accepting a wrong battle statistic is a critical failure even if aggregate CER improves.

## 20. Failure categories

Every failed or suspicious field must be classified, at minimum, as one of:

1. File ingestion, decoding, or corruption.
2. Screenshot classification/layout-profile.
3. ROI localization/cropping.
4. Preprocessing.
5. Recognition/model/API.
6. Row/column/cell assignment or reading order.
7. Parsing/schema.
8. Exact-value validation/decision.
9. Unsupported or ambiguous evidence.
10. Worker timeout, queue, concurrency, memory, or resource.
11. Persistence/export.
12. Discord integration.
13. Deployment/runtime/dependency.

The failure report should show the original screenshot, selected crop, processed variants, raw outputs, expected value, validation decision, failure category, root cause, corrective change, and before/after test result.

---

# PART VIII — ACCEPTANCE GATES AND RELEASE STATUS

## 21. Mandatory independent gates

| Gate | What must be proven | Status in this review |
|---|---|---|
| Source/repository reconciliation | Actual source, branch, commit, files, dependencies, and archives inspected. | Not performed against live repository in this task. |
| Runtime | Node 22.16.0 acceptable baseline; exact runtime recorded for each test; 24+ used only where genuinely required. | Rule consolidated; current runtime not verified here. |
| OCR functional acceptance | Original and additional real WoWS screenshots; exact required fields; no false accepted values. | Not run in this task. |
| Field expansion | Each additional field has stable schema, reliable mapping, provenance, and passing tests. | Requirement defined; actual fields/schema not inspected here. |
| PaddleOCR | Actual installed API/model and local inference verified; independent comparison. | Historical versions/prototypes only; not independently verified here. |
| Free API fallback | Provider free terms, privacy, limits, accuracy, failure handling, and benchmark verified. | Authorized as a direction; no provider selected or verified here. |
| Generic Windows compatibility test | Apply known compatibility information and bypass redundant generic testing as directed by the user. | Waived by user direction; this is not a pass. |
| Native-Tesseract functional behavior | Actual native assets and OCR execution verified where required for functional acceptance. | Not run in this task; remains unverified. |
| Discord smoke test | Attachment submission, OCR invocation, output, error handling, and normal bot operations. | Not run in this task. |
| Data/provenance | Hashes, crops, candidates, transformations, validation, review, exports retained correctly. | Historical implementation claims exist; current source not verified here. |
| Security/resource | Upload, image, queue, concurrency, model, database, staging, and secret controls tested. | Requirements consolidated; current implementation not verified here. |
| Observability | Metrics, alerts, health checks, and alert delivery actually operate. | Not run in this task. |
| Repository transfer | Complete source present on `dwbotVis`; remote commit/tree/content verified; `main` untouched. | Historical reports say transfer was incomplete; current remote not checked here. |
| Release qualification | All mandatory gates pass; no unresolved release blockers. | Production status remains NO-GO until proven otherwise. |

## 22. Production NO-GO rule

Do not declare production readiness while any mandatory OCR, Windows/native-Tesseract, Discord, provenance, security, or repository/release gate remains unresolved. A passing synthetic prototype, passing unit tests, successful ZIP integrity check, or successful local commit is not by itself production acceptance.

---

# PART IX — CURRENT HISTORICAL CHECKPOINTS AND OPEN ITEMS

## 23. Reported Iteration 22 checkpoint

The condensed source reports a checkpoint:

- Commit: `74105c9` — “Implement DWBOT iteration 22 OCR provenance hardening”.
- Branch: `feature/dwbot-iteration22`.
- Reported changes: strict nine-field acceptance with mandatory XP; fragmented XP/Free XP geometry improvements; legitimate zero values retained; SHA-256 screenshot provenance and Discord message/attachment references; provenance retained through pending corrections and exports.
- Reported test/check results: 183 passed, 0 failed; 46 focused provenance/export tests; local Tesseract assets; syntax and Git whitespace checks; 449-member ZIP integrity and clean extraction.

**All of the above are source-reported historical results, not independently re-run or verified in this task.** The actual current repository and commit may have advanced.

## 24. Reported later repository-transfer history

The conversation reports:

- A local commit `48319c24e74462665e4c43d54395b4f7cc891f7f` on `feature/dwbot-iteration22`, with 106 files, and a 132 MB Git bundle.
- A later local branch `dwbotVis` and commit `63fdf7317da674bbbff8d9dfb2183af1ec5371d8`.
- A GitHub `dwbotVis` branch created from `main`, but a historical inspection found it still pointed to the starting commit `04d6c0b0e72a223fcf2e77c933336f43f4ddd8ea` and contained only a small documentation/evidence tree (10 entries), not the full application source.
- A DNS failure prevented a reported push attempt.

These are historical transcript statements. They must be checked against current GitHub state before acting. Do not push to `main`.

## 25. Reported OCR runner timeout issue

A later investigation described:

- Batch report written only after the whole batch completed, risking loss of progress evidence on timeout.
- Required improvement: atomic per-image progress reporting and final report, safe writes, checksums/metadata, interruption handling, and recovery.
- Profiling suggested Tesseract was progressing through many serial crop/PSM passes rather than deadlocking; one Hoffmann image reportedly completed 34 passes in about 22 seconds before a deliberately shortened timeout.
- Redundant passes may be removed only when measurement proves they are unnecessary and accuracy/independent evidence is preserved.

The source does **not** establish that the timeout problem was fully fixed or that full screenshot acceptance passed.

## 26. Priority next actions

1. Inspect current DWBOT checkout/repository, active branch, commit, worktree, remote, and source tree.
2. Confirm `dwbotVis` is the designated current delivery branch and verify `main` remains untouched.
3. Inspect current code/schema and recover the exact nine required field identifiers.
4. Inspect the OCR runner's progress persistence and implement/verify atomic per-image checkpoints if still missing.
5. Inventory all available images and ground truth; obtain and inspect the referenced ZIP containing additional images, Excel, and JSON assets.
6. Add all new images to the regression corpus while retaining the original four.
7. Profile crop/PSM passes, cache behavior, latency, and image-level progress.
8. Verify the actual Node 22.16.0 environment and rerun required tests under it; run genuinely Node 24+ tests only when required and using the installed 24+ runtime.
9. Verify Tesseract.js, PaddleOCR adapter/API, model assets, and local inference on the actual environment.
10. Implement/verify field expansion without weakening the nine required fields.
11. Evaluate free external OCR/API fallback only where benchmark evidence indicates value and provider terms/data handling are acceptable.
12. Run full original/additional-image acceptance and preserve all per-image evidence.
13. Run provenance/export and Discord smoke tests. Do not repeat a generic Windows compatibility test that the user has waived; separately verify actual native-Tesseract functionality only where needed to prove the OCR path works.
14. Verify security, streaming, worker, database, metrics, and recovery behavior.
15. Verify complete source transfer to `dwbotVis` and remote tree/content; keep `main` untouched.
16. Update project documents and next-chat handoff. Keep production NO-GO until every mandatory gate passes.

---

# PART X — OPTIONAL GENERIC DOCUMENT OCR PROFILE

This is a separate extension, not the primary WoWS requirement.

If later enabled, it may support PDFs, TIFFs, photos, multipage documents, multi-column layouts, generic tables, forms, and structured exports. Its pipeline can include page-by-page decoding, document preprocessing, text detection, OCR, layout reconstruction, table parsing, JSON/CSV/Excel export, and human review.

For bordered tables, morphological line detection may be suitable. For borderless tables, spatial projection and word-coordinate alignment may be used, with uncertain cell assignments flagged. Generic invoice fields and document assumptions must never be imposed on WoWS records.

The early proposal's exact commands for a FastAPI/Celery/Redis test stack are conditional. Run them only if the actual Compose file defines the named services and the test file exists.

---

# PART XI — NEXT-CHAT STARTUP PROCEDURE

The next chat should:

1. Read this document completely before implementation.
2. Read the actual current DWBOT README, roadmap, project status, changelog, technical docs, and prior handoff.
3. Inspect the actual current repository and `dwbotVis` branch; do not assume historical commit IDs remain current.
4. Confirm `main` is not being modified.
5. Inspect all available source archives and nested archives; search contents, not only filenames.
6. Inspect the current code/schema to recover the canonical nine required fields.
7. Verify Node 22.16.0 and record actual runtime versions for each test.
8. Identify which tests, if any, truly require Node 24+; run those with the installed 24+ runtime and label results separately.
9. Inspect the OCR runner's per-image checkpoint/report behavior.
10. Inventory the existing four images and all newly supplied images; verify checksums and ground truth.
11. Inspect the referenced ZIP's Excel and JSON files before deciding their integration points.
12. Establish current test baseline and reproduce known failures before making changes.
13. Follow the 20-phase plan and acceptance gates.
14. Update the handoff and project documentation as substantive work progresses.
15. Report actual completion/test/verification status accurately; do not claim production readiness prematurely.

---

# PART XII — FINAL EXECUTION COMMANDS FROM THE HISTORICAL GENERIC STACK PROPOSAL

The following commands are retained because they were explicitly requested in the historical plan. They are **not confirmed DWBOT commands** and must be used only if the current repository actually defines `web-api`, `ocr_celery_worker`, and `tests/test_pipeline.py` in its Compose/project layout.

```bash
docker-compose up --build -d
docker-compose logs -f web-api ocr_celery_worker
docker-compose exec web-api pytest -v tests/test_pipeline.py
```

Do not run these blindly against a different repository architecture. Use the actual project's documented commands when its current layout differs.

---

# APPENDIX A — REQUIREMENT TRACEABILITY STARTER

| Requirement | Primary phase/component | Minimum verification |
|---|---|---|
| Node 22.16.0 acceptable | Phase 3 / CI | Test report records exact Node version and results. |
| Node 24+ only when specifically required | Phase 3 / CI | Version-specific test run on installed Node 24+; no conflation with Node 22 results. |
| Local-first CV-assisted OCR | Phases 5–11 | Actual screenshot pipeline; reproducible output and field evidence. |
| Free API fallback where appropriate | Phase 8 / 11 | Provider review, free-tier check, privacy assessment, benchmark, fallback tests. |
| Preserve nine required fields | Phases 2, 9, 10, 20 | Canonical schema and complete exact-value acceptance suite. |
| Add reliable additional text fields | Phases 2, 9, 10, 18 | Stable field registry, provenance, positive/negative/ambiguous tests. |
| Add all ZIP images | Phase 4 / 11 / 18 | ZIP inventory, hashes, test-corpus manifest, ground truth where available. |
| Integrate Excel file | Phase 2 / 13 as applicable | Workbook inspected; role and data/formula dependencies documented; tests if functional. |
| Integrate JSON file | Phase 2 / 9 / 13 as applicable | Schema validation and mapping tests. |
| Preserve source and evidence | All phases | Hashes, provenance, audit records, source/derivative separation. |
| Fix interrupted batch reporting | Phases 11, 12, 18 | Atomic per-image checkpoints; interruption/restart test. |
| GitHub complete source on `dwbotVis` | Phase 1 / 20 | Remote commit/tree/file contents verified; `main` untouched. |
| Production release | Phase 20 | All mandatory gates pass; release status explicitly accepted. |

# APPENDIX B — TERMS THAT MUST NOT BE CONFUSED

- **OCR confidence** is an engine's score; it is not verified correctness.
- **CER/WER** require reference/ground-truth text; do not calculate production CER for unlabeled screenshots.
- **Engine agreement** is supporting evidence, not truth.
- **Exact match** is required for protected identities and numeric fields.
- **Field completeness** is not the same as field accuracy.
- **A passing synthetic test** is not real screenshot acceptance.
- **A local commit** is not a GitHub push.
- **A Git bundle** is not a populated remote branch.
- **A ZIP integrity check** is not proof of correct project content.
- **Model weights cached in an image** are not proof of successful offline inference or warm GPU execution.
- **A generated file** is not automatically tested, verified, or accepted.
- **A source-reported checkpoint** is not independently verified current state.

**End of DWBOT governing handoff.**
