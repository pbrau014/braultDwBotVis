# Baseline provenance — WoWS Tournament Discord Bot + CV OCR sidecar

## Selected application baseline

- Selected package: `DWBOT_MILESTONE_NINE_FIELD_CONTRACT_2026-10-28.zip` as supplied inside `/mnt/data/allFiles.zip`.
- Extracted application snapshot: its `project/` directory.
- Baseline application version: 2.5.0 (`package.json`).
- Source project identity: `wows-yolo-tournament-discord-bot`.
- No `.git` directory or authenticated Git remote was present in the selected source package.
- The source archive and allFiles.zip remain outside this repository and were not modified.

## Archive identity

- `allFiles.zip` SHA-256: `c0285deddfee0bc7d7a05594b454f9ab2878134e32a53f0ea41293c335137e1b`.
- Inner `dwbotSource (2).zip` SHA-256: `dd06eba92b1cdca2a2ce42bbf7b2a74d71d16d3149cfcda9556f2eb4b1c16691`.
- Selected milestone-nine ZIP SHA-256: `35b7f37d6a834a9690bed4cc5c8854c586c10ad5f180737666c83447ad4ed`.

The outer archive contains duplicate source/package archives. Their SHA-256 values and extraction relationships are recorded in `archive-inventory.json`. The source package's own `SHA256SUMS.txt` is retained as historical provenance; a fresh repository manifest is generated after changes.

## Contract interpretation

The selected milestone-nine active plan and active source implement the nine-field contract, in this order:
`result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.

Historical Iteration 21 documents still describe an eight-field contract with XP optional. Those are retained as historical evidence and do not override the selected snapshot's active nine-field plan/source. Do not rewrite historical logs to appear consistent.

The local Python CV/OCR service under `services/cv_ocr/` is a new derivative of an earlier working implementation artifact, not part of the baseline archive. It is an optional local candidate-analysis sidecar and must not be allowed to silently write values into tournament records. Tesseract.js remains the production primary until measured field-exactness benefit is established.
