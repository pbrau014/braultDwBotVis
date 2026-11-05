# DWBOT canonical repository and implementation authority

Canonical repository: https://github.com/pbrau014/braultDwBotVis.git
Repository slug: pbrau014/braultDwBotVis
Only active implementation/delivery branch: main
Current observed HEAD: 126a8d505bd1319cff770168c21fb57412286bfb

## Repository rule
Use only this repository for DWBOT source, branches, CI, issues, documentation, packages and releases. Do not substitute or direct work to another similarly named repository. References to other repositories or branches in old reports are historical provenance only, not active source/destination instructions. Do not delete other repositories or remote branch refs as part of reference cleanup. Do not force-push or rewrite history. Re-fetch main immediately before every write and protect the expected head.

## OCR.Space development rule
OCR.Space is the active DWBOT development focus until project-wide review, implementation, tests and verification are complete. Tesseract.js remains the local baseline; OpenCV is geometry/ROI assistance; PaddleOCR is an optional local comparison. OCR.Space is secondary/last-resort only for unresolved/disputed fields after local OCR. Require explicit OCRSPACE_ENABLED=1 and a locally stored key; a key alone must not enable network access. Default-off is a safety interlock, not quarantine.

Only minimum-necessary, allowlisted, field-localized, non-identifying crops may be transmitted. Player identity/name fields, Discord identifiers, credentials, private account data, unrelated UI and full screenshots are prohibited. Engine 3 must not be used for player identity. Remote OCR output remains separate diagnostic evidence and cannot independently accept, rewrite, normalize, fuzzy-correct or overwrite any mandatory field. No paid tier, engine or usage is authorized.

Require the fixed HTTPS endpoint, redirect rejection, request/response timeout through complete body parsing, bounded response/input sizes, supported MIME allowlist, sequential requests, no automatic retries, conservative quotas and fail-closed quota ledger. Review current provider terms, privacy and retention before any live request. Use synthetic data for first smoke testing.

## Acceptance and project constraints
Exactly nine mandatory OCR fields in order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Abstain on missing, invalid, ambiguous, conflicting or incorrect values. No fuzzy correction or expected-value injection. Zero wrongly accepted mandatory values is required; never promise perfect OCR accuracy.

Preserve the existing Node.js bot and its authority over identity, permissions, records, scoring, persistence and exports. Preserve source/derivative distinctions, provenance, original archives, manifests, historical failures and ground truth. Node.js 22.16.0 is acceptable for general tests; Windows-native OCR remains a separate Windows gate. Production remains NO-GO until all OCR, Windows/native, security, desktop/browser, Discord, recovery, manual and package gates have current verified evidence.

## Living plan
The complete current living plan is maintained as a downloadable handoff artifact. The active plan summary is DWBOT_LIVING_RUNNING_PLAN_2026-11-05_CURRENT.txt in this directory. Update it after every verified milestone; preserve the detailed historical plan rather than silently rewriting its evidence.