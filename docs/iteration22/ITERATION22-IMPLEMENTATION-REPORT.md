# DWBOT Iteration 22 Implementation Report

**Date:** 2026-11-03  
**Branch:** `feature/dwbot-iteration22`  
**Baseline commit:** `c4475af`  
**Status:** Active local implementation; production NO-GO.

## Scope and source lineage

Iteration 22 continues the WoWS YOLO Tournament Discord Bot (DWBOT) from the imported RC3/milestone-nine baseline. The active exact acceptance contract requires nine fields in order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`. XP is mandatory and ninth/final. Historical eight-field/optional-XP records remain preserved and are superseded for current execution.

The working repository is local at `/mnt/data/wows-yolo-tournament-discord-bot-ocr`, branch `feature/dwbot-iteration22`. The source inputs are retained byte-for-byte under `provenance/input-archives/` and independently identified by the hashes recorded in `plan1.txt`. No Git remote is configured. No GitHub repository creation or push is claimed.

## Implemented changes in this checkpoint

- Acceptance comparison fails closed unless all nine required fields exist, are non-empty, and match exactly. Legacy acceptance rows without explicit `allRequiredFieldsPass` fail closed.
- Reference regression consumes the shared required-field contract rather than a second hard-coded list.
- Reward geometry has narrow fragmented XP / Free XP grouping safeguards. Crop geometry does not expand accepted numeric limits; Free XP leading-digit grouping requires tighter alignment evidence.
- Four-image orchestration delegates to a supervised sequential child runner, checks fixture order/report completeness, requires close confirmation, and validates the local network-block configuration.
- Shared numeric conversion preserves legitimate zero values (for example, `0`) and rejects malformed or unsafe integers. The affected regression/reporting scripts use the shared converter.
- Discord screenshot ingestion now computes SHA-256 over the original downloaded image bytes and records Discord message/channel/attachment references, message URL, byte size, MIME type, and retrieval timestamp. That evidence is carried through pending one-field corrections into the final battle-record JSON export. Export fields are validated and sanitized. The image bytes are not duplicated in tournament-state JSON; the source pointer and checksum are retained.
- Tests cover nine-field fail-closed behavior, reward geometry, zero-valued numeric handling, source-evidence hashing/validation, persistence across pending correction export/import, and workflow wiring.
- Current source archives and the curated Grand Tournament v3.22 source baseline are retained as provenance inputs. The active application contract remains separate from historical v3.19/eight-field source text.

## Verification performed in this environment

| Check | Result | Scope / limitation |
|---|---:|---|
| Full `npm test` | **183 passed, 0 failed, 0 skipped** | Node `v22.16.0`, Linux x64; diagnostic only because `package.json` requires Node `>=24.17.0` |
| Focused source/export/workflow tests | **46 passed** | Includes screenshot source evidence and state round-trip checks; same Node 22 runtime |
| `node scripts/check-tesseractjs-assets.js` | PASS | Local worker, English traineddata, and four WASM assets present; asset hashes/bytes emitted by the check |
| `git diff --check` | PASS | No whitespace errors in working diff |
| `node --check` on changed runtime/scripts | PASS | Syntax validation only |
| Four-fixture OCR sequence | TIMEOUT | Outer execution window elapsed before final sequence report; not a pass and not an accuracy score |
| Bounded Asashio OCR rerun | TIMEOUT | 120-second tool window elapsed before sequence report; not a pass and not a failed accuracy score |

The full test suite ran in approximately 7.95 seconds. Local Tesseract assets exist, but this does not establish accurate OCR on real target screenshots.

## Not performed / not claimed

No clean install/full suite on Node `>=24.17.0`, no compliant Windows/native-Tesseract test, no completed current four-image or 16-image OCR acceptance run, no independent labeled holdout, no live Discord staging smoke test, no dedicated secret scanner report, no backup/restore rehearsal, no production deployment, no remote repository creation, and no remote push are claimed. The single-image and batch attempts that timed out are recorded as timeouts, not passes or accuracy scores.

## Active decision and release status

Keep Tesseract.js as the primary local engine. Keep `PADDLEOCR_FIELD_FALLBACK=0` and OpenCV acceptance assistance disabled until a same-input benchmark demonstrates improved exact-field and complete-record accuracy without increasing accepted-wrong values or degrading the required latency criteria. Never change ground truth or weaken exact-value acceptance to raise pass rates. Keep one-value-at-a-time correction and manual review for unresolved mandatory fields. **DWBOT production remains NO-GO.**

See `plan1.txt` checkpoint `DWBOT-UPD-2026-11-03-002` and `DWBOT_FUTURE_HANDOFF_PROMPT.txt` for the current plan and next gates.


## Superseding runtime-compatibility and verification addendum — 2026-11-03

This addendum supersedes only the runtime-compatibility qualification and current test-status claims above. The earlier text remains preserved as the historical checkpoint record.

### Runtime policy implemented

- Reproducible local baseline: Node.js **22.16.0** (`.nvmrc`).
- Minimum supported application runtime: Node.js **22.16.0**. Stable Node.js 22 patch/minor releases from 22.16.0 onward and later major releases are eligible for test acceptance, subject to running the relevant tests on those actual runtimes.
- `package.json` and the root lockfile now declare `node >=22.16.0`. The application startup guard and Windows PaddleOCR runner use the same minimum.
- Runtime unit coverage explicitly accepts 22.16.0, later 22.x, 23.x, 24.x, and 25.x examples, and rejects versions before 22.16.0, prerelease strings, and malformed versions. These are policy-unit checks; the current container itself ran Node v22.16.0 only.
- The 22.16.0 minimum is intentional because the application passes the `timeout` option to `node:sqlite` `DatabaseSync`; Node's API history dates that option to v22.16.0.

### Verification on the actual runtime

| Check | Result | Runtime / qualification |
|---|---:|---|
| `npm test` | **183 passed, 0 failed, 0 skipped** | Node v22.16.0, npm 10.9.2, Linux x64 |
| `npm run test:ocr-watchdog` | **21 passed** | Node v22.16.0 |
| `npm run test:opencv` | **5 passed** | Node v22.16.0; geometry-only helper, no independent OCR acceptance authority |
| `npm run test:paddleocr-fallback` | **16 passed** | Node v22.16.0; fallback remains disabled by default |
| `npm run test:sqlite` | **5 passed** | Node v22.16.0 |
| `npm ls --depth=0` | **PASS** | Installed top-level dependency tree resolves |
| Tesseract.js local asset check | **PASS** | Local worker, English traineddata, and WASM assets present |
| Reported issue screenshot | **PASS, exact 9/9** | Node v22.16.0; Tesseract.js 6.0.1 / core 6.1.2; three candidate attempts; report at `testdata/reported-screenshot-regression-results.json` |
| Full Tesseract.js acceptance launcher | **INCOMPLETE** | Unit/contract and local-asset stages passed; negative-control Asashio sequence did not produce a complete report within the environment execution window |
| Asashio one-image supervised sequence | **INCOMPLETE** | Parent/child process did not return a completed report within the environment execution window; no accuracy score assigned |
| PaddleOCR offline comparative benchmark | **BLOCKED** | Local Python PaddleOCR packages/models unavailable; no model-quality comparison claimed |

The individual reported-issue screenshot report records all nine expected values matching exactly, with no missing required fields or ambiguities. This is a single-fixture regression result and does not substitute for the full five-image, 16-image, or independent holdout acceptance runs.

### Outstanding release gates

- Diagnose the supervised child/worker shutdown and long-running sequential OCR behavior; retain confirmed process closure and fail-closed watchdog semantics. Do not relax exact-value matching or increase timeouts merely to manufacture passes.
- Complete current-source five-image and 16-image development acceptance with complete reports and no network attempts.
- Run the same acceptance tests on any additional Node.js 22+ versions that are to be claimed as empirically verified. The compatibility rule makes them eligible; it does not claim they have already been executed.
- Complete the supported Windows/native-Tesseract gate, local PaddleOCR paired benchmark, independent labeled holdout, live Discord staging smoke test, security/secret scan, backup/restore rehearsal, and final packaging review.
- GitHub `dwbotVis` remains the only authorized delivery branch; `main` must not be changed. The complete source transfer still requires a verified remote commit/tree check.

**Disposition: local Node 22+ compatibility policy implemented; Node v22.16.0 automated tests pass; OCR batch, platform, and production acceptance remain open. DWBOT production remains NO-GO.**


### OCR feature-gating correction — 2026-11-03

- `OCR_CV_ASSIST` is now opt-in: only the exact value `1` enables local OpenCV geometry proposals. An unset value, `0`, `false`, `true`, or other text disables the helper. `.env.example` now defaults to `0`.
- This aligns runtime defaults with the existing decision to require paired same-input evidence before CV geometry can influence candidate generation in normal operation. OpenCV remains geometry-only and cannot directly accept field values.
- PaddleOCR field fallback remains disabled by default.
- The OpenCV test suite now covers default-off and strict explicit opt-in behavior as well as geometry sanitization.


### Final test and report-provenance update — 2026-11-03

- Latest full `npm test`: **185 passed, 0 failed, 0 skipped** under Node v22.16.0 / npm 10.9.2 / Linux x64.
- Latest focused suites: OpenCV 6/6, OCR watchdog 21/21, PaddleOCR fallback 16/16, SQLite 5/5.
- OCR report metadata now records the selected OCR engine, explicit OpenCV/PaddleOCR feature flags, whether the no-network guard was active, and configured image/operation time budgets. This prevents future feature-flag ambiguity in new results.
- OpenCV defaults to disabled and requires the exact explicit opt-in `OCR_CV_ASSIST=1`; `.env.example` now defaults to 0. PaddleOCR remains default-off.
- The previously completed reported-issue result is still a 9/9 single-image exact match, but its older report predates feature-flag metadata; its OpenCV setting is not independently recorded. New CV-off and explicit CV-on rechecks did not complete within the available execution window, so no paired conclusion is drawn.
- The complete sequential OCR acceptance launcher, Asashio control, Windows/native-Tesseract, live Discord, security, restore, independent holdout, and full GitHub source transfer remain outstanding. Production remains NO-GO.


### Reproducibility and platform evidence details — 2026-11-03

- OCR sequence and Tesseract acceptance reports now emit the active engine, OpenCV/PaddleOCR flags, network-block state, and time budgets. The Windows PaddleOCR paired-runner names result files using the actual Node runtime string to prevent cross-version overwrites.
- Root `package.json` and `package-lock.json` engine requirements were independently checked and both resolve to `>=22.16.0`.
- Latest final source test run: `npm test` 185/185; OpenCV 6/6; OCR watchdog 21/21; PaddleOCR fallback 16/16; SQLite 5/5. Full logs are included in `testdata/runtime-node22plus-2026-11-03/`.
- Clean `npm ci` was not run: the local npm cache is empty and package-registry access was not established. The Windows PowerShell runner was not parsed/executed because neither `pwsh` nor `powershell.exe` is installed in this Linux environment. These remain unverified.
