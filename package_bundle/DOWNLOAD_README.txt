DWBOT COMPLETE MAIN-BRANCH TRANSFER PACKAGE — 2026-11-04

This publication package contains:
1. The complete expanded DWBOT application source tree and its original folder structure.
2. Tests, fixtures, screenshots, OCR model assets, logs, test reports, workbook asset, plans, and provenance records.
3. A publication-sanitized derivative of the Node 22+ Checkpoint 003 archive.
4. Manifests, checksums, current-state summaries, and a guarded PowerShell Git transfer script.

CHECKPOINT ARCHIVE
Name: DWBOT_NODE22PLUS_IMPLEMENTATION_CHECKPOINT_2026-11-03_PUBLICATION_SANITIZED.zip
Checkpoint ID: DWBOT-UPD-2026-11-03-003
Archive size: 69451123 bytes
Archive SHA-256: e114850da85570d027bc275738663e72385e030d39b5671d5ae85e4005fa22d3
Manifest-listed project file count: recorded in the embedded checkpoint manifest.

The checkpoint derivative replaces one nested provenance member that contained node_modules with the separately preserved archive DWBOT_RC3_CURRENT_SOURCE_SANITIZED_NO_NODE_MODULES.zip. The original nested member size and SHA-256, replacement size and SHA-256, and reason for the substitution are recorded in the derivative's DWBOT_NODE22PLUS_CHECKPOINT_003_MANIFEST.json and provenance/publication/DWBOT_NODE22PLUS_CHECKPOINT_PUBLICATION_SANITIZATION.md.
The unchanged original checkpoint ZIP and original RC3 archive remain preserved in the original full download kit. This publication derivative does not silently claim to be byte-identical to those originals.

REPOSITORY TARGET AND TRANSFER
Repository: https://github.com/pbrau014/braultDwBotVis
Branch: main
Transfer mode: normal fast-forward commit; no force-push and no history rewrite.

Use PUSH_COMPLETE_DWBOT_MAIN.ps1 after Git for Windows is installed and visible to PowerShell. The script validates the package manifest and hashes, clones current main, verifies the base commit, copies selected files, verifies copied hashes, stages and commits, checks for concurrent main updates, pushes, and verifies the remote commit and tracked paths.

If Git is not installed, run:
  winget install --id Git.Git --exact --source winget
Then close and reopen PowerShell and verify:
  git --version

IMPORTANT SCOPE AND EXCLUSIONS
The publication transfer excludes:
- expanded node_modules/ directories (recreate with npm ci from the lockfile)
- data/ runtime databases and user state
- .git/ metadata from the source package (the destination clone supplies Git history)
- real .env files, secrets, credentials, private keys
- database sidecars, runtime caches, and temporary files

The bundled workbook and test/evidence files are project materials; their inclusion is not a claim that all release gates passed. DWBOT remains a development checkpoint, not a production-ready release. See the current-state reports for outstanding OCR, Windows/native-Tesseract, PaddleOCR, Discord, holdout, security, recovery, and final acceptance gates.
