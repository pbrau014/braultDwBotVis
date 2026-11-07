# DWBOT / Grand Tournament — Administrative Executive Summary and Control Record

**Document ID:** ADMIN-00  
**Version:** 0.4 — working control draft  
**Prepared:** 2026-11-06 (live GitHub and artifact audit refresh)  
**Status:** WORKING DRAFT — NOT EVENT APPROVAL, NOT TECHNICAL RELEASE APPROVAL  
**Control scope:** Administrative and technical manual set; governs follow-on manual drafting and evidence reconciliation  
**Authority note:** This document records current instructions and verified evidence. It does not override signed event rules, change the public participant manuals, or convert waived/untested items into passes.

---

## 1. Executive decision

### 1.1 Current disposition

| Area | Current status | Control decision |
|---|---|---|
| Documentation package v3.22 | **GO — documentation package only, under the prior user-directed waiver** | Its release decision applies to the documents/templates only. It does not certify software, scoring, credentials, Discord, or any event instance. |
| DWBOT Gate A | **NOT PASSED / evidence still being reconciled** | Continue using existing, already-submitted PDF/raster artifacts only. No new OCR.Space request. |
| DWBOT Gate B | **NOT PASSED / corrected local-only recovery workflow pending** | The existing 63-PDF normalization step reported success in an older run, but its `continue-on-error` configuration means this is not proof that all images passed. The old local-reader recovery run remains in progress at an earlier source SHA; the corrected source-bound run is pending. |
| Production bot / production OCR | **NO-GO** | No deployment, production Discord actions, or production-data changes. |
| PR #12 — Windows PaddleOCR JSON transport | **OPEN DRAFT; latest shared-serializer correction pending CI** | Keep separate from `main`. The previous Linux full-suite run failed because an older test expected two serializers; the test was corrected to require one shared ASCII-safe emitter. The new PR run is pending; the prior Windows job is still running. Actual screenshot acceptance was skipped in the prior run. |
| PR #13 — PDF raster source-aspect normalization | **OPEN DRAFT; independent 63-PDF geometry audit passed; corrected Gate B recovery in progress** | Keep separate from `main`. Offline code regression passed 386/389 tests (3 skipped) on Windows Node 22.16.0 at code commit `68f4e178`; later PR commits added audit documents. Independent geometry audit: 63/63 PDFs and Gate A first PDF pass. Corrected Windows recovery run is now in progress. |
| PR #15 — evaluator canonicalization and numeric parsing | **OPEN DRAFT; cross-platform regression passed** | Keep separate from `main`; latest Windows and Ubuntu regression jobs passed on Node 22.16.0 (run `42298099146`). |
| Scoring workbook / Score Reporter HTML | **NOT SUPPLIED / NOT TESTED** | No formula or browser parity certification. |
| Event-specific authorization | **NOT APPROVED / NOT COMPLETE** | No event announcement or live event configuration until settings, roster, schedule, contacts, and actual sign-offs are complete. |
| Evidence retention policy | **OPEN** | Retention duration, access roles, deletion authority, and legal/operational hold rules require a documented decision. |

**No provider resubmissions are authorized.** The earlier no-duplicate restriction remains active. A request that may have reached OCR.Space but lacks a definitive response is treated as `UNKNOWN`; it must not be retried automatically. This includes the Gate A first-image question.

### 1.2 Why the documentation GO does not change the DWBOT NO-GO

The v3.22 package explicitly records a user-directed waiver for *publication of the documentation package and reusable templates*. It expressly says waived tests remain `NOT TESTED`, missing sources remain unavailable, and blank event forms are not approvals. The current DWBOT instructions separately require Gate A and Gate B to pass before production. These are different release objects and different scopes; both statements remain true.

---

## 2. Source and authority baseline

### 2.1 Source package inventory

| Source | Archive SHA-256 | ZIP entries | Files | Text-bearing files extracted | Integrity |
|---|---|---:|---:|---:|---|
| `Grand_Tournament_Instruction_Set_v3.22_Production_Documentati.zip` | `de5a4b89f145f3332a6a82a78a68629ce3e3af94a8536b98ed65da967448a8a5` | 181 | 169 | 86 | ZIP CRC test clean; no nested archives found |
| `Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip` | `f8efba7f76260665992cbfd57652f2c47ed3f01ee2d0be2fa478f5997c17fa17` | 66 | 66 | 44 | ZIP CRC test clean; no nested archives found |

The v3.22 package contains the current v3.19-named participant, operations, and technical publications; companion manuals and templates; v3.15 policy-resolved historical baseline; v3.19–v3.22 QA/change ledgers; rendered PDFs; contact sheets; and build/navigation/accessibility records. The v3.17 package is already saved in the ChatGPT Library under `/DWBOT/Source Archives/`. The current Library inventory shows multiple duplicate-safe copies; no additional copy was created during this continuation. Both original archives remain unchanged.

**Newly detected v3.22 package-manifest discrepancy:** an independent recomputation found 166 of the 167 manifest-listed files present with matching SHA-256 values; the manifest-listed `06_Baselines/Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip` is absent from the actual ZIP (the `06_Baselines/` directory entry is empty). Two root files, `yolo_tournament_complete_instruction_set.html` and `.pdf`, are present but not listed in `MANIFEST.sha256`. The archive CRC test is clean, but this does not cure the manifest coverage defect. The separately supplied v3.17 ZIP is present and has its own valid 65-file manifest after accounting for its internal root prefix. Treat the v3.22 package as an intact ZIP with a manifest/content-set discrepancy; do not claim complete manifest coverage until corrected in a separately versioned package.

**Coverage qualification:** archive inventory, checksums, ZIP integrity, text extraction, key control-document review, and selected technical/policy passages have been examined. This is not yet a claim of exhaustive line-by-line semantic review of all 169 files, all 20 PDFs/217 pages, all 11 active DOCX documents, or every contact-sheet image. The v3.22 build record itself describes visual QA as focused rather than exhaustive and accessibility as an automated screen rather than a manual WCAG/legal review. The source review ledger is present and is a useful evidence source, not a substitute for inspecting disputed passages.

### 2.2 Authority hierarchy

1. **Current explicit user instructions and scoped authorizations** govern this work, subject to safety and tool constraints. Current restrictions include no new OCR.Space submissions, no production Discord actions, no deployment, and no production-data changes.
2. **Current DWBOT acceptance contract** governs OCR acceptance: nine required fields, in this exact order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. A missing, invalid, or uncertain required value is unresolved; it is not silently accepted.
3. **Canonical repository `pbrau014/braultDwBotVis`, branch `main`** is the implementation baseline. At the latest live check, `main` was `668335ace6a31121ac8640de09d7bbeea9dbbb85`. This is a point-in-time fingerprint and must be rechecked before any release decision.
4. **Open PRs are proposed derivatives, not accepted mainline source.** PR #12, PR #13, and PR #15 remain separate until their code, tests, evidence, and acceptance conditions are reviewed.
5. **v3.22 documentation package** is the latest supplied tournament documentation release baseline, with a documentation-only waiver. Its participant-facing content retains v3.19 filenames/version labels; the enclosing package is v3.22.
6. **v3.17 archive** is an earlier reorganized package and preserved source baseline, not a replacement for v3.22.
7. **v3.15 policy-resolved baseline and older QA records** are historical evidence. Do not silently rewrite historical findings or treat old runtime results as current RC3 evidence.
8. **Draft companion materials** are procedural proposals or templates unless their own approval records establish otherwise. A released documentation package does not make every legacy `_DRAFT` template an approved event instance.

### 2.3 Source authority and conflict rules

- Preserve source archives unchanged; record derivatives and checksums separately.
- Do not use an older workbook, repaired workbook, rendered HTML, or historical bot archive as a substitute for a missing canonical artifact.
- Do not silently reconcile conflicting requirements. Record the source, the conflict, the operational consequence, and the decision authority.
- Where a current user instruction explicitly sets a stricter DWBOT acceptance rule than a historical manual snapshot, apply the stricter current OCR contract to DWBOT acceptance and flag the public-document inconsistency for controlled correction.
- `GO`, `PASS`, `WAIVED`, `NOT TESTED`, `NOT SUPPLIED`, `OPEN`, `BLOCKED`, and `NO-GO` are distinct states.

---

## 3. Verified project and engineering status

### 3.1 Repository and open changes

**Repository:** `pbrau014/braultDwBotVis`

- `main` was rechecked live and remains `668335ace6a31121ac8640de09d7bbeea9dbbb85`.
- **PR #12:** “Fix Windows PaddleOCR JSON serialization and verify PRs”; open draft, head `d64fb3839c9c22aa8c2a8f97f94a93ba8a25b83a`. The fix changes the Python-to-Node JSON serialization to emit ASCII-safe JSON and preserves the nine-field contract. Review found the initial correction left some early error exits on direct `json.dumps`; PR #12 now centralizes every helper output through one `emit_json` function. The previous full suite failed only because a test still expected two serializers; that test has been corrected and the latest CI run is pending. The actual current-source Tesseract/native screenshot acceptance step was skipped in the prior run; the PR is not accepted and remains separate from `main`.
- **PR #13:** “Normalize OCR.Space PDF rasters to source screenshot geometry”; open draft, head `68f4e178db9cd18f765346d04cfc651613037ee2`. The Windows offline regression run `42297396926` completed successfully: 389 tests, 386 passed, 0 failed, 3 skipped, Node 22.16.0. This includes the PDF-raster normalization and offline OCR contract suites; it does not establish the 63-image or Gate A acceptance result.
- PR #13 Gate B run `42294897496` completed with failure at earlier source SHA `33a32b94e806e228eba561bcdddbe61527b9290e`; the local-reader recovery did not complete acceptance. The corrected run `42297396947` is now in progress. The corrected Gate B run `42297396947` is now in progress. It is provisioning the pinned PaddleOCR CPU runtime/models; the later 63-raster normalization, local-reader recovery, 19-image artifact verification and post-hoc evaluation steps remain pending. No final artifact-verification or post-hoc evaluation report is yet available from this corrected run.
- The older run's step “Normalize and verify all 63 existing searchable-PDF rasters” reported success, but that step is configured `continue-on-error: true`; it can complete while recording per-image failures. The step conclusion alone is **not proof that all 63 PDFs normalized successfully**. A separate read-only geometry audit was completed against the archived PDFs and full-page rasters: 63/63 embedded-image placements and source-aspect crops passed; this validates geometry and crop-to-embedded-image similarity, not original-source byte equality or the Windows implementation run.
- **PR #15:** “Harden Gate B evaluator canonicalization and numeric parsing”; open draft, head `2d9edc7402a6105120ecb15cd74bfa487722c08f`. Cross-platform regression run `42298089737` passed on both Ubuntu and Windows. It tested strict numeric normalization, canonical JSON fingerprints across BOM/LF/CRLF/key-order/Unicode-normalization differences, raw-hash preservation, and artifact-verifier canonical hash behavior. This is targeted regression evidence, not a Gate B result.
- **PR #14:** administrative executive summary draft remains separate from `main`; this v0.3 control document is intended to supersede its earlier v0.1 draft after the document update is reviewed.
- No PR has been merged. `main` remains unchanged. All three engineering PRs remain proposed derivatives until review and acceptance are complete.

### 3.2 Highest-priority OCR engineering correction

The highest-priority technical correction is **source-bound geometry normalization of OCR.Space searchable-PDF rasters**. The PDF page can contain whitespace/margins around the original screenshot; fixed downstream crop coordinates applied to the full page can shift or shrink the effective screenshot region.

PR #13 now implements the following control path:

1. Record and preserve original screenshot dimensions and fingerprint.
2. Preserve the full PDF-page raster, its dimensions, byte count, and SHA-256.
3. Derive a deterministic top-aligned crop from the original screenshot aspect ratio; reject incompatible portrait/unsupported layouts rather than guessing.
4. Preserve a separate normalized raster, transformation metadata, and normalized raster hash.
5. Compare normalized raster pixels with the original screenshot using the bounded source-similarity check; missing similarity evidence or a failed comparison must fail closed.
6. Apply the same source-bound requirement in the PDF-first path, Gate A resume path, Gate B local-only recovery, and artifact verifier.

The PR #13 offline regression passed 386/389 tests (three skips) on Windows Node 22.16.0. This verifies the tested code paths and fixtures only. The older 63-image run reported completion of the normalization step, but its `continue-on-error` behavior means the actual per-image audit must still be read. The corrected Gate B workflow is pending; no end-to-end 63-image or 19-image acceptance is claimed.

**Geometry assumption requiring real-artifact confirmation:** the current crop method assumes the screenshot is a landscape image placed top-aligned at full PDF-page width. Portrait or incompatible layouts are rejected. The actual 63 PDFs and Gate A 16-image corpus must demonstrate this placement and source similarity per image. Any unsupported placement must fail closed and receive a separately evidenced strategy; do not broaden the crop heuristically.

The corrected Gate B recovery now also reads the original source screenshot from the verified source-image root, checks its size/hash/dimensions against the approved ground-truth manifest, and supplies those original bytes to the normalized-pixel comparison. The artifact verifier independently reproduces the crop from the saved PDF and requires the source-similarity evidence. This corrected workflow has contract coverage but is not yet proven against the real 19-image set because its run is pending.

**Acceptance remains pending** until per-image reports prove:
- 63-image PDF/full-page-raster/normalized-raster integrity and source similarity, with all failures and unsupported layouts identified;
- exact 19-image artifact verification;
- local-only Tesseract.js/native Tesseract/PaddleOCR/PDF-text reader recovery and provenance;
- restricted-egress diagnostics with the historical network-log limitation preserved;
- 19-image post-hoc evaluation and all four required metrics;
- Gate A same-source 16-image evidence and its original network-evidence disposition;
- exact source, runtime, dependency, model, and tool fingerprints.

### 3.2.1 Evaluator hash and numeric-normalization correction

PR #15 adds a canonical JSON fingerprint convention for semantic JSON evidence: UTF-8 decoding with optional BOM, Unicode NFC normalization, sorted object keys, compact deterministic serialization, and SHA-256. Raw file-byte hashes remain separately recorded as raw provenance; the canonical hash does not replace raw image/PDF/archive hashes or the raw working-tree hash of the evaluator/verifier source.

The evaluator no longer strips arbitrary non-digits from numeric fields. `credits`, `freeXp`, `damage`, and `xp` accept only non-negative integer strings, optionally grouped consistently in three-digit groups. Malformed alphanumeric strings, signs, decimal fragments, inconsistent grouping, and out-of-range values remain invalid/unresolved. The Windows and Ubuntu targeted regression jobs both passed on PR #15 head `2d9edc7402a6105120ecb15cd74bfa487722c08f`.

PR #15 remains an unmerged draft. Its targeted CI does not yet replace a full end-to-end Gate B report. The evaluator still must be run against the verified 19-image artifacts after the artifact-recovery workflow completes.

### 3.2.2 Independent geometry audit of existing artifacts

**Audit:** `DWBOT_PDF_RASTER_GEOMETRY_AUDIT_2026-11-06` (full Markdown and JSON in `/DWBOT/Engineering Evidence/`; report and compact summary also added to PR #13).

- Existing 63-image PDF archive: **63/63 passed**. Each PDF had exactly one embedded screenshot image, top-aligned at the page origin and spanning the full page width. Embedded image aspect ratios matched the v6 source-image dimensions; the derived crop heights matched the deterministic source-aspect formula.
- The archived full-page raster crops were compared to the embedded PDF image resized to crop dimensions. MAE median/max: **0.867 / 1.763**; RMSE median/max: **2.356 / 5.763**. All were within the audit limits MAE<=3 and RMSE<=8.
- Gate A: the only existing PDF for the 16-image corpus (first image, `Screenshot_16.jpg`) passed the same geometry and embedded-image comparison. The other 15 images have no existing searchable PDF in the supplied recovery artifact and were not submitted.
- Gate A first-image caveat: the prior Tesseract-only result still reports map `Not detected` vs expected `Aegis`. The PDF text layer contains `Aegis - Operations`; this is a separate provider-derived text candidate, not a local OCR result. Geometry correction is necessary but not sufficient to resolve every field.
- This audit did not have the original 63 source-image byte files. It verified source hashes against the v6 ground-truth/run-report metadata and compared normalized page crops to the image embedded in each PDF. It therefore does **not** claim direct original-source pixel identity.
- This independent audit does not replace the corrected Windows/ImageMagick workflow. PR #13 Gate B run `42297396947` is still in progress and must produce the per-image artifacts and reports.

### 3.2.3 Historical Gate A and Gate B acceptance evidence

The previously supplied recovery artifacts establish why both gates remain open:

- **Gate A:** the existing acceptance report is `FAIL`. It records 16 source images, zero completed full records, a missing parallel-reader matrix, zero verified PDFs in the gate summary, and reconstructed-limited network evidence. The separate first-image resume manifest is `FIRST_IMAGE_NOT_EXACT`: 8/9 values matched, with map unresolved (`Not detected` vs `Aegis`). Its source build fingerprint is null. The original network diagnostic log is missing; no zero-attempt claim is valid.
- **Gate B 19:** the prior artifact report is `FAILED`. Source-image hashes, PDF integrity, searchable text layers, raster integrity, and PDF-derived raster provenance passed for the 19 selected images. Local readers failed because the PaddleOCR helper exited with Windows `UnicodeEncodeError` when serializing non-ASCII output. The original network diagnostic log is missing, so historical network restriction remains `NOT_VERIFIED_MISSING_ORIGINAL_LOG`; the empty local-recovery log supports only that later local recovery run.
- Prior 19-image Tesseract.js evaluation: 110/171 exact, 2 wrong candidates, 59 unresolved, 0 wrongly accepted; 2/19 complete nine-field records exact. Native Tesseract: 103/171 exact, 2 wrong candidates, 66 unresolved, 0 wrongly accepted; 0/19 complete records exact. The evaluator separately reports unresolved fields; neither engine passes.
- Prior 19-image diagnostic consensus: permissive four-source consensus had 1 wrong and 39 unresolved; strict four-source consensus had 0 wrong and 112 unresolved. Neither passes. The corrected local-reader and evaluator runs must supersede these historical metrics before any gate decision.

### 3.3 Gate A — required acceptance

Gate A is the 16-image Windows development corpus. Required conditions:
- Exact source/build fingerprint and frozen 16-image manifest.
- All nine required fields evaluated.
- Zero wrongly accepted mandatory values.
- No unresolved mandatory fields for a passing complete-record result.
- Exact expected values and complete-record match evidence.
- Valid searchable PDFs, full-page raster provenance, normalized raster provenance, and local reader outputs.
- No unauthorized network attempts.
- Original network evidence must be present and valid; a newly generated local recovery log cannot retroactively prove that the historical run had network restrictions.
- Windows runtime and all relevant engine/model versions recorded.
- Complete logs, checksums, artifact inventory, and a reproducible report.

**Gate A status: NOT PASSED.** The current PR #13 Gate B workflow successfully discovered a same-source Gate A report/artifact at its report-discovery step, but the report's actual status and evidence still need inspection. Gate A resume work must reuse the existing already-submitted first-image PDF/raster. No fresh provider request is authorized.

### 3.4 Gate B — required acceptance

Gate B uses the user-authorized **19-image complete-ground-truth subset** from the 63-image corpus. This is a documented project-specific reduction from 21; it is not statistically equivalent to a 50-image independent holdout and must not be described as such.

Required conditions:
- Exact 19-image selection and exclusions, source image hashes, and eligible nine-field ground truth.
- Verified source archive, original screenshots, searchable PDFs, full-page rasters, normalized rasters, and derived artifacts.
- Correct source-bound normalization and PDF-derived pixel provenance.
- Local OCR readers only during recovery/evaluation; no provider requests.
- Zero wrongly accepted mandatory values.
- Zero unresolved mandatory fields for a passing complete-record result.
- Exact-match counts and denominators for eligible fields and complete records.
- Per-field error/unresolved counts, candidate conflicts, and incorrect accepted values.
- Original historical network-log status reported honestly; reconstructed or newly generated diagnostics must not be represented as original evidence.
- Full source/build/engine/model/runtime fingerprints and reproducible reports.

**Gate B status: NOT PASSED.** The current local-only recovery and evaluation workflow was still running at the last live check. No success is inferred from a workflow being in progress.

### 3.5 Metrics that must not be conflated

Every OCR evaluation report must separately state:

1. **Eligible-field exact match:** exact values / eligible field comparisons, with field-specific denominators.
2. **Wrongly accepted mandatory values:** count and examples; a single wrong accepted mandatory value blocks the gate.
3. **Unresolved mandatory values:** count and field/image locations; unresolved is not correct.
4. **Complete-record exact match:** records with all nine required fields exactly correct / eligible records.

A result with zero wrong values but many unresolved fields is not a Gate A or Gate B pass. A high field-level percentage is not a substitute for exact complete-record acceptance.

---

## 4. OCR submission, provenance, and recovery control

### 4.1 Provider submission state machine

Use this per-image state machine:

`SOURCE_FINGERPRINTED → SUBMISSION_INTENT_DURABLY_RECORDED → PROVIDER_REQUEST_STARTED → DEFINITIVE_RESPONSE_RECORDED → PDF_DOWNLOADED → PDF_VALIDATED → PDF_HASHED_AND_PRESERVED → FULL_PAGE_RASTER_RENDERED_AND_HASHED → SOURCE_ASPECT_NORMALIZED → NORMALIZED_RASTER_HASHED → LOCAL_READERS_COMPLETE → EVALUATED`

Rules:
- The durable submission-intent/checkpoint must be written before provider bytes are sent.
- An ambiguous timeout, connection loss, process crash, or missing response after request start becomes `UNKNOWN — DO NOT RESUBMIT`.
- A missing PDF or raster does not by itself authorize another billable request.
- Reconcile against provider response records and the durable per-image checkpoint before deciding whether a request ever began or completed.
- Keep the original screenshot, upload bytes/fingerprint, provider metadata, PDF, full-page raster, normalized raster, OCR candidates, accepted values, corrections, and evaluation outputs as distinct linked evidence.
- Never overwrite original artifacts. New outputs use new paths and hashes; existing path collisions must be byte-compared and must fail rather than overwrite if different.
- Do not silently fall back to OCR of the original screenshot if PDF-first processing fails.

### 4.2 Current provider authorization

- Existing 63-image OCR.Space output is exploratory and already submitted.
- Gate A first-image PDF/raster artifacts are to be reused if verified.
- No new OCR.Space requests are authorized under the current instructions.
- Engine 2 PDF-first production scope remains undecided. Until a separate scope decision is recorded, treat Engine 2 PDF-first as an explicitly authorized test path only, not a blanket production architecture approval.
- Public disclosure must not be changed to imply universal production use until that scope is decided and the actual implementation is accepted.

### 4.3 Network evidence classification

Each network record must be classified as:
- `ORIGINAL_CONTEMPORANEOUS` — created during the source run and preserved with it;
- `INDEPENDENTLY_VERIFIED` — validated against a trustworthy original source;
- `RECONSTRUCTED` — recreated from other evidence after the run;
- `NEW_DIAGNOSTIC` — created during a later local-only test;
- `MISSING` or `UNVERIFIABLE`.

Only valid original contemporaneous evidence can establish what the original run logged. Later local-only logs prove only the later run's behavior.

---

## 5. Scoring authority and tournament governance

### 5.1 Scoring authority

The v3.22 documentation baseline specifies:
- Match outcome is calculated from accepted individual performance across applicable published metrics, including Damage and Kills, under the approved scoring method.
- The verified match outcome governs bracket advancement, subject to published tie-breaks.
- Participant-level `dblns`, raw metrics, aggregate/overview averages, match outcome, bracket decision, and individual awards remain distinct but traceable records.
- A raw Damage/Kills value, a standalone `dblns` value, a manual assertion, or an unverified calculator display cannot substitute for the verified match-outcome calculation.
- Published forfeit/void rules may govern cases where ordinary performance scoring does not apply.
- Conflicts require pausing the affected score/bracket action, preserving evidence, and obtaining an authorized ruling.

The v3.22 package documents C01–C06 as selected policies:
- C01 Round 3 stores positive finite elapsed seconds and uses `1 / elapsed_seconds`; invalid values block scoring.
- C02 class weights: DD=4, CA=3, BB=2; blank/unknown classes block scoring.
- C03 retire/hide S10:S12 from participant-facing scoring while preserving historical cells.
- C04 retire/hide Round 4 F8 pool control while preserving it for audit; Rounds 1–3 pool control remains active.
- C05 H12 dollar estimate off by default; historical factor is not a verified currency conversion.
- C06 ordinary settings freeze after event start; ordinary changes are prospective only; emergency pause/cancel/restart requires a scoped, timestamped record; corrections preserve old and new values.

**Implementation status:** canonical workbook and authoritative Score Reporter HTML were not present in the v3.22 active package. The documented designated workbook is `test27xlsm_detailed_audit_polished_regression.xlsm`; the accessible `test27xlsm.xlsm` and formula-repaired copy are historical evidence only. No substitute is accepted. Workbook formula, Excel/VBA, browser calculator, reset, persistence, or parity tests are not certified.

### 5.2 Event-instance approval

Before announcing or configuring a specific Pilot or Recurring event, the authorized organizer must complete and sign the event settings record. At minimum:
- event identity, date, start/end time, and time zone;
- selected Pilot or Recurring format and stage structure;
- approved maps/modes and verified current client labels;
- roster, team composition, substitutes, identity mapping, and lock time;
- ship/class allowlist and any bans;
- schedule, match/series length, tie-breaks, and restart/no-show rules;
- awards/prizes and exact award basis;
- official Discord channels, contacts, support and appeal routes;
- evidence retention and access rules;
- named owner, approving organizer, independent reviewer/appeal contact;
- actual signature and timestamp; effective time/version.

The source material leaves several values blank or conflicting. Do not fill them by inference. Pilot and Recurring templates remain reusable templates until event-specific approval is complete.

### 5.3 Current event format decisions still open

- Exact event dates and timezone.
- Pilot versus Recurring instance and whether the Pilot has any bracket.
- Round 1 exact per-side roster/bot composition.
- Current client exact label for the special Ocean mode; omit it or obtain organizer approval if not verifiable.
- Explicit ship allowlist and any ban list.
- Named award recipients/prizes and award calculation.
- Support, appeal, and independent review contacts.
- Final roster and schedule.
- Actual event approval signatures and effective timestamp.

---

## 6. Security, privacy, and evidence retention

### 6.1 Security controls

- Do not place webhook URLs, tokens, API keys, or credentials in source, browser assets, public docs, logs, screenshots, or public Discord channels.
- The v3.22 source records a previously identified browser-side webhook/posting path in an archived HTML reader. Do not use that archived reader for live participant data.
- Credential revocation/rotation has not been verified. An authorized credential issuer/operator must confirm whether the credential remains live, rotate/revoke it if applicable, and preserve non-secret evidence of the action.
- Inspect the exact RC3/build source, dependencies, packaged assets, source maps, configuration, logs, and HTML before release.
- Any replacement submission path must be server-side/approved, least-privilege, auditable, and require explicit human review before sending.
- Production Discord permissions, role/channel access, bot authentication, attachment handling, rate limits, restart/recovery, and live smoke tests remain unverified.

### 6.2 Evidence retention decision required

The operational retention period is not established in the source baseline. A responsible authority must decide and document:
- retention period for original screenshots, derived PDFs/rasters, OCR outputs, corrections, logs, score results, and event records;
- access roles and least-privilege permissions;
- encryption at rest/in transit and backup protections;
- audit access and export procedures;
- legal/dispute hold rules;
- deletion authorization, verification, and deletion logs;
- whether participant deletion requests or privacy laws impose shorter or longer periods.

Until approved, do not invent a retention duration. Preserve current gate evidence in controlled project storage; avoid adding unnecessary participant data or secrets to public artifacts.

---

## 7. Outstanding decisions register

| ID | Decision | Current state | Interim control / owner |
|---|---|---|---|
| ADM-01 | Gate A first-image provider request | **NOT AUTHORIZED** under current no-new-submission instruction | Reuse existing PDF/raster; do not dispatch. User must explicitly supersede the no-duplicate rule for a specific scoped request before any future submission. |
| ADM-02 | Engine 2 PDF-first production scope | **OPEN** | Test path only; no production-wide claim or public disclosure change. |
| ADM-03 | Canonical workbook identity | **OPEN / NOT SUPPLIED** | Obtain exact designated workbook; do not substitute historic workbook. |
| ADM-04 | Authoritative Score Reporter HTML | **OPEN / NOT SUPPLIED** | Obtain exact source and verify provenance; do not substitute rendered HTML. |
| ADM-05 | Scoring formula and browser parity | **NOT TESTED** | Complete formula/runtime/browser regression after ADM-03/04. |
| ADM-06 | Pilot or Recurring event instance | **OPEN** | No announcement until signed event settings are complete. |
| ADM-07 | Event roster, ship allowlist, schedule, awards, contacts | **OPEN** | Obtain organizer-approved values and publish a versioned settings record. |
| ADM-08 | Evidence retention period and access controls | **OPEN** | Document decision, responsible authority, and deletion/hold process. |
| ADM-09 | Credential rotation/revocation | **NOT VERIFIED** | Authorized issuer/operator must provide non-secret confirmation. |
| ADM-10 | Public manuals vs DWBOT nine-field OCR contract | **CONFLICT IDENTIFIED** | Some operations text describes XP as optional in an older snapshot; current DWBOT acceptance requires nine fields including XP. Preserve source, do not silently edit public manual; reconcile through controlled versioned correction. |
| ADM-11 | Exact runtime acceptance baseline | **VERIFY CURRENT POLICY** | PR checks currently run Node 22.16.0; historical project acceptance notes also cite Node >=24.17.0/Node 26.13.0. Confirm the currently approved Windows target and package engine floor before final acceptance. |
| ADM-12 | Gate B 19-image representativeness | **LIMITATION ACKNOWLEDGED** | 19-image subset is an authorized project exception, not a 50-image independent holdout. Report limitation and avoid statistical overclaim. |
| ADM-13 | v3.22 archive manifest/content discrepancy | **VERIFIED DEFECT IN SUPPLIED PACKAGE** | Preserve the archive unchanged; report 1 missing manifest-listed baseline ZIP and 2 unlisted root HTML/PDF files. The separate v3.17 archive is preserved independently. Any correction requires a new versioned package and new manifest. |
| ADM-14 | Evaluator canonical hashes and strict numeric normalization | **IMPLEMENTED IN PR #15; TARGETED WINDOWS/UBUNTU CI PASS; NOT MERGED** | Keep PR #15 separate from `main`; run against the verified Gate B artifacts after local recovery completes. Preserve canonical and raw hashes as distinct fields. |

---

## 8. Ordered execution plan and control gates

1. Complete source/authority baseline: finish semantic and visual review of v3.22 and v3.17 sources, trace requirements, and resolve conflicts only through recorded authority.
2. Finish PR #12 technical review. Keep it separate from `main` until review and acceptance are complete; its screenshot acceptance step was skipped.
3. Complete PR #13 source-aspect normalization review; inspect per-image reports for all 63 PDFs and the Gate A 16-image corpus. Verify source-pixel similarity and the assumed page layout from real artifacts; correct any unsupported geometry assumptions.
4. Review PR #15 canonical JSON fingerprints and strict numeric parsing; run it against the actual 19-image artifacts after verification. Keep it separate from `main` until review and acceptance are complete.
5. Verify Gate A checkpoint/recovery logic using only existing artifacts. Preserve fail-closed behavior and no-duplicate restrictions.
6. Complete Gate B local-only reader recovery from verified normalized PDF rasters. Confirm PaddleOCR Windows serialization, Tesseract, and other local readers produce traceable candidate outputs.
7. Run the corrected evaluator against verified artifacts. Preserve canonical and raw hashes separately; report all four metrics in §3.5.
8. Re-run Gate B artifact verification and post-hoc evaluation using existing artifacts only. Preserve the original missing-network-log limitation; do not call local recovery evidence historical proof.
9. Improve field accuracy and complete-record exactness without accepting uncertain values. Zero wrong values alone is insufficient if mandatory fields remain unresolved.
10. Only after Gate A and Gate B pass, execute Gate C isolated persistence/recovery: save/restart/reload; fresh backup; restore to a clean test location; compare; rollback to expected prior state. No production data.
11. Gate D release decision bound to exact source fingerprint, environment, test evidence, logs, OCR metrics, recovery results, residual risks, and rollback readiness.
12. Continue parallel documentation and tournament governance work without weakening the gate sequence or changing public manuals without a controlled approval path.

### Gate C — isolated recovery

Gate C is prohibited until both A and B pass. It must test:
- state persistence and restart/reload;
- backup creation and integrity;
- restore into a clean isolated test location;
- record-by-record comparison against expected state;
- rollback to the known prior state;
- interruption and failure recovery;
- audit logs and no duplicate result acceptance.

### Gate D — release decision

Gate D requires:
- exact repository commit and source archive fingerprint;
- lockfile/dependency/runtime and OCR engine/model versions;
- all Gate A/B/C reports and raw logs;
- field-level and complete-record metrics;
- network evidence classification and restrictions;
- security/credential status;
- known issues and risk acceptance;
- backup/restore/rollback readiness;
- named technical approver and authorized release decision.

---

## 9. Follow-on administrative and technical manual set

This executive summary is the control document. The companion set should be created as separate administrative/technical/reference documents, not as replacements for public participant instructions:

| ID | Document | Main content |
|---|---|---|
| ADMIN-00 | Administrative Executive Summary and Control Record | This document; authority, status, risks, decisions, gates, and change control |
| ADMIN-01 | Governance, Roles, and Change Control | Governance model, RACI, approvals, conflicts, decision log, event-instance authority |
| ADMIN-02 | Tournament Administration and Event Runbook | Registration, rosters, schedule, match operations, disputes, awards, communication, escalation |
| TECH-01 | System Architecture and Configuration | Components, data flow, runtime, environments, feature flags, interfaces, schemas |
| TECH-02 | OCR and Evidence Processing | PDF-first state machine, local readers, crops, confidence, candidate reconciliation, human correction, provenance |
| TECH-03 | Reliability, Security, and Recovery | Network boundaries, credentials, least privilege, backup, restore, incident response, retention, recovery |
| REF-01 | Data Schemas and Terminology | Nine-field contract, evidence record, scoring record, statuses, glossary, identifiers |
| REF-02 | Verification and Release Procedures | Gate A–D checklists, reproducible commands, test matrices, artifact manifests, acceptance records |
| TRACE-01 | Requirements Traceability and Source Register | Source-to-requirement links, authority, derivative records, conflicts, unresolved decisions |
| QA-01 | Manual Acceptance and Scenario Test Report | Scenario-based testing, results, defects, coverage, residual risks |

---

## 10. Acceptance scenarios for this control document

The manual set is not complete until it passes at least these scenarios:

1. **Ambiguous provider timeout:** operator sees `UNKNOWN`; system does not resubmit; evidence is preserved and escalated.
2. **Missing/corrupt PDF:** recovery refuses to substitute original screenshot OCR or dispatch a duplicate provider request.
3. **Wrong crop geometry:** PDF page dimensions differ from the assumed layout; normalization fails closed and reports the reason.
4. **One mandatory field unreadable:** report remains unresolved; it cannot become an accepted complete record.
5. **Zero wrong but unresolved fields:** gate remains not passed.
6. **Original network log missing:** report marks historical network evidence missing; a new empty log does not replace it.
7. **Conflicting OCR candidates:** no confidence-only override; human review is required.
8. **Workbook missing:** scoring certification remains blocked; historical or repaired copies are not substituted.
9. **Calculator disagrees with workbook:** no bracket advancement; evidence is preserved and authorized ruling obtained.
10. **Event settings blank or unsigned:** event cannot be announced as approved.
11. **Emergency change after event start:** scoped decision, authority, timestamp/time zone, affected games, notice, and audit record are required.
12. **Credential exposure:** secret is not repeated in logs; issuer rotation/revocation evidence is recorded.
13. **Restore test fails:** Gate C fails; release decision remains NO-GO.
14. **Documentation package waiver:** package publication may be GO while software, event, and operational gates remain NOT TESTED/NO-GO.

---

## 11. Change log and provenance

| Version | Change | Authority / evidence |
|---|---|---|
| 0.1 | Initial control draft created from the supplied v3.22 and v3.17 archives, current DWBOT instructions, and live GitHub status checks. | Source archive hashes in §2.1; source review limitations in §2.1. |
| 0.2 | Added independent SHA-256 manifest reconciliation: v3.22 has one missing manifest-listed baseline ZIP and two unlisted root HTML/PDF files; v3.17's manifest validates when its internal root prefix is applied. | Independent ZIP member/hash recomputation; source archives remain unchanged. |
| 0.3 | Refreshed live repository/PR status; recorded PR #13 source-pixel similarity requirement and pending real-artifact recovery; recorded PR #15 canonical JSON/raw hash separation and strict numeric parsing with successful Windows/Ubuntu targeted CI. | GitHub main SHA `668335ace6a31121ac8640de09d7bbeea9dbbb85`; PR #13 run `42297396926`; PR #15 run `42298089737`; current Gate B run IDs and statuses in §3.1–3.2. |

**Provenance classes for all follow-on manuals:** `SOURCE` (verbatim or faithfully transcribed requirement); `APPROVED_POLICY` (explicitly approved rule); `VERIFIED_FACT` (supported by inspected artifact/test); `DERIVED` (reasoned consequence); `PROPOSED` (recommendation not approved); `UNRESOLVED` (decision needed); `HISTORICAL` (prior state retained for traceability).

**End of ADMIN-00 v0.4 working control draft.**