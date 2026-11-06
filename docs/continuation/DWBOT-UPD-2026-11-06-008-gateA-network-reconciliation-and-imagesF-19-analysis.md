# DWBOT Gate A network reconciliation and 19-image OCR analysis

**Review date:** 2026-11-06 16:37 UTC  
**Repository:** `pbrau014/braultDwBotVis`, branch `main`  
**Purpose:** Preserve artifact-verification findings and distinguish OCR metrics from acceptance status.  
**Provider requests:** None performed during this review.

## 1. Original 63-image extraction

- Run: [#42160979140](https://github.com/pbrau014/braultDwBotVis/actions/runs/42160979140), completed successfully.
- Artifact: `dwbot-imagesF-63-ocrspace-exploratory`, ID `13482219732`.
- GitHub SHA-256: `ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a`.
- The downloaded ZIP hash matches the GitHub digest.
- Run report records 63/63 completed PDF-first extractions, 63 successful searchable PDFs, and zero failed images.
- Independent local inspection verified 63 PDFs, each one page with non-empty searchable text; 63 PNG rasters were present. All 63 PDF and raster sizes/hashes matched their run-report records; raster dimensions matched the report; source member names, byte counts and hashes matched the included 63-member preflight list. No missing or mismatched file was found.
- The original artifact contains no restricted-egress diagnostic log. The source workflow at the extraction commit did enable the application-level restriction and OCR.Space allowlist, but did not configure `OCR_NON_OCR_NETWORK_LOG`. The guard only records denied attempts when that path is configured. Job logs and per-image failure rows contained no blocked markers, but this is corroborating evidence, not a complete event history. The historical denied-attempt count remains **UNKNOWN**; no zero-attempt claim is made.

## 2. Gate A: why the existing 16-image attempt cannot pass

- Original partial Gate A run: #42202563673; artifact ID `13495008195`, SHA-256 `398f8152847cd3ea58fb9e16ac01886fced0c880869ce6a430d3343e5cb4ecd8`.
- The original run log shows `OCR_NON_OCR_NETWORK_LOG` was set as a variable, but the exact workflow at commit `036f31181272d89ed2d678ca1b512c953f563106` did **not** set `OCR_NON_OCR_NETWORK_RESTRICTED=1` or `OCRSPACE_NETWORK_ALLOWLIST=1`, and did not preload the network guard. The guard's source confirms that it only writes denied-attempt events when restriction is enabled. Therefore the first provider submission occurred without the required restricted-egress enforcement; an empty log cannot be recreated retroactively.
- The partial artifact contains one searchable PDF and its raster for `Screenshot_16.jpg`; the other 15 images were not submitted.
- The later no-duplicate local recovery reused that PDF and made zero provider requests. Tesseract.js recovered eight fields exactly; `map` remained unresolved (`Not detected` versus expected `Aegis`). PaddleOCR fallback was disabled for this recovery.
- Gate A continuation #42249978731 failed closed after this first-image mismatch and missing original network evidence. No remaining 15 provider requests were started.
- **Conclusion:** Gate A remains NOT PASSED. The historical network restriction cannot be retroactively proven. The existing partial run must not be resumed for paid submissions. A valid future Gate A needs a clean, source-bound 16-image development inventory and a fresh workflow run with the guard enabled before every local/provider Node process. Any already-submitted source image must be excluded from a new paid batch unless an independently authorized non-duplicate replacement is supplied.

## 3. Gate B artifact verification: 19-image holdout

- Verification run: [#42202349114](https://github.com/pbrau014/braultDwBotVis/actions/runs/42202349114).
- Artifact ID `13496000656`; ZIP SHA-256 `282f728280b2bfcae9d58d28e48e469a3dfa6108a31feebcdb9e0fc1ccd06f96`.
- Machine report SHA-256: `ba0bf40e265555e8be3217676ea5f32c8f6df907266ae9f98bb4fd76887dc3ca`.
- The exact first 19 corpus-order records with complete eligible nine-field transcriptions were selected. All 19 passed source-image hash, PDF integrity, searchable-text-layer, raster integrity, PDF-derived-raster provenance, and local-reader availability checks. Secret scan passed across 136 scanned files.
- The separate local-reader recovery log is zero bytes with SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; the recovery report records zero provider requests and zero blocked attempts for that local-only recovery.
- The **original 63-run network log remains missing**, so Gate B artifact report status is FAILED for `networkRestriction=NOT_VERIFIED_MISSING_ORIGINAL_LOG`. Gate A evidence is also pending/failed. The local recovery log does not replace the original run log.

## 4. Post-hoc OCR results — Gate B 19 records

Denominator: 19 images × 9 eligible mandatory fields = 171 field values. These are field-level exact-match rates, not full-record accuracy and not a Gate B pass.

| Reader / method | Exact | Wrong candidates | Unresolved | Field exact-match rate |
|---|---:|---:|---:|---:|
| Tesseract.js | 110/171 | 2 (unaccepted) | 59 | 64.33% |
| Native Tesseract | 103/171 | 2 (unaccepted) | 66 | 60.23% |
| PDF text layer alone | 73/152 | 2 | 77 | 48.03% |
| OCR.Space parsed text alone | 79/152 | 17 | 56 | 51.97% |
| PDF + provider consensus | 80/171 | 0 | 91 | 46.78% |
| Four-source consensus | 131/171 | 1 | 39 | 76.61% |
| Strict four-source consensus | 59/171 | 0 | 112 | 34.50% |
| Strict three-source consensus | 104/171 | 1 | 66 | 60.82% |
| Three local-reader consensus | 99/171 | 1 | 71 | 57.89% |

- Tesseract.js produced 2 exact complete nine-field records out of 19 (10.53%); native Tesseract produced 0/19.
- No wrong mandatory value was marked accepted by either reader. The wrong candidates remain unaccepted; they are still diagnostic errors.
- Gate B requires zero wrongly accepted mandatory values **and** zero unresolved mandatory outputs under the current rule, plus Gate A PASS and complete network proof. The unresolved values and missing prerequisites block Gate B.

## 5. PDF text layer versus multi-reader arrangements

The searchable PDF text layer is useful, but it is not sufficient as the sole nine-field reader:
- The text-layer parser evaluates only eight fields (player is excluded from remote OCR evidence by the existing privacy policy), hence 152 eligible values.
- Numeric reward/damage fields are frequently absent or fragmented in the text layer; the PDF is a useful structured evidence source, not a replacement for local readers.
- OCR.Space parsed text and the PDF text layer are two representations of the **same OCR.Space provider**, not independent engines. Counting them as two independent votes can inflate consensus.
- Four-source consensus improved field coverage to 131/171 but had one wrong candidate. Strict four-source consensus had zero wrong candidates but left 112 unresolved.
- An additional diagnostic grouping that treated PDF text and provider-parsed text as one OCR.Space source, then compared that group with Tesseract.js and native Tesseract, produced:
  - unique 2-of-3 independent-source agreement: 105/171 exact, 1 wrong, 65 unresolved;
  - 3-of-3 agreement: 45/171 exact, 0 wrong, 126 unresolved;
  - both local readers agreeing: 99/171 exact, 1 wrong, 71 unresolved.
- Player remains a local-only field: OCR.Space remote player extraction is excluded by privacy policy. The two local readers must agree for a diagnostic player candidate.
- All consensus results are post-hoc diagnostics only. They do not alter source reader outputs, acceptance policy, or production records. The Gate B holdout must not be used to tune thresholds. Any threshold changes must first be developed and locked on a valid development corpus, then evaluated once on the holdout.

## 6. 21-image diagnostic inventory

The first 21 complete nine-field records remain a diagnostic analysis inventory. Gate B is exactly the first 19; records 20–21 are not counted toward Gate B.

For the 21-image/189-field diagnostic analysis:
- PDF text layer: 80/168 exact, 3 wrong, 85 unresolved.
- Provider parsed text: 91/168 exact, 19 wrong, 58 unresolved.
- Four-source consensus: 147/189 exact, 1 wrong, 41 unresolved.
- Strict four-source consensus: 68/189 exact, 0 wrong, 121 unresolved.
- Strict three-source consensus: 117/189 exact, 1 wrong, 71 unresolved.
- Three local-reader consensus: 112/189 exact, 1 wrong, 76 unresolved.

## 7. Future Gate A network enforcement correction

The current Gate A workflow is being hardened so future local/provider Node steps set step-scoped `NODE_OPTIONS` directly rather than attempting to write the reserved variable through `GITHUB_ENV`. The provider step explicitly sets:
- `OCRSPACE_ENABLED=1`
- `OCRSPACE_NETWORK_ALLOWLIST=1`
- `OCR_NON_OCR_NETWORK_RESTRICTED=1`
- a pre-created, writable `OCR_NON_OCR_NETWORK_LOG`
- both the candidate and fail-closed network guards as Node preloads.

Local-only recovery and reader-matrix steps use the fail-closed guard with provider access disabled. This corrects future runs; it does not change the historical status of the first Gate A submission.

## 8. Decision

- Gate A: **NOT PASSED**.
- Gate B (19-image holdout): **NOT PASSED**.
- 19-image PDF/raster artifact verification: **19/19 integrity/provenance checks passed**, but overall artifact report remains **FAILED** because original network evidence and Gate A are missing.
- 21-image analysis: **diagnostic only**.
- Production: **NO-GO**.
- No duplicate OCR.Space submissions were made during this review.
