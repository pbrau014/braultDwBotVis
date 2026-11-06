# DWBOT requirements, architecture and schema crosswalk — updated 2026-11-06

## OCR.Space PDF-first governing sequence
The current implementation sequence is eligible original screenshot → OCR.Space Engine 2 first → searchable PDF → validated/downloaded PDF → bounded local PDF-page raster → Tesseract.js/native Tesseract/optional PaddleOCR/OpenCV local readers → existing parser/consensus/validators. No downstream local image reader may process the original screenshot after PDF-first processing begins. A failed OCR.Space/PDF/raster stage fails closed. Eligible intake requires OCRSPACE_ENABLED=1, OCRSPACE_NETWORK_ALLOWLIST=1 and OCRSPACE_API_KEY. OCRSPACE_ENABLED=0 is only for isolated mocks or downstream local readers after the PDF-derived raster already exists.

| Requirement | Implementation | Verification |
|---|---|---|
| OCR.Space is the first reader and produces the source PDF | src/ocrspace-pdf-first.js, src/bot.js, src/image-processor.js | Live Engine 2 request, searchable PDF SHA, bounded download and PDF raster evidence |
| All local OCR readers consume the OCR.Space PDF raster | src/bot.js, src/image-processor.js, src/ocr-worker.js, src/paddleocr-field-fallback.js | Same PDF-raster fingerprint passed to each local reader; no original-image fallback |
| Free API upload limit | src/image-processor.js, src/ocrspace-pdf-first.js | Record original/upload SHA, size, dimensions and quality; upload <=1 MiB |
| Network privacy | scripts/block-network.js, scripts/run-windows-ocr-acceptance.ps1 | Allow only HTTPS OCR.Space API/PDF hosts; record all other blocked attempts |
| Exact nine-field validation | src/battle-record.js, src/bot.js | All nine exact; zero wrong accepted; zero unresolved |

## Authority and scope

This is an evidence-based supporting crosswalk for Plan 2 (requirements/architecture/schemas). It does not replace an unavailable original detailed Plan 2 specification. The canonical implementation is `pbrau014/braultDwBotVis`, branch `main`; the living running plan controls sequencing and release decisions.

## Requirement-to-implementation traceability

| Requirement | Current implementation/source | Verification evidence required |
|---|---|---|
| Nine mandatory OCR fields, in order: result, player, map, mode, battleStart, credits, freeXp, damage, xp | `src/battle-record.js`, `src/bot.js`, `src/desktop-service.js` | Unit/contract tests plus exact current-source Windows screenshot reports; zero wrong accepts and zero unresolved required fields for Gate A |
| Local OCR baseline and fail-closed acceptance | `src/ocr-worker.js`, `src/bot.js`, `src/number-parser.js`, `src/reward-geometry.js`, `src/damage-consensus.js` | Tesseract.js current-source corpus, negative control, per-field reports and independent ground truth |
| OCR.Space searchable-PDF first pass | `src/ocrspace-pdf-first.js`, `src/bot.js`, `src/image-processor.js` | Live Engine 2 request and PDF URL; all local readers process PDF raster; source/upload/PDF hashes; zero original-image fallback |
| Image intake limits and bounded downloads | `src/attachment-download.js`, `src/desktop-bridge.js`, `desktop/upload.js` | Exact 25 MiB boundary, streamed over-limit cancellation, concurrency and timeout tests on Linux and Windows |
| Discord authority and channel isolation | `src/bot.js`, `src/tournament-command-policy.js`, `src/discord-gateway-diagnostics.js` | Isolated development bot/guild/channel test; READY, permissions, role denial, attachments, restart and recovery logs |
| Browser role separation and local transport | `src/desktop-bridge.js`, `src/desktop-service.js`, `desktop/` | OAuth/browser integration; loopback-only binding, CSRF/origin checks, Player ownership and Admin authorization |
| Tournament scoring and workbook compatibility | `src/tournament.js`, `assets/YOLO-Tournament-Workbook.xlsm` | Formula/value parity against preserved workbook baseline; Grand Yolo default tierWeight 0.9; no unapproved formula drift |
| Persistence and recovery | `src/tournament.js`, `tests/persistence-recovery.test.js` and workflow persistence job | Isolated Windows save/restart/reload, backup/restore to clean location, rollback and byte/record comparisons |
| Public/private backup boundary | `Tournament.makePublicArchiveSnapshot`, authenticated Admin `/api/admin/backup` | Tests and inspection prove Discord exports omit private account links and pending per-user associations; Admin private backup remains access-controlled |
| Release evidence and provenance | `scripts/package-release.ps1`, `.github/workflows/dwbot-verification.yml` | Source commit, manifest, hashes, clean extraction, npm ci/test/prelive, PDF render and visual review |

## Architecture map

1. **Discord entry and orchestration:** `src/bot.js` receives messages/attachments, restricts work to the configured channel, applies command policy, reserves a bounded OCR queue slot before attachment download, and routes to OCR/correction/mapping.
2. **Attachment intake:** `src/attachment-download.js` reads the HTTP response body incrementally, cancels once the configured maximum is exceeded, and returns a bounded buffer. The default hard maximum is 25 MiB; `MAX_IMAGE_MB` may lower but not raise it. The desktop bridge similarly caps requests at 25 MiB, bounds concurrent uploads, and sets request/header timeouts.
3. **OCR and record acceptance:** OCR.Space Engine 2 is the explicitly enabled first text-extraction stage and creates the searchable PDF. Tesseract.js/native Tesseract and optional PaddleOCR operate only on the PDF-derived raster; OpenCV supports image processing and geometry isolation. The provider HTTPS allowlist permits OCR.Space; unrelated egress remains restricted. PaddleOCR remains optional until local model assets are available and independently benchmarked; it is not silently promoted to primary.
4. **Battle record:** `src/battle-record.js` parses and validates the nine mandatory fields. Incomplete/conflicting values remain unresolved for exact correction; no fuzzy expected-value repair is permitted.
5. **Tournament state/scoring:** `src/tournament.js` owns the roster (maximum 50), four events, seven game slots per event, scoring rules, JSON/SQLite persistence, and full/public archive projections. Grand Yolo's current default `tierWeight` is 0.9.
6. **Browser workspace:** `src/desktop-service.js` enforces Player ownership and Admin authority; `src/desktop-bridge.js` provides loopback-only HTTP, Discord OAuth, CSRF/origin checks and bounded uploads; `desktop/` contains the Player/Admin/Upload pages.
7. **Workbook:** `assets/YOLO-Tournament-Workbook.xlsm` is the preserved workbook baseline. The current displayed Totals H12 formula is `=0.54*G12/100`; parity must be verified from the actual workbook and test evidence before release.
8. **Recovery:** Discord snapshots and public exports omit private account links and pending per-user associations. The authenticated Admin recovery JSON contains those private records and must be stored securely.

## Core data contracts

- **Battle record:** the nine ordered fields above; XP is mandatory and ninth. A record cannot map to a tournament slot while any mandatory field is missing, invalid or disputed.
- **Tournament state:** players and Discord account links; per-player event/game slots; event scoring settings; battle/OCR records; pending submissions and correction workflows; storage metadata/revision. Private account links and resumable user associations are retained in full private backups but omitted from public snapshots.
- **Image intake:** one screenshot per upload, accepted image signatures PNG/JPEG/WEBP/BMP/TIFF, bounded by 25 MiB maximum, finite request timeout and bounded concurrent desktop upload count.
- **OCR.Space request:** HTTPS to allowlisted OCR.Space API/PDF hosts, local Free key in header, one authorized original screenshot per eligible inventory image, bounded upload/download/quota/timeout, no automatic retries; unrelated images and private credentials/account data are excluded; provider-only text never accepts a mandatory field.

## Release gates and unresolved requirements

- **Gate A:** approved 16-image Windows development corpus, all nine fields independently compared, zero wrong accepted mandatory values, zero unresolved mandatory values, exactly one authorized OCR.Space request per eligible image and zero unrelated outbound network attempts.
- **Gate B:** exactly 21 screenshots: the first 21 corpus-order v6 records with complete, non-empty, independently established expected values for all nine fields. This replaces the former 50-image minimum / 100-image preferred target. Source hashes confirm zero overlap with the 16-image development corpus. Do not tune against these records. Gate B may proceed only after Gate A passes on all 16 development images with 16 exact complete nine-field records, zero wrongly accepted values, zero unresolved mandatory values and zero unauthorized network attempts, on a locked candidate fingerprint matching the Gate B run source. It passes only after all 21 PDF/raster artifacts and searchable text layers are verified, both local readers are present, zero mandatory values are wrongly accepted, zero unauthorized network attempts occur, and the secret-leak scan passes. No numeric exact-match floor is currently defined; report measured rates rather than inventing one.
- **Gate C:** isolated Windows persistence/backup/restore/rollback only after A and B pass.
- **Gate D:** final release decision with current source fingerprint, logs, benchmark, recovery evidence and rollback readiness.
- Plan 1 is source/repository reconciliation; Plan 2 is requirements/architecture/schemas. Their exact original detailed acceptance specifications are not fully present in retrieved authoritative context; this crosswalk is an evidence-based derivative, not a claim that missing text was recovered.
- The roadmap refers to 20 phases, but the accessible `plan1.txt` defines Phase 0–10 only. Phase 11–20 definitions must be recovered from an authoritative source.
- The exact four `GrandYoloInstruct` deliverables are unresolved. See `GRANDYOLOINSTRUCT_DELIVERABLE_CROSSWALK.md`; do not guess.


## Gate B 21-image amendment — 2026-11-06

The exact source-bound list is recorded in
testdata/imagesF-holdout-candidate-manifest.json under gateBSubset and is
validated against the v6 ground-truth JSON by
tests/test_ocrspace_imagesF_21_evaluator.py. The embedded manifest in the
original 63-image ZIP remains unchanged and retains its original SHA-256.

The Gate A report must be retained and manually reviewed; the post-hoc
evaluator checks the attested metrics and fingerprint formats but does not
parse the underlying Gate A report. Do not attest PASS without independently
checking the report hash and candidate fingerprint against the Gate B run.
