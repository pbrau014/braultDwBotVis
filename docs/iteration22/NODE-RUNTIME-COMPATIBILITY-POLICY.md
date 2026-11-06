# Node.js runtime compatibility and test acceptance policy

**Effective:** 2026-11-06  
**Project:** DWBOT / WoWS YOLO Tournament Discord Bot  
**Status:** Active — exact project runtime pin  
**Supersedes:** The Node.js 22.16.0 baseline in the 2026-11-03 policy text. Historical test records remain unchanged.

## 1. Single project-wide standard

The one standard runtime for development, CI, OCR acceptance, local tools, packaging, and release evidence is:

- **Node.js 26.13.0 (LTS, Lithium)**
- .nvmrc: 26.13.0
- package.json and root package-lock.json engines: exact 26.13.0
- GitHub Actions setup-node: exact 26.13.0
- Windows and Linux acceptance jobs must report v26.13.0; a different major, minor, or patch is not an accepted run for the current baseline.

This pin is chosen because it is the latest LTS release recorded for the project date and matches the previously recorded Windows environment. Node.js 24.22.2 is also LTS, but is not the project standard. Node.js 22.16.0 is no longer an accepted project runtime.

## 2. Runtime update control

Do not silently float to 26.x, 24.x, 22.x, or lts/*. Any later Node update requires a deliberate version change across:
- .nvmrc;
- package engine declarations and lockfile root metadata;
- every GitHub Actions workflow and runtime assertion;
- Docker/container definitions, scripts, build/package metadata, setup documentation, and acceptance reports where applicable;
- test evidence on each supported OS and relevant native OCR/PaddleOCR paths.

A version update is not accepted merely because npm ci succeeds. The full project suite and the Windows/native OCR, local PDF-reader, and persistence checks must be rerun on the new exact version. Preserve old test reports as historical records; never relabel them as Node 26.13.0 runs.

## 3. Required evidence

Every acceptance run records:
- process.version, process.versions.node, npm version, OS, architecture;
- exact commit and package-lock SHA-256;
- exact command, exit code, start/end times, pass/fail/skip counts, and report/log paths;
- native Tesseract, ImageMagick, Ghostscript, OpenCV, PaddleOCR, Python, and model availability/versions;
- runtime-specific blockers and tests not run.

A unit-suite pass does not substitute for Gate A/B screenshot OCR, Windows/native OCR, PDF provenance, restricted-egress, or persistence acceptance.

## 4. Technical basis

The project previously used Node 22.16.0 because the application uses node:sqlite and the DatabaseSync timeout option. The Node 26 LTS line includes that capability; this is a runtime baseline update, not a change to SQLite behavior. Re-run the persistence and native Windows test suites before accepting the new baseline.

## 5. Historical evidence

Reports generated under Node 22.16.0, Node 24.x, or any other runtime retain their original version labels and remain useful historical diagnostics. They do not count as current-baseline acceptance evidence. Do not rewrite historical reports or source artifacts to make them appear to have run under Node 26.13.0.

## 6. OCR feature gates

OpenCV geometry proposals remain disabled by default and require OCR_CV_ASSIST=1 for controlled evaluation only. They may propose crop geometry but cannot directly emit accepted OCR values. Routine enablement requires same-input evidence of improved exact-field and complete-record accuracy, no increase in wrongly accepted values, and acceptable latency. PaddleOCR field fallback remains separately gated by its own evidence.

## References

- Node.js release schedule: https://github.com/nodejs/Release
- Node.js v26.13.0 release: https://github.com/nodejs/node/releases/tag/v26.13.0
- Node.js v24.22.2 release (LTS, not selected): https://github.com/nodejs/node/releases/tag/v24.22.2