# Phase 1 clean-install attempt — environment note

- Command: `npm ci --prefer-offline --no-audit --no-fund`
- Host: Linux x64; Node.js `v22.16.0`; npm `10.9.2`
- Result: **INCOMPLETE / NOT PASS**. npm printed the expected `EBADENGINE` warning because the package requires Node.js `>=24.17.0`, then stopped making observable progress. The process was manually terminated to avoid leaving the working copy without its dependency tree.
- Exit code: **not captured**; the shell/tool session timed out before the exit-code marker was written.
- Recovery: before running `npm ci`, `node_modules` was archived to `/tmp/phase1-node_modules-backup.tar.gz`; the existing dependency tree was restored from that archive. `npm ls --depth=0` then passed with exit code 0, listing `discord.js@14.27.0`, `dotenv@16.6.1`, `tesseract.js@6.0.1`, and `tesseract.js-core@6.1.2`.
- Interpretation: this does not prove `npm ci` itself failed on the lockfile or that all network access was blocked; it only records that a clean install could not be verified in this environment. The target Windows Node.js 24 run must still execute `npm ci` and capture its actual exit code.
