# DWBOT canonical repository and implementation authority

Canonical repository: https://github.com/pbrau014/braultDwBotVis.git
Repository slug: pbrau014/braultDwBotVis
Only active implementation/delivery branch: main
Last verified main HEAD before the current documentation/roadmap refresh: 57646d07306e22f439229e96dcdd77cc729d0c81. Exact-head run 42100206579 is pending; re-fetch main and Actions after the refresh commit.

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