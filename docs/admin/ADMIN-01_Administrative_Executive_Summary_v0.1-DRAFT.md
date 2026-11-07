# DWBOT / Grand YOLO — Administrative Executive Summary

**Document ID:** ADMIN-01  
**Version:** 0.1-DRAFT  
**Prepared:** 2026-11-06  
**Audience:** Project owner, event organizer, technical maintainer, scoring owner, security reviewer, release coordinator  
**Status:** CONTROL DOCUMENT — WORKING DRAFT / NOT AN EVENT APPROVAL / NOT A RELEASE AUTHORIZATION

---

## 1. Executive decision

**Current overall disposition: NO-GO for production or public event issuance.**

Continue controlled engineering, evidence reconciliation, documentation, and offline testing. Do not announce an event, certify scores, publish a production bot build, deploy, change production Discord configuration, or alter production data until the relevant human approvals and technical gates are evidenced.

The two DWBOT OCR acceptance gates remain **NOT PASSED**:

- **Gate A — 16-image Windows PDF-first acceptance:** the latest recorded run on the current main fingerprint failed. Its report summary was `exact=/16; PDF=0/16`. The run did not establish complete PDF/raster acceptance for the 16-image corpus. The current authorized path is to improve and verify the local pipeline against already-created PDFs and the previously submitted first-image artifact. A new OCR.Space submission is not authorized.
- **Gate B — 19-image complete-ground-truth holdout:** the latest recorded artifact-verification/evaluation run failed. The 19 PDFs/rasters were present in the verifier's integrity summary (`pdf/raster=19/19`), but the report showed `full=0/19`, Gate A was FAIL, and historical network evidence was `NOT_VERIFIED_MISSING_ORIGINAL_LOG`. Local reader recovery reported failures. The 19-image reduction is an explicit project exception, not evidence of statistical equivalence to the earlier 50-image target.

Production remains NO-GO even if isolated unit tests pass. Passing code-contract tests, successful CI jobs, artifact existence, zero wrong values in one candidate strategy, or a documentation QA pass do not individually close either gate.

## 2. Purpose and control-document rules

This document is the administrative control point for the new, separate administrative/technical/reference manual set. It records the present evidence baseline, approved constraints, outstanding decisions, risk posture, and gate conditions. It does not replace:
- the participant-facing Participant Guide;
- the Event Operations Manual;
- the Technical Reference;
- any original source archive;
- a signed event settings/approval record;
- a source-bound test report or release decision.

The new administrative manuals must remain separate companion documents. Do not silently edit, overwrite, rebrand, or merge them into public-facing participant instructions. Keep the original ZIP source archive byte-for-byte unchanged.

### Evidence and authority labels

Use these labels in all companion documents and records:

| Label | Meaning |
|---|---|
| **AUTHORITATIVE SOURCE** | A source explicitly designated as governing for the subject and not superseded by a higher-authority instruction. |
| **USER-AUTHORIZED PROJECT RULE** | A direct user instruction governing this project, within higher-priority constraints. |
| **VERIFIED CURRENT STATE** | A fact checked against the live repository, run, artifact, or inspected source on the stated date. |
| **ORIGINAL EVIDENCE** | A contemporaneous artifact/log created by the original operation. |
| **INDEPENDENTLY VERIFIED** | A separate verification reproduces or checks an original claim against the underlying source. |
| **RECONSTRUCTED** | A later reconstruction from preserved source evidence; not original contemporaneous evidence. |
| **DERIVED** | A new result computed from identified source inputs. |
| **PROPOSED** | A recommendation or draft that has not been approved by the required authority. |
| **UNVERIFIED / UNKNOWN** | Evidence is absent, inaccessible, conflicting, or insufficient. |
| **WAIVED / OUT OF SCOPE** | Explicitly not tested or not required for the stated scope; never label as PASS. |

A statement's status must be attached to the statement, not inferred from the document's overall title or version.

## 3. Source and authority baseline

### 3.1 Tournament documentation source

The latest tournament-documentation authority located in the active DWBOT repository is the **v3.22 Production Documentation Release**. Its source archive identity is recorded as:

- Archive: `Grand_Tournament_Instruction_Set_v3.22.zip`
- SHA-256: `12a69ee2cf880d7d0ebdf97b4e5fa2eff5290c5808f4aed84bf8256204e48b7e`
- Repository-preserved source material: `docs/source-baselines/grand-tournament-v3.22/`
- Materialized Library archive: 27,901,317 bytes; 168 files; 167/167 embedded manifest entries matched; no manifest mismatch.
- The source archive contains a nested v3.17 ZIP. Its exact size and SHA-256 match the newly uploaded v3.17 archive (`f8efba7f76260665992cbfd57652f2c47ed3f01ee2d0be2fa478f5997c17fa17`), confirming that v3.17 is the preserved historical baseline.
- Release disposition: GO for publication of the documentation package and reusable templates only, under a prior user-directed documentation-release waiver. It does not certify scoring, OCR, Discord, credentials, an event instance, or production deployment.

A second Library archive named `Grand_Tournament_Instruction_Set_v3.22_Production_Documentati.zip` is a derivative package, not the verified source archive:
- 25,291,387 bytes; 181 ZIP entries; 169 files.
- Its manifest lists 167 payloads, but only 166 match; the missing entry is the nested v3.17 ZIP.
- It also contains two files not listed in its manifest: `yolo_tournament_complete_instruction_set.html` and `yolo_tournament_complete_instruction_set.pdf`.
- All common files compared byte-for-byte by SHA-256 match the v3.22 source archive; the differences are the omitted nested baseline ZIP and the two unmanifested renderings.
- Preserve this derivative as historical evidence, but do not describe its own manifest as fully verified.

The newly uploaded v3.17 reorganized package is a verified historical source baseline embedded in the v3.22 history, not the newest governing package:

- ZIP: `Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip`
- Size: 4,636,603 bytes; SHA-256: `f8efba7f76260665992cbfd57652f2c47ed3f01ee2d0be2fa478f5997c17fa17`.
- 66 archive entries; 66 files; no nested ZIP archive.
- The embedded `MANIFEST.sha256` lists 65 payload files; all 65 listed hashes matched.
- Text extraction covered 56 text-bearing Markdown, JSON, DOCX, and PDF files with no extraction errors.
- Nine embedded JPG contact sheets represent the three publication PDFs. The package's visual-inspection report states that 67 PDF pages across the three manuals were contact-sheet inspected. Contact-sheet layout review is not substantive, accessibility, legal, scoring, or event approval.
- Saved unchanged to the ChatGPT Library at `/DWBOT/Source Archives/Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip`.

**Precedence:** use v3.22 as the latest tournament-documentation release baseline; retain v3.17 and v3.15 as historical sources for line-by-line change traceability. The v3.22 package waiver only authorizes documentation publication; the current DWBOT Gate A/B and production NO-GO rules remain controlling for software acceptance and operations.

### 3.2 Hierarchy across v3.22, v3.17 and v3.15

1. **v3.22 Production Documentation Release** — latest tournament documentation package recorded in the repository. Its README, RELEASE_INDEX, v3.22 waiver record, and source archive hash establish the package version and a documentation-only release GO under prior user direction. It explicitly says the canonical Score Reporter HTML and designated workbook were unavailable, technical checks remain NOT TESTED, and no event-specific approval or live implementation certification is implied.
2. **v3.19 role-based publications inside v3.22** — Participant Guide, Event Operations Manual, and Technical Reference. Their filenames are v3.19 for reference stability; the enclosing package/release index is v3.22. They are the active publication set under the v3.22 documentation waiver.
3. **v3.17 reorganized package** — historical source ZIP retained unchanged and embedded/referenced by the v3.22 baseline. It reorganizes the v3.15 policy-resolved source into participant, operations and technical manuals. Its embedded manifest verifies 65/65 payload hashes.
4. **v3.15 Policy-Resolved Source Baseline** — retained historical policy source and traceability base for the v3.17 reorganization and later revisions.
5. **v1.1 companion materials and v0.x proposals** — reusable worksheets, focused procedures, and proposals. Their draft/proposal status must be retained unless the v3.22 release index explicitly supersedes the label for documentation publication. They do not establish an event-specific approval or implementation pass.
6. **QA reports/manifests** — evidence of package integrity, navigation, rendering and the stated limits of checks. The v3.22 documentation waiver does not close DWBOT technical gates or approve a live event.

The v3.22 documentation waiver and the current DWBOT software-release gates are separate authorities. Documentation GO is not bot GO, scoring GO, event GO, or production GO.

### 3.3 Key tournament policy baseline

The source records these selected working policies; they are policy specifications, not verified implementation:

- **Match progression vs awards:** recurring bracket advancement follows verified match results and published tie-breaks. Individual Damage / `dblns` is only for the award or seeding purpose expressly declared. Pilot placement is individual total Damage; no bracket exists unless separately announced.
- **C01 — Race time:** positive finite elapsed seconds; target metric is `1 / elapsed_seconds`; lower time produces a higher normalized metric. Invalid values block certification. Historical formula behavior conflicts and implementation/parity remain open.
- **C02 — Class weights:** DD=4, CA=3, BB=2. Blank/unknown classes are invalid, not zero.
- **C03 — Class preferences:** retire/hide S10:S12 from participant-facing scoring; preserve historic cells/data for audit.
- **C04 — Round 4 pool:** retire/hide F8 for Round 4 because the historical formula does not use it; do not confuse this with Rounds 1–3 pool behavior.
- **C05 — Dollar estimate:** H12 OFF by default in participant-facing views; historical factor is not a verified currency conversion or prize value.
- **C06 — Changes after start:** freeze ordinary rules/settings after event start; ordinary changes are prospective only for future/unplayed games. Emergency exceptions require scoped, timestamped, attributable records and notice; corrections preserve original and accepted values.

### 3.4 Event templates and unresolved source conflicts

- Pilot and recurring formats are separate; do not transfer registration, lineup visibility, roster, timing, or progression settings between them.
- Pilot Ocean special-mode labels conflict in the source. Default is to omit the special-mode match unless the installed game client confirms the exact label and the organizer approves it.
- Recurring Race is a separate side-event in the selected template, not the ordinary weekly match. The week 3/6/9/finale placement is a template proposal requiring organizer ratification and actual dated schedule.
- Recurring Round 1's “2v6 against bots” wording does not define both sides. Do not schedule until a per-side roster table is signed.
- Ship allow/banned lists are blank in the source. An explicit current allowlist and bans must be published before registration; an unlisted ship is not approved.
- Dates, time zone, roster, contacts, awards/prizes, event owner, approver, and effective time are missing. The templates are not an issued event notice.

### 3.5 Source-document limitations

The package reports:
- automated structural accessibility checks with zero findings for the listed document set; this is not a WCAG/legal certification;
- internal navigation checks on the prior v3.15 package;
- outgoing links were not checked by instruction;
- visual layout contact-sheet inspection of 67 pages, with dense technical tables still requiring full-size reading for print use.

These are bounded documentation QA claims, not operational acceptance.

## 4. DWBOT repository and engineering baseline

### 4.1 Repository identity

- Repository: `pbrau014/braultDwBotVis`
- Active implementation branch: `main`
- Verified main commit at this review: `668335ace6a31121ac8640de09d7bbeea9dbbb85`
- Repository package: `wows-yolo-tourney-discord-bot@2.5.0`
- Live `package.json` at this fingerprint declares Node `>=22.16.0`.
- The current verification workflow uses Node 22.16.0 on Windows and Linux.

**Runtime authority:** current controlling DWBOT authority and `docs/iteration22/NODE-RUNTIME-COMPATIBILITY-POLICY.md` explicitly authorize Node.js 22.16.0 as the supported minimum and reproducible baseline. It replaces older Node 24+, >=24.17.0 and v24.22.1 minimum/prerequisite statements. Node 24 is optional only for a specifically proven dependency/tool requirement. Windows-specific acceptance must still run on Windows; historical Node 24/26 reports remain bound to their original environment and are not rewritten.

### 4.2 PR #12 — Windows PaddleOCR JSON serialization

- PR #12 remains open and draft, separate from `main`.
- Head branch: `fix/paddleocr-windows-json-output`.
- Head commit: `39c7b56edb84e876c8ddc0ff433023155491c29e`.
- Latest recorded verification run: `42279673591`; Linux offline verification, Windows native Tesseract/persistence, and manual/clean-package jobs all completed successfully.
- The change makes PaddleOCR helper success/error JSON serialization ASCII-safe (`ensure_ascii=True`) and adds protocol regression coverage.
- This is successful CI evidence for that commit, not evidence of Gate A/B accuracy or approval to merge. Keep PR #12 separate until the PR diff, exact checks, and any dependent changes are reviewed and accepted.

### 4.3 PDF screenshot-aspect normalization — PR #13

A likely systematic geometry defect was identified: the OCR.Space searchable PDF is rendered as a full A4 portrait page while the screenshot content is top-aligned and occupies only the upper region. Applying screenshot-relative field crops to the full page raster makes crops target the wrong vertical locations.

The proposed correction is a deterministic crop derived from the source screenshot dimensions and rendered PDF-page dimensions:
- retain the full-page raster and its SHA-256 as separate evidence;
- compute the source-aspect crop rectangle without guessing;
- fail closed for unsupported/portrait/letterboxed layouts;
- feed only the normalized PDF-derived raster to local readers;
- record source dimensions, page raster dimensions/hash, crop transform, and normalized raster hash/dimensions;
- verify normalized raster pixels against a fresh rendering of the preserved PDF;
- never fall back to OCR of the original screenshot.

A draft PR was opened:
- PR #13: `https://github.com/pbrau014/braultDwBotVis/pull/13`
- Branch: `fix/pdf-raster-source-aspect-normalization`
- Latest head when this summary was prepared: `cdc2d06adbe05cc785f802b46c191c400dc9c0c0`
- Draft PR: [#13](https://github.com/pbrau014/braultDwBotVis/pull/13).
- The first targeted Windows run found and corrected three fixture/contract issues; its source-aspect normalizer/provenance test group passed, while the wider offline OCR suite then failed because the workflow had not installed the local Tesseract English language model. The workflow was updated to install the pinned Tesseract package/model.
- Latest targeted Windows regression run: `42289167703`, pending at last check.
- Latest local-only Gate B artifact recovery run: `42289167849`, pending at last check.
- A new no-provider audit now covers all 63 existing PDFs and emits separately fingerprinted normalized rasters; it is wired into the local-only Gate B workflow.
- A Gate A local-only recovery run `42288788959` is in progress against the previously submitted first-image artifact. The commit message explicitly selects the LOCAL-ONLY-RECOVERY path; the paid 16-image provider step is skipped.

**Status:** implementation is in a draft PR and remains unverified end-to-end. The deterministic normalization/provenance test group passed on the prior iteration, but the complete offline suite has not yet passed. Do not call the engineering fix complete until the latest Windows regression, all-63 raster audit, Gate A first-image local recovery, and Gate B 19-image artifact/evaluation runs finish and their reports are reviewed. No OCR.Space request was made by these recovery paths.

### 4.4 OCR architecture constraints

- Keep local Tesseract.js, OpenCV and PaddleOCR as the local reader architecture; do not replace an engine without frozen-fixture evidence.
- Current DWBOT authority specifies OCR.Space Engine 2 as the highest-priority text-extraction stage for eligible original images in explicitly authorized DWBOT screenshot inventories. This describes the authorized test architecture, not blanket production transmission permission.
- Production screenshot transmission, live Discord actions, paid provider usage outside the named test inventory, and deployment remain unauthorized. The user’s current outstanding-decision register leaves the production scope of full-image PDF-first processing unresolved. Until that scope is separately decided, keep Engine 2 use confined to explicitly authorized test inventories; do not change public participant disclosure to imply production use.
- If PDF-first is enabled for an authorized test, the original screenshot is submitted once; a valid searchable PDF is required; the PDF is preserved; downstream local readers consume only the PDF-derived raster.
- A missing/ambiguous provider response or timeout is `UNKNOWN`, not permission to resubmit. Preserve request intent, provider boundary, provider response, PDF download, PDF fingerprint, page-raster fingerprint, normalized-raster fingerprint, and resume state.
- No silent original-image fallback.
- The no-duplicate restriction remains in force. No new OCR.Space request may be dispatched under this document.

## 5. Current gate evidence

### 5.1 Gate A — 16-image Windows PDF-first acceptance

Latest recorded run reviewed: [42270137648](https://github.com/pbrau014/braultDwBotVis/actions/runs/42270137648), job 128072257063.

Observed current-run summary from the job log:
- `DWBOT GATE A: FAIL`;
- exact count was incomplete (`exact=/16`);
- PDF evidence was `0/16`;
- source fingerprint check was true;
- runtime was Node v22.16.0 and the runtime check reported true;
- the local parallel-reader matrix was skipped because no completed source report/PDF audit existed;
- no new provider request was made by the local recovery path.

The historical partial first-image run #42202563673 produced one PDF/raster pair for `Screenshot_16.jpg`; the other 15 images were not submitted. The original run lacked the required restricted-egress guard/allowlist, so its empty/missing network log cannot be reconstructed as proof. Later local-only attempts reused the partial artifact and did not make provider calls. This partial artifact is diagnostic only and cannot satisfy Gate A or authorize a continuation batch.

The new geometry fix must verify the saved PDF and page raster by hash and pixel identity, then create the deterministic source-aspect normalized raster and local-reader evidence. Gate A cannot pass on a single recovered image; all 16 approved development images and the original network-control criteria remain unchanged.

### 5.2 Gate B — 19-image holdout

Latest recorded run reviewed: [42268159303](https://github.com/pbrau014/braultDwBotVis/actions/runs/42268159303), job 128066284095.

The original exploratory source run #42160979140 completed and produced 63 searchable PDFs and 63 PDF-page rasters. Its 81,886,966-byte artifact ZIP was independently matched to the GitHub digest. The 126 PDF/raster files matched their recorded sizes and hashes; all 63 PDFs had non-empty searchable text. This establishes artifact availability and integrity for the original extraction, not OCR accuracy or historical network proof.

Observed 19-image verification:
- selected exactly 19 complete, eligible nine-field records in corpus order; zero overlap with the 16-image development corpus and four-image regression corpus;
- source-image hashes: PASS; PDF integrity: PASS; searchable text: PASS; raster integrity: PASS; PDF-derived raster provenance: PASS;
- local readers: FAIL; Gate A evidence: FAIL;
- original network evidence: `NOT_VERIFIED_MISSING_ORIGINAL_LOG`; original denied-attempt count remains UNKNOWN;
- local recovery provider requests: 0; blocked attempts in the new local recovery log: 0; this new log is not historical evidence;
- overall artifact report: FAIL; `verifiedImageCount=19`; `gateB=NOT_PASSED`.

The 19-image post-hoc diagnostic denominator is 171 eligible values (19 × 9), except PDF/provider text alone which exclude player and therefore have 152 eligible values:

| Reader / method | Exact | Wrong candidates | Unresolved | Exact-match rate |
|---|---:|---:|---:|---:|
| Tesseract.js | 110/171 | 2 | 59 | 64.33% |
| Native Tesseract | 103/171 | 2 | 66 | 60.23% |
| PDF text layer | 73/152 | 2 | 77 | 48.03% |
| OCR.Space parsed text | 79/152 | 17 | 56 | 51.97% |
| PDF + provider consensus | 80/171 | 0 | 91 | 46.78% |
| Four-source consensus | 131/171 | 1 | 39 | 76.61% |
| Strict four-source consensus | 59/171 | 0 | 112 | 34.50% |
| Strict three-source consensus | 104/171 | 1 | 66 | 60.82% |
| Three local-reader consensus | 99/171 | 1 | 71 | 57.89% |

Full nine-field records: Tesseract.js 2/19 exact (17 unresolved); native Tesseract 0/19 exact (19 unresolved). No wrong mandatory values were marked accepted by either individual local reader, but wrong candidates remain diagnostic errors. Four-source and local consensus strategies each produced a wrong candidate; strict strategies eliminated wrong candidates only by leaving most fields unresolved. None satisfies complete-record acceptance.

The one wrong value in four-source or three-local-reader consensus disqualifies that strategy under the zero-wrong rule. The zero-wrong PDF+provider and strict consensus strategies leave 91/171 or 112/171 values unresolved, respectively. A zero-wrong but unresolved strategy is not a pass.

### 5.3 Gate acceptance conditions

- **Gate A:** exact source fingerprint; approved Windows runtime; all 16 approved images; all nine mandatory fields; correct PDF-first artifact provenance; local-reader results; fail-closed behavior; zero wrong accepted mandatory values; complete required record acceptance; restricted-egress evidence appropriate to the run; full logs and report.
- **Gate B:** exact approved 19-image selection and ground truth; all nine fields; verifiable PDF/raster provenance; no source/hash mismatch; zero wrong accepted mandatory values; unresolved fields and exact denominators reported; complete-record exactness; network restriction evidence. Missing historical network logs remain a limitation and cannot be replaced by a newly generated local log.
- Neither gate passes if a mandatory value is wrong, if the required full-record criterion is unmet, if the relevant network restriction failed, or if material provenance is unverified.

### 5.3 Scoring authority and source assets

**Canonical tournament scoring assets remain unidentified.** The v3.22 release record and `07_Score_Reporter_Assets/ASSET_INTAKE_REQUIRED.md` explicitly state that the designated workbook `test27xlsm_detailed_audit_polished_regression.xlsm` and authoritative Score Reporter HTML were not present in the active package. The source record specifically prohibits substituting a similarly named or historic file.

The active DWBOT repository contains related files, but none is currently proven to be the canonical tournament scoring source:

- `assets/YOLO-Tournament-Workbook.xlsm` — DWBOT's bundled workbook. The v3.22 ↔ DWBOT alignment record says it is verified against the bot project's own source-truth fixture, not byte-identical or mathematically equivalent to the unavailable v3.22 canonical workbook.
- `dwbotStuff/test27xlsm.xlsm` and `dwbotStuff/backupWorkbook.xlsm` — same Git blob object ID; historical/backup assets, not the designated canonical workbook.
- `dwbotStuff/scoreReport_dark_clipboard (1).html` and `dwbotStuff/yolo_tournament_scoreCalculator.html` — legacy score/report candidates; no source authority record designates either as the authoritative Score Reporter.
- `dwbotStuff/backupWkbkBrowser.html` and `dwbotStuff/yolo_tourney_workbook_merged (4).html` — same Git blob object ID; workbook-browser/merged artifacts, not certified scoring authority.
- `testdata/yolo_tourney_workbook_reference.html` — test fixture, not the production Score Reporter.
- `desktop/*.html` — DWBOT desktop application pages, not identified as the tournament's canonical Score Reporter.

The source tree's presence of these assets is evidence of candidates and historical derivatives, not authority. Formula and browser parity certification against the official tournament policy is blocked until the exact canonical workbook and authoritative Score Reporter HTML are identified by their owner, version, full-file SHA-256, source lineage, and intended runtime. Do not silently promote one of the candidates.

The current v3.22 policy baseline states that verified match outcome is calculated from applicable individual-performance metrics, including Damage and Kills, under the approved scoring method; that verified outcome governs bracket advancement subject to published tie-breaks. The workbook's exact formula, aggregation, rounding, weights and tie-break implementation remain unverified against the missing canonical asset. The v3.17 C01–C06 policy text is historical traceability input and must be reconciled to the v3.22 source before operational use.

Once the canonical assets are supplied and confirmed, required acceptance is: file/lineage/hash inventory; secret and unsafe browser-posting scan; formula-by-formula workbook oracle tests; numeric normalization and rounding edge cases; Excel/VBA compatibility at the declared supported version; HTML/browser calculations; reset, import/export and persistence behavior; and row-by-row parity for all shared fixtures. A passing DWBOT-internal workbook test does not replace these checks.

## 6. Outstanding decisions and blockers

| ID | Decision / blocker | Current disposition | Required evidence / authority |
|---|---|---|---|
| AD-01 | Continue engineering and documentation; Gate A/B status; production restrictions | Authorized work continues; both gates NOT PASSED; production NO-GO | Maintain this control document and gate-bound reports |
| AD-02 | New guarded OCR.Space request for previously submitted first image | **NOT AUTHORIZED**; no-duplicate restriction remains | A separate explicit, scoped authorization naming image, purpose, request count, cost/quota limit, and safeguards is required |
| AD-03 | Engine 2 production scope | **UNRESOLVED for production**; authorized test inventories use the Engine 2 PDF-first architecture, but production screenshot transmission is not authorized | Explicit product/operations decision; update participant/public disclosure only after approval |
| AD-04 | Canonical scoring workbook and Score Reporter HTML | **UNVERIFIED / BLOCKING** | Identify exact authoritative files, version/hash, owner, source history; run formula, numeric normalization, browser and workbook parity tests |
| AD-05 | Event-instance approval | **NOT APPROVED** | Dated Pilot or Recurring settings, time zone, roster, ship allowlist, schedule, awards, contacts, retention, named owner/approver/reviewer, actual signatures/effective time |
| AD-06 | Evidence retention and access control | **UNRESOLVED** | Approve retention periods and least-privilege access for originals, PDFs/rasters, OCR outputs, corrections, logs, and results; include legal/privacy deletion/hold process |
| AD-07 | Runtime minimum | **RESOLVED** — Node.js 22.16.0 minimum/reproducible baseline; Windows-specific proof remains required | Keep package engines, .nvmrc, CI and manuals aligned; preserve historical runtime reports |
| AD-08 | PR #12 PaddleOCR Windows JSON path | Draft PR; latest CI run success | Complete diff/review and acceptance before merge |
| AD-09 | PR #13 PDF raster normalization | Draft PR; targeted workflow queued | Wait for checks; fix failures; verify existing PDFs and Gate A partial artifact locally without provider calls |
| AD-10 | 63-image original network log | Missing from recovered artifact set | Preserve limitation; do not reconstruct as original evidence |
| AD-11 | OAuth / credential security | Must inspect exact implementation and credential issuer state | No generic PKCE retrofit without identifying actual OAuth client/flow; rotate exposed secrets at issuer and record non-secret evidence |
| AD-12 | Public participant disclosure | Keep current public manuals intact | Only update after Engine 2 production scope and approved evidence-submission workflow are decided |

## 7. Ordered execution plan

1. Complete source/authority baseline and the requirements traceability matrix. Reconcile v3.17 against any later v3.22 package or other project sources without silently replacing either.
2. Review PR #12's exact diff and successful checks; keep it separate from `main` until accepted.
3. Complete PR #13 normalization tests; validate all relevant call sites and checkpoint/recovery paths; use existing 63 PDFs and existing Gate A first-image artifact only.
4. Correct and verify Windows PaddleOCR serialization path and rerun the local-only reader matrix against verified normalized PDF-derived rasters.
5. Audit evaluator canonical hash convention and strict numeric normalization. Preserve raw working-tree hash separately from canonical reproducible source identity.
6. Correct Gate A checkpoint/recovery while preserving no-duplicate and fail-closed rules. Do not dispatch a new OCR.Space request.
7. Re-run Gate B artifact verification and post-hoc evaluation using existing artifacts only. Preserve the missing original network-log limitation. Do not call local recovery logs historical proof.
8. Improve field accuracy and complete-record exactness; show per-field denominators, wrong accepted values, unresolved values, and complete-record count. Do not accept zero-wrong results with unresolved mandatory fields as a pass.
9. Only after Gate A and Gate B pass, run isolated persistence/restart/reload, backup/restore and rollback acceptance (Gate C).
10. Make a source-fingerprint-bound release decision (Gate D) including gate evidence, risks, credential posture, retention/access controls, and rollback readiness.
11. Continue parallel documentation and governance work without changing participant-facing manuals, publishing, deployment, production Discord actions, or production data.

## 8. Risk register

| Risk | Severity | Control |
|---|---|---|
| Wrong mandatory OCR value accepted | Critical | Fail closed; field provenance; cross-reader evidence; zero-wrong acceptance gate |
| PDF page whitespace corrupts crop geometry | High | Source-aspect normalization; preserve full-page and normalized rasters; pixel-level provenance check |
| Duplicate paid provider submission after ambiguous timeout | Critical | Durable intent checkpoint; UNKNOWN state; no automatic retry; explicit separate authorization |
| Missing original network log misrepresented as a pass | High | Evidence labels; preserve missing-log limitation; never substitute reconstructed logs |
| Wrong workbook/HTML treated as canonical | Critical | Fingerprint exact files; no substitutions; workbook/browser parity and independent review |
| Event template mistaken for approved event | Critical | Dated signed settings record and publication approvals before announcement |
| Credential exposure or browser-side webhook path | Critical | Exact-build source/asset scan; issuer-side rotation proof; server-side secrets only |
| Unclear evidence retention/access | High | Approved retention schedule, least privilege, audit logs, deletion/legal-hold process |
| Conflicting runtime requirements | High | Resolve and align source manifest, CI, target Windows runtime and documentation |
| Public/admin manuals contradict | High | Requirements traceability matrix; versioned crosswalk; acceptance scenarios |

## 9. Governance and release authority

- The project owner controls policy decisions and authorizes scoped project changes.
- The organizer/approver must sign event-specific settings and publication approval; a draft worksheet is not a signature.
- The scoring owner identifies the canonical workbook/calculator and approves formula/parity evidence.
- The technical maintainer owns source identity, test execution, release packaging, credentials and rollback evidence.
- The independent reviewer verifies high-risk changes, source fingerprints, gate evidence and correction records.
- A person may hold more than one operational role only if the event settings record says so; appeals/review should be non-conflicted.
- No assistant-generated name, date, signature, approval, event setting or credential-rotation claim may be substituted for the responsible human's real action.

## 10. Definition of done for this control document

ADMIN-01 is ready for controlled use when:
1. the source inventory and hash verification are attached;
2. the current repository and gate evidence references are refreshed against the exact source fingerprint;
3. every claim is labeled as source, user-authorized, verified, reconstructed, derived, proposed or unresolved;
4. unresolved decisions remain visible and are not filled by assumption;
5. the companion manuals and traceability matrix cite this document and the underlying source records;
6. no public-facing instruction or original archive has been overwritten.

**This draft records a NO-GO state. It does not approve an event, score, OCR production scope, bot deployment, or release.**

---

## Source register

| Ref | Source | Identity / location | Use and limitation |
|---|---|---|---|
| SRC-01 | Uploaded v3.17 release ZIP | SHA-256 `f8efba7f76260665992cbfd57652f2c47ed3f01ee2d0be2fa478f5997c17fa17`; Library path recorded in §3.1 | Original archive; 65/65 embedded payload hashes verified |
| SRC-02 | v3.15 Policy-Resolved Source Baseline | `05_QA/Grand_Tournament_Instruction_Set_v3.15_Policy_Resolved_Source_Baseline.md` in SRC-01 | Tournament policy source and D01–D52/C01–C06 traceability baseline |
| SRC-03 | v3.17 Participant Guide | `01_Participant/...` in SRC-01 | Participant-facing derivative; draft, not issued |
| SRC-04 | v3.17 Event Operations Manual | `02_Operations/...` in SRC-01 | Operations derivative; draft, not issued |
| SRC-05 | v3.17 Technical Reference | `03_Technical_Reference/...` in SRC-01 | Technical/scoring derivative; draft, not certified |
| SRC-06 | v3.17 companion crosswalk and eight v1.1 companion files | `04_Companion_Materials/` in SRC-01 | Focused drafts and approval worksheets; not approvals |
| SRC-07 | v3.17 QA reports and manifest | `05_QA/`, `MANIFEST.sha256` in SRC-01 | Package/document QA; bounded scope only |
| SRC-08 | Current DWBOT repository | `pbrau014/braultDwBotVis`, main `668335ace6a31121ac8640de09d7bbeea9dbbb85` | Current implementation baseline at review time |
| SRC-09 | Gate A run | [42270137648](https://github.com/pbrau014/braultDwBotVis/actions/runs/42270137648) | Failed; 0/16 PDF evidence |
| SRC-10 | Gate B verification run | [42268159303](https://github.com/pbrau014/braultDwBotVis/actions/runs/42268159303) | Failed; 19/19 PDF/raster integrity but 0/19 full records, missing original network log |
| SRC-11 | PR #12 | [fix/paddleocr-windows-json-output](https://github.com/pbrau014/braultDwBotVis/pull/12) | Draft PR, CI success at reviewed head; not merged |
| SRC-12 | PR #13 | [fix/pdf-raster-source-aspect-normalization](https://github.com/pbrau014/braultDwBotVis/pull/13) | Draft PR, targeted Windows workflow queued at last check; not verified |
| SRC-13 | User-authorized DWBOT constraints | Current conversation/project instructions | Nine mandatory fields, local OCR architecture, no duplicate provider calls, production restrictions |
| SRC-14 | v3.22 source archive | Library `/Grand_Tournament_Instruction_Set_v3.22.zip`; SHA-256 `12a69ee2cf880d7d0ebdf97b4e5fa2eff5290c5808f4aed84bf8256204e48b7e` | 168 files; 167/167 manifest payloads verified; contains the exact v3.17 archive |
| SRC-15 | v3.22 Production Documentation derivative ZIP | Library `/Grand_Tournament_Instruction_Set_v3.22_Production_Documentati.zip`; SHA-256 `de5a4b89f145f3332a6a82a78a68629ce3e3af94a8536b98ed65da967448a8a5` | 169 files; 166/167 manifest entries match; one nested baseline ZIP absent and two renderings unmanifested; not fully manifest-verified |
