# Node.js 26.13.0 supplemental runtime adoption record

**Status:** INSTALLED IN ISOLATED LINUX TOOL ENVIRONMENT; PROJECT CI VERIFICATION PENDING  
**Date:** 2026-11-06  
**Repository:** pbrau014/braultDwBotVis  
**Branch:** chore/node-26-13-runtime-reference-and-ci

## Supplied distribution

- File: `node-v26.13.0-linux-x64.tar.xz`
- Size: 34,083,252 bytes
- SHA-256: `d28a96af6c38596f6d9d97c0ee531c13d238d757742387d1928de822d959e997`
- Official Node.js v26.13.0 release checksum: exact match.
- Platform: Linux x64 (glibc distribution); not suitable for Windows or musl-only environments.

## Installation and execution evidence

The archive was inspected for absolute/traversal paths and extracted under an isolated tool directory. No system-wide PATH, package manager, Windows installation, or user machine configuration was changed.

Executed binaries:
- `node --version` → `v26.13.0`
- `node bin/npm --version` → `11.20.0`

Official release notes identify v26.13.0 as LTS, with support through the end of April 2029. The official release notes caution that Linux binaries from Node 25 onward link against `libatomic`, which may need separate installation depending on Linux distribution.

## Runtime policy

- Existing minimum supported DWBOT runtime remains Node.js `>=22.16.0`.
- `.nvmrc` remains `22.16.0`.
- `package.json` engine floor remains `>=22.16.0`.
- Existing Node 22.16.0 Linux/Windows acceptance jobs remain intact.
- Node 26.13.0 is proposed as a supplemental compatibility target, with new no-provider CI on Linux and Windows.
- Do not call Node 26.13.0 project-accepted until the exact-head matrix passes. Do not transfer Linux results to Windows or vice versa.

## Safety and scope

The supplemental job sets OCR.Space disabled, disables provider allowlisting, and keeps unrelated network restriction enabled. It performs dependency installation and local tests only. It must not submit OCR.Space requests, contact production Discord, deploy, or modify production data.

## Source references

- Official Node.js v26.13.0 release notes and checksums: https://nodejs.org/uk/blog/release/v26.13.0
- Official release archive: https://nodejs.org/download/release/v26.13.0/
- Uploaded archive checksum was compared to the signed release checksum entry for `node-v26.13.0-linux-x64.tar.xz`.

## Acceptance

Pending:
1. Exact-head Linux Node 26.13.0 workflow passes `npm ci`, `npm run test:ocrspace`, and `npm test`.
2. Exact-head Windows Node 26.13.0 workflow passes the same commands.
3. Review any failures without weakening existing Node 22.16.0 baseline or OCR acceptance gates.

**No Gate A or Gate B status changes result from installing this runtime.**
