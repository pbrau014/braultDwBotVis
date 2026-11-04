# Grand Tournament v3.22 ↔ DWBOT implementation alignment

**Recorded:** 2026-11-03  
**Status:** Source reconciliation record for DWBOT 2.5.0 / iteration-22 working branch.  
**Source archive:** `Grand_Tournament_Instruction_Set_v3.22.zip`  
**Source archive SHA-256:** `12a69ee2cf880d7d0ebdf97b4e5fa2eff5290c5808f4aed84bf8256204e48b7e`

## 1. Scope and provenance

The v3.22 documentation archive is a governing tournament-policy and operations reference for aligning bot behavior. It is not the bot source tree, not a canonical scoring workbook, and not proof that a running bot implements the documented event rules. Relevant Markdown sources, the release index, selected QA records, and the original archive checksum are preserved in `docs/source-baselines/grand-tournament-v3.22/`. The original uploaded ZIP was not modified.

This record reconciles the parts that directly affect DWBOT intake, OCR, scoring, Discord operation, security, and release. It does not certify the entire documentation package or all 168 archive members as independently audited.

## 2. Operative requirements carried into DWBOT

1. **Evidence-first intake.** A Personal Score/post-battle screenshot is source evidence. OCR output is a candidate, not an official record. Preserve the original screenshot and compare the extracted record to the image before use.
2. **One-value correction workflow.** Ask for one unresolved field at a time. Accept only a valid answer for that field; do not prompt for bulk corrections or invent values. An unresolved mandatory value remains unresolved and routes to human/manual review.
3. **No silent acceptance of conflicts.** Candidate disagreement, unreadable digits, identity ambiguity, or an unexplained scoring discrepancy must not be resolved merely by selecting the highest confidence, a roster-near name, or the value that best fits an outcome.
4. **Auditability.** Preserve source evidence, candidate values, accepted corrections, and subsequent changes as linked records. Do not silently overwrite a prior accepted value or erase correction history.
5. **Credential and participant-data security.** Do not package `.env`, tokens, webhooks, credentials, or private live tournament data. Keep secrets server-side and outside Git history. Use least privilege, protect participant records, and run an exact-release secret scan before distribution.
6. **Manual fallback.** When OCR is unavailable or a required field cannot be established, pause automated acceptance and use the event's approved manual evidence route. Bot availability does not waive evidence requirements.
7. **Release identity.** A runtime test is meaningful only when the tested source fingerprint, Node/npm versions, OCR engine, local assets, fixture hashes, and result artifacts identify the exact build.

## 3. Reconciled contract conflict: eight fields versus nine

The v3.19 Operations Manual §2.2 and older reviewed-bot snapshot text describe eight required fields and classify XP as optional. That is preserved as a historical policy snapshot in the source documents.

The current DWBOT active contract is the later, explicit nine-field contract established in the active `plan1.txt` resumption addendum (2026-10-28) and implemented in `src/battle-record.js`, acceptance scripts, manifests, prompts, and tests:

`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

XP is ninth/final and mandatory. Missing, invalid, ambiguous, conflicting, or incorrect XP blocks acceptance. This current user-approved application contract supersedes the older eight-field text for this bot implementation. Historical source documents and historical reports remain unchanged and must not be misrepresented as describing the current contract. The nine-field implementation is not an instruction to edit ground truth or loosen exact-value validation.

## 4. Scoring, workbook, and match-progression boundary

The v3.22 Technical Reference says the designated canonical workbook is `test27xlsm_detailed_audit_polished_regression.xlsm` and records that it is unavailable in the v3.22 package's accessible source set. It cautions that similarly named/older workbooks are historical evidence only and that archived calculator parity is limited. The same documentation requires the official match outcome to derive from the applicable accepted individual-performance metrics (including Damage and Kills), published scoring method, aggregation, rounding, and tie-break rules.

DWBOT currently has its own bundled `assets/YOLO-Tournament-Workbook.xlsm`, 50-player/four-event model, formula tests, JSON/SQLite persistence, and standings. Those are verified against the bundled project's own source-truth fixture; they are not proven to be byte-identical or mathematically equivalent to the unavailable v3.22 canonical workbook. Do not call the bundled workbook the v3.22 canonical source, and do not infer a match bracket result or advancement rule from the four event scoreboards. The current project scope remains the existing YOLO Tournament bot; event-specific bracket progression, tie-breaks, award decisions, and publication must remain outside automated decisions until the exact canonical workbook and approved Event Settings Sheet are available and parity is tested.

## 5. Discord command and channel boundary

The current bot implementation—not the manual's historical command inventory—is authoritative for the exact commands and permissions that exist in this source. The bot processes messages only in `TARGET_CHANNEL_ID`; tournament admin operations use the implemented Manage Server / `TOURNAMENT_ADMIN_IDS` guard. Do not invent slash commands, admin controls, or role capabilities beyond what the current code and tests establish.

The project intentionally uses one configured channel for intake and public output/recovery snapshots. That means viewers of that channel may see screenshots, records, and snapshot attachments. Keep this behavior as the current project configuration; do not silently create a second channel, change publication scope, or imply participant-only confidentiality. Event-specific privacy requirements must be met through the existing channel's actual permissions and appropriate data minimization.

## 6. Unsafe legacy HTML and optional OCR engines

The v3.22 maintainer guide identifies an archived `score_report_imgToDiscord.html` reader with a browser-side webhook/posting path and explicitly says not to use or distribute it for live participant data. The current repo's `testdata/yolo_tourney_workbook_reference.html` is a workbook-reference test fixture, not evidence that the unsafe reader is part of the live bot. Any future score-reader replacement requires its own source review, secret scan, explicit review-before-send behavior, and security tests.

The current project remains local-first. The integrated PaddleOCR field-crop candidate previously regressed versus the Tesseract-only baseline on the paired reported Windows corpus (111/128 versus 108/128 exact mandatory fields; 7/16 versus 3/16 fully exact records; more wrong accepted fields and higher median latency). Therefore `PADDLEOCR_FIELD_FALLBACK=0` remains the default and it must not be enabled absent a new same-input benchmark showing a real benefit. OpenCV remains diagnostic/feature-gated and must not silently change field acceptance.

## 7. Release-waiver interpretation

The v3.22 README records a user-directed GO for publishing the **documentation package** despite waived gates. The same README and Release Gate Status Record explicitly say waived technical checks remain NOT TESTED, not passes, and that this documentation release does not certify a live bot, scoring calculator, Windows OCR, native Tesseract, Discord integration, credential rotation, or event-specific sign-off.

Accordingly, the documentation publication waiver is not a DWBOT production-release pass. The DWBOT release remains NO-GO until the current exact source passes supported-runtime tests, current-source OCR acceptance, independent holdout, native/Windows validation, live Discord smoke tests, security checks, and backup/restore verification.

## 8. Current implementation consequences

- Preserve the nine-field mandatory acceptance contract and strict exact-value checks.
- Keep one-at-a-time correction, fail-closed conflict behavior, and manual fallback.
- Keep the integrated PaddleOCR fallback disabled.
- Keep all public-channel and storage risks disclosed; do not move output to other channels without an event-approved change.
- Treat bot scoreboards as bot scoring output, not as verified official match/bracket advancement under v3.22 until workbook/policy parity is established.
- Retain the v3.22 source documents in this folder and use the archive hash above to identify the exact source package.

