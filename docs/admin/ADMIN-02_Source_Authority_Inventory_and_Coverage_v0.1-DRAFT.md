# DWBOT / Grand YOLO — Source Authority Inventory and Coverage Report

**Document ID:** ADMIN-02  
**Version:** 0.1-DRAFT  
**Prepared:** 2026-11-06  
**Status:** INVENTORY VERIFIED; SEMANTIC TRACEABILITY IN PROGRESS

## 1. Purpose

Record the original tournament instruction archives and active DWBOT project sources that govern the new administrative/technical/reference manual set. Preserve each archive as a distinct source. Do not silently replace, rename, normalize, or reconcile conflicting versions. This report distinguishes archive integrity from content review, policy authority, implementation, and approval.

## 2. Archive inventory

### SRC-01 — v3.22 source archive

- Library path: `/Grand_Tournament_Instruction_Set_v3.22.zip`
- Bytes: 27,901,317
- SHA-256: `12a69ee2cf880d7d0ebdf97b4e5fa2eff5290c5808f4aed84bf8256204e48b7e`
- ZIP entries/files: 168 / 168
- Embedded manifest: 167 payload entries; 167/167 matched SHA-256.
- Nested archive: `06_Baselines/Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip`.
- PDF set: 20 PDFs, 217 pages total; all 20 extracted successfully as PDF text, no parser errors.
- Text-bearing source files parsed: 104 (Markdown, JSON, DOCX and PDF); zero extraction errors.
- This is the latest v3.22 source archive identified in the Library and active repository baseline.

### SRC-02 — v3.22 Production Documentation derivative archive

- Library path: `/Grand_Tournament_Instruction_Set_v3.22_Production_Documentati.zip`
- Bytes: 25,291,387
- SHA-256: `de5a4b89f145f3332a6a82a78a68629ce3e3af94a8536b98ed65da967448a8a5`
- ZIP entries/files: 181 / 169.
- Embedded manifest: 167 payload entries; 166 matched.
- Manifest exception: the listed nested v3.17 baseline ZIP is absent.
- Two files exist outside the manifest: `yolo_tournament_complete_instruction_set.html` and `yolo_tournament_complete_instruction_set.pdf`.
- All common files compared with SRC-01 had identical SHA-256 values. Differences are the omitted nested baseline ZIP and the two additional renderings.
- **Disposition:** preserve as a derivative release package; do not call its manifest fully verified or use it as the sole archive-integrity authority.

### SRC-03 — v3.17 reorganized release package (newly uploaded)

- Library path: `/DWBOT/Source Archives/Grand_Tournament_Instruction_Set_v3.17_Reorganized_Release_Package.zip`
- Bytes: 4,636,603
- SHA-256: `f8efba7f76260665992cbfd57652f2c47ed3f01ee2d0be2fa478f5997c17fa17`
- ZIP entries/files: 66 / 66.
- Embedded manifest: 65 payload entries; 65/65 matched.
- Nested archives: none.
- Text-bearing files parsed: 56; zero extraction errors.
- Visual material: nine JPG contact sheets covering the 67-page Participant Guide, Event Operations Manual and Technical Reference. All nine contact sheets were visually inspected for page presence, legibility/layout anomalies and broad consistency. This was not a line-by-line visual reading of every source page, nor a WCAG/legal certification.
- The nested v3.17 ZIP in SRC-01 has the same size and SHA-256 as this newly uploaded archive. It is the exact historical source package preserved by v3.22.

## 3. Source precedence

1. **Current DWBOT project authority:** `docs/continuation/DWBOT_CURRENT_AUTHORITY_2026-11-05.md` (current update dated 2026-11-06), `docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md`, and the current living plan. These govern current DWBOT-specific constraints, the nine-field OCR contract, authorized test architecture, runtime minimum, and release/gate state.
2. **Latest tournament documentation package:** SRC-01 v3.22 source archive, supported by its README, RELEASE_INDEX, production-readiness/waiver report and v3.22 ↔ DWBOT alignment record. Its GO is limited to documentation publication under a prior user-directed waiver.
3. **Active v3.19 publication set inside v3.22:** Participant Guide, Event Operations Manual and Technical Reference. Filenames remain v3.19 for reference stability; package/release index is v3.22.
4. **v3.17 historical reorganized package:** SRC-03; the same archive is nested in SRC-01. It is retained for source lineage and comparison.
5. **v3.15 Policy-Resolved Source Baseline:** the underlying historical policy source retained in v3.17/v3.22 baselines.
6. **Companion forms, v1.1 drafts and v0.x proposals:** use only as subordinate operational templates or proposals; they do not create event-specific approvals or override higher-authority policy.
7. **QA and release reports:** evidence only for the exact checks, artifacts and scope they describe. A documentation-only waiver does not turn unrun implementation checks into passes.

### Documentation release waiver versus current software gates

The v3.22 package records a user-directed GO to publish the documentation package and reusable templates while acknowledging missing scoring assets, unrun browser/Excel tests, unverified runtime/credentials/Discord and absent event-specific sign-off. This is not DWBOT production authorization. The current user instruction still requires Gate A and Gate B to pass before Gate C/D and production release; production remains NO-GO.

## 4. Key authority findings

### 4.1 Nine-field DWBOT contract

The current DWBOT contract is exactly:

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

XP is mandatory and ninth/final. The older v3.19/v3.17 eight-field/optional-XP text is historical tournament documentation and does not supersede the later explicit DWBOT application contract. Preserve both statements with provenance; do not edit old source records to make them appear to have always used nine fields.

### 4.2 Tournament match outcome and scoring

The v3.22 governing text says the verified match outcome is calculated from applicable published individual-performance metrics, including Damage and Kills, under the approved scoring method; the verified outcome determines bracket advancement subject to published tie-breaks. Individual performance, match outcome, bracket decision and separately authorized awards must remain distinguishable.

The v3.22 canonical workbook and authoritative Score Reporter HTML are not present in the active source package. The repository's DWBOT workbook and legacy HTML files are not designated substitutes. Scoring implementation parity remains unverified.

### 4.3 Policy and implementation boundary

The v3.17 C01–C06/K01–K13 material provides historical selected scoring policies, equations and validation concerns. The v3.22 policy baseline and DWBOT alignment record provide later precedence and known limitations. No formula should be certified solely from a policy statement, a workbook-like file name, an old browser page, or a test fixture.

### 4.4 Event approval boundary

Pilot and Recurring formats remain separate templates. A reusable template is not an approved event. No dated event instance, time zone, roster, ship allowlist, schedule, awards/prizes, named contacts, retention settings, organizer/approver signatures or effective date are established by the inspected archives. Do not announce an event until the current Event Settings and Publication Approval Record is completed and signed by the responsible people.

### 4.5 OCR and security boundary

Current DWBOT authority specifies OCR.Space Engine 2 PDF-first processing for eligible images in explicitly authorized test inventories, with local readers consuming only PDF-derived rasters. Production screenshot transmission and new OCR.Space submissions remain unauthorized under the current instruction. No automatic retry after an ambiguous request; preserve UNKNOWN state and provider intent. The original 63-image network log is missing; a new local-only log is not historical proof.

## 5. DWBOT source documents inspected

At current main fingerprint `668335ace6a31121ac8640de09d7bbeea9dbbb85`, relevant source documents include:

- `docs/continuation/DWBOT_CURRENT_AUTHORITY_2026-11-05.md`
- `docs/continuation/PROJECT_AUTHORITY_AND_IMPLEMENTATION_RULES.md`
- `docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt`
- `docs/GRAND-TOURNAMENT-V3.22-DWBOT-ALIGNMENT.md`
- `docs/source-baselines/grand-tournament-v3.22/README.md`
- `docs/source-baselines/grand-tournament-v3.22/RELEASE_INDEX.json`
- `docs/source-baselines/grand-tournament-v3.22/05_QA/v3.22_Production_Readiness_and_Waiver_Report.md`
- `docs/source-baselines/grand-tournament-v3.22/07_Score_Reporter_Assets/ASSET_INTAKE_REQUIRED.md`
- `docs/iteration22/NODE-RUNTIME-COMPATIBILITY-POLICY.md`
- `docs/continuation/DWBOT-UPD-2026-11-06-008-gateA-network-reconciliation-and-imagesF-19-analysis.md`
- `docs/continuation/DWBOT-UPD-2026-11-06-009-ocrspace-63-artifact-audit-and-19-posthoc.md`
- `docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md`
- `docs/OCRSPACE_ADAPTER_TEST_RESULTS_2026-11-03.md`
- `docs/PADDLEOCR-FIELD-CROP-FALLBACK-ITERATION20.md`
- `docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.md`
- `docs/security/DISCORD_WEBHOOK_EXPOSURE_2026-11-04.md`

The active DWBOT tree contains `assets/YOLO-Tournament-Workbook.xlsm`, legacy workbook/report HTMLs under `dwbotStuff/`, and desktop UI HTML files. Their existence is not evidence that any one is the missing v3.22 canonical workbook or Score Reporter.

## 6. Coverage and limitations

| Review activity | Coverage | Status / limitation |
|---|---|---|
| v3.22 source ZIP integrity | All 167 manifest payloads | PASS |
| v3.22 derivative ZIP integrity | 166/167 manifest payloads; 2 unmanifested renderings | FAIL / discrepancy recorded |
| v3.17 nested/uploaded ZIP integrity | All 65 manifest payloads | PASS |
| Nested v3.17 identity comparison | Size and SHA-256 exact match | PASS |
| Text extraction | 104 v3.22 source files; 56 v3.17 files | PASS; zero extraction errors |
| v3.17 visual contact sheets | All nine sheets / 67 represented pages | Inspected; layout/legibility scope only |
| v3.22 PDF visual review | 20 PDFs / 217 pages | Text extracted; no new page-by-page visual inspection claimed |
| Tournament policy precedence | README, release index, waiver, v3.22 alignment, v3.17 source and selected policy sections | Initial authority reconciliation; full requirement matrix remains in progress |
| Scoring assets | Asset-intake record and repository candidate inventory | Canonical workbook/HTML not identified |
| DWBOT runtime and gate status | Current authority, live main, PRs and Actions logs | Verified as of 2026-11-06; refresh when new runs finish |
| Full code/asset audit | Not performed in this document | Separate technical review required |
| Event-instance approval | No completed signed record found in reviewed source set | NOT APPROVED |

## 7. Open source reconciliation work

1. Complete a line-by-line requirements comparison of v3.17/v3.15 policy source against v3.22 v3.19 publications; preserve unchanged, revised, superseded, contradicted and unresolved classifications.
2. Build a requirements traceability matrix linking each operative rule to source path/section, authority label, affected role, DWBOT implementation location, verification test, approval evidence and status.
3. Review all companion documents and proposals against the v3.22 release index; preserve DRAFT/PROPOSAL labels where the release index does not expressly supersede them.
4. Review the full v3.22 technical appendix and reconciliation register, including RC01–RC33 and C01–C06/K01–K13, for conflicts with current DWBOT code and user-authorized nine-field requirements.
5. Inventory every scoring candidate, record Git object identity and compute full-file SHA-256 when materialized. Do not choose a canonical asset without owner confirmation and source lineage.
6. Finish manual acceptance scenarios after the technical controls and governance manuals are drafted.

**Coverage statement:** archive inventory, archive hash verification, text extraction, and v3.17 contact-sheet review are complete for the scope listed above. Full semantic line-by-line reconciliation of all v3.22/v3.17 requirements and complete technical asset review remain in progress. No exhaustive review is claimed beyond the coverage table.
