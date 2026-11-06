# Node.js runtime compatibility and test acceptance policy

**Effective:** 2026-11-03  
**Project:** DWBOT / WoWS YOLO Tournament Discord Bot  
**Status:** Active runtime policy

## Policy

- The reproducible development baseline remains **Node.js 22.16.0**, recorded in `.nvmrc`.
- Node.js 22.16.0 is explicitly acceptable in place of older Node 24+, >=24.17.0 and v24.22.1 requirements. Node 24 is optional only for a specifically proven tool/dependency need; it is not a general project gate.
- The supported runtime minimum is **Node.js 22.16.0**. Later stable patch/minor releases in the Node.js 22 line and newer Node.js major releases are accepted, subject to the full project test suite and any relevant runtime-specific checks.
- Test results produced on Node.js 22.16.0 or newer are eligible for acceptance. A pass on one runtime does not automatically prove platform-specific behavior on another operating system or runtime family.
- Node.js versions before 22.16.0 are not accepted by the application runtime guard.
- Historical Node 24-only instructions and test reports are retained as historical records; they are not current runtime gates unless a report explicitly describes a platform-specific test that has not yet been reproduced.

## Technical minimum

The project uses `node:sqlite` and constructs `DatabaseSync` with its `timeout` option. Node's official SQLite API history documents that `DatabaseSync` was added in Node 22.5.0 and that the `timeout` option was added in Node 22.16.0. This is why the project minimum is 22.16.0 rather than 22.0.0. The 22.16.0 baseline is retained for reproducible local development.

References:

- Node.js v22 SQLite API: https://nodejs.org/download/release/v22.23.3/docs/api/sqlite.html
- Node.js v22.16.0 release notes: https://nodejs.org/en/blog/release/v22.16.0

## Verification requirements

For each accepted test run, record:

- `process.version`, `process.versions.node`, npm version, operating system, and architecture.
- Exact command, exit code, start/end time, pass/fail/skip counts, and the report/log path.
- Whether native Tesseract, ImageMagick, OpenCV, PaddleOCR, and local models were available.
- Runtime-specific blockers and any tests not run.

A passing unit suite is not equivalent to passing the screenshot OCR acceptance, Windows/native-Tesseract, PaddleOCR comparative, or live Discord gates. Those remain independently tracked. Never erase or rewrite historical reports to make them appear to have run under a newer compatibility policy.


## Related OCR feature-gating decision

OpenCV geometry proposals are disabled by default and require `OCR_CV_ASSIST=1` for controlled evaluation only. They can propose crop geometry but cannot directly emit accepted OCR values. Enablement for routine use requires same-input evidence of improved exact-field/complete-record accuracy, no increase in accepted-wrong values, and acceptable latency. PaddleOCR field fallback likewise remains disabled by default.
