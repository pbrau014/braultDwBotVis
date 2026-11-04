# Phase 1 evidence index

This folder separates preserved historical evidence from the latest reproduced results. Latest reports are generated locally on Linux x64 with Node.js v22.16.0 (below the package minimum `>=24.17.0`). They do **not** certify Windows Node.js 24 behavior or production Discord operation.

## Latest run identities

- `acceptance-report.json` — latest `npm run test:tesseractjs` launcher report, run ID `2026-10-25T02-57-30-282Z-40824`; **9/9 commands passed**, `passed: true`, network guard enabled, zero blocked network attempts. Verify with `acceptance-report.sha256`.
- `acceptance-launcher-full-latest.log` — complete acceptance console output.
- `npm-test-latest.log` and `npm-test-latest.exit` — full default regression suite, **102 passed / 0 failed / 0 skipped**, exit 0.
- `npm-ls-depth0-latest.log` — installed direct dependency tree.
- `node-check-latest.log` and `node-check-latest.exit` — syntax checks for JavaScript files in `src`, `scripts`, and `tests`, exit 0.
- `npm-ci-attempt-environment-note.md` — honest record of the clean-install attempt. `npm ci` did not complete observably on the current Node 22 host; it is **not a pass**.
- `integrated-stall-recovery-2026-10-25T02-57-32-366Z-40955.json` — real recognition, injected subsequent hang, watchdog timeout, confirmed underlying worker termination, failed-child close, and fresh-child recovery of the reported image at 9/9 fields exact. This is the latest integrated-run detail report.
- `reported-screenshot-no-network-latest.json` — latest reported screenshot payload; 9/9 expected fields exact, required-field list empty.
- `five-image-sequence-{1,2,3}-latest.json` — each of the three fresh network-blocked batches passed **5/5 exact** and **5/5 complete required fields**; child-close messages are in the paired logs.
- `hoffmann-then-asashio-latest.json` and `asashio-then-hoffmann-latest.json` — both orders passed **2/2 exact** and complete required fields.
- `four-image-tesseractjs-no-network.json` — separate previously preserved four-fixture run, 4/4 exact.
- `acceptance-report-8-command-historical.json` — preserved prior launcher report from before the integrated stall/recovery scenario became part of acceptance. It is not the latest report.
- `native-tesseract-5.5.0-direct-psm3.txt` and `native-auto-four-image-diagnostic.json` — Linux native diagnostics only; they do not satisfy the Windows native comparison gate.
- `integrated-stall-recovery-*` — historical run-by-run evidence retained, including earlier transient timeouts/harness failures and successful runs. Keep them instead of treating any one run as the whole history.

## External gates still open

1. Run clean install, dependency-tree check, regression suite, and the complete acceptance command on Windows with Node.js >=24.17.0 (recommended current Node 24 patch: v24.22.1).
2. Locate/install authorized native `tesseract.exe` on Windows and capture a separate native report.
3. Complete authorized live Discord smoke tests (login, channel permissions, attachment delivery, rate limits, restart/recovery).
4. Optional Phase 6 privacy-preserving correction/diagnostic collection remains unimplemented.

The release candidate is **not production-approved** while the external target-runtime and operational gates remain open.
