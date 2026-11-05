# Tested-source and current-branch clarification — 2026-11-05

Last source-code checkpoint: 5a12a9c218cebe61d277999318b7ceef5a8dc3b1. Documentation-only sync commits after that source checkpoint: 846c125c039358b7b4d8e30f2a882409b5b6e526 and 88b81acec448d1c7307f36ba91ac0b276d5710b9. Re-fetch main before further writes; 5a12 is not the current branch head.

Run 42111470540 remains in progress on Windows screenshot acceptance; Linux and clean-package/PDF jobs passed, as did Windows persistence/recovery and the full Node 22 suite. Exact-head documentation sync runs 42115213448 and 42115501194 are pending. Production remains NO-GO. The linked File Library crosswalk was updated; the living-plan Library replacement failed because no active container session was available, so its original file remains unchanged.

# Main/source checkpoint clarification — 2026-11-05

Last source-code checkpoint: 5a12a9c218cebe61d277999318b7ceef5a8dc3b1. Documentation sync commit: 846c125c039358b7b4d8e30f2a882409b5b6e526; exact-head run 42115213448 is pending. Main includes subsequent documentation-only reconciliation; re-fetch main before further writes. Windows screenshot acceptance on run 42111470540 is still running; production remains NO-GO.

# Current authority override — 2026-11-05

Canonical repository: pbrau014/braultDwBotVis; active branch: main; checkpoint head: 5a12a9c218cebe61d277999318b7ceef5a8dc3b1. Other branches and repositories are historical/read-only. No force-push, history rewrite, branch merge, production deployment, live Discord action, paid service or production screenshot transmission.

OCR.Space is the active development focus. It is default-on when a local Free API key is configured; blank/unset or OCRSPACE_ENABLED=1 enables, explicit 0 disables, invalid non-empty values fail closed, and a local key is mandatory. OCR.Space Engine 3 supplies separate remote text evidence only after OpenCV geometry-only safe-crop planning; Tesseract.js remains the independent local acceptance authority. Remote evidence cannot accept or overwrite mandatory fields. Engine 3 searchable PDF is Supported in DWBOT's capability comparison; preserve the provider comparison-matrix conflict and Engine 2 PDF-only fallback with Engine 2 text discarded.

Nine mandatory fields, in order: result, player, map, mode, battleStart, credits, freeXp, damage, xp; XP is ninth and mandatory. Zero wrongly accepted mandatory values required. Node 22.16.0 is authorized; Windows-only OCR, native Tesseract and process behavior must be verified on Windows.

Run 42111470540 on head 5a12a9c218cebe61d277999318b7ceef5a8dc3b1: Linux and clean-package/PDF jobs PASS; Windows persistence/recovery and full Node 22 suite PASS; current-source Windows screenshot acceptance remains in progress. Production NO-GO. Current chat only: the user has authorized all File Library mutations through the end of this chat; this authorization does not carry into future chats.

# DWBOT canonical repository and implementation authority

Canonical repository: https://github.com/pbrau014/braultDwBotVis.git
Repository slug: pbrau014/braultDwBotVis
Only active implementation/delivery branch: main
Last verified main HEAD before this plan refresh: 14ca84b3dcf21f9e0f24efe6e6d60da38c98de65. Exact-head run 42100283977 was pending with no jobs; this refresh triggers a new exact-head run. Re-fetch main and Actions after the refresh commit.

## Repository rule
Use only this repository for DWBOT source, branches, CI, issues, documentation, packages and releases. Do not substitute or direct work to another similarly named repository. References to other repositories or branches in old reports are historical provenance only, not active source/destination instructions. Do not delete other repositories or remote branch refs as part of reference cleanup. Do not force-push or rewrite history. Re-fetch main immediately before every write and protect the expected head.

## OCR.Space development rule
OCR.Space is the active DWBOT development focus until project-wide review, implementation, tests and verification are complete; it is not quarantined. Tesseract.js remains the local baseline and final acceptance authority; OpenCV is geometry/ROI assistance; PaddleOCR is optional local comparison. At runtime OCR.Space is secondary/last-resort evidence for unresolved/disputed fields, but is default-on when a local Free key is configured. An unset/blank OCRSPACE_ENABLED value or 1 enables; explicit 0 disables; invalid values fail closed. The key remains mandatory. It is the first remote text pass after OpenCV safe-crop planning and before independent Tesseract.js recognition.

Only minimum-necessary, allowlisted, field-localized, non-identifying crops may be transmitted. Player identity/name fields, Discord identifiers, credentials, private account data, unrelated UI and full screenshots are prohibited. Engine 3 must not be used for player identity. Remote OCR output remains separate diagnostic evidence and cannot independently accept, rewrite, normalize, fuzzy-correct or overwrite any mandatory field. No paid tier, engine or usage is authorized. DWBOT's comparison marks Engine 3 searchable PDF Supported based on the Engine 3 feature description; the conflicting provider comparison matrix remains noted and runtime URL verification plus Engine 2 PDF-only fallback are retained.

Require the fixed HTTPS endpoint, redirect rejection, request/response timeout through complete body parsing, bounded response/input sizes, supported MIME allowlist, sequential requests, no automatic retries, conservative quotas and fail-closed quota ledger. Review current provider terms, privacy and retention before any live request. Use synthetic data for first smoke testing.

## Acceptance and project constraints
Exactly nine mandatory OCR fields in order: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is mandatory and ninth. Abstain on missing, invalid, ambiguous, conflicting or incorrect values. No fuzzy correction or expected-value injection. Zero wrongly accepted mandatory values is required; never promise perfect OCR accuracy.

Preserve the existing Node.js bot and its authority over identity, permissions, records, scoring, persistence and exports. Preserve source/derivative distinctions, provenance, original archives, manifests, historical failures and ground truth. Node.js 22.16.0 is acceptable for general tests; Windows-native OCR remains a separate Windows gate. Production remains NO-GO until all OCR, Windows/native, security, desktop/browser, Discord, recovery, manual and package gates have current verified evidence.

## Living plan
The complete current living plan is maintained as a downloadable handoff artifact. The active plan is docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt. Read it first in every next chat. The File Library's prior dated plan snapshots remain historical until the exact current content is synchronized. Update it after every verified milestone; preserve the detailed historical plan rather than silently rewriting its evidence.