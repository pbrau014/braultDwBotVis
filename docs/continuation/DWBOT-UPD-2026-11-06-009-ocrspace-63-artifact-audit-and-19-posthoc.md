# OCR.Space imagesF-63 artifact audit and 19-image post-hoc evaluation

**Date:** 2026-11-06  
**Source extraction run:** [#42160979140](https://github.com/pbrau014/braultDwBotVis/actions/runs/42160979140)  
**Source commit:** `adaf4f8c3a9573f56d0348a4bba36686fc31c22e`  
**Status:** Exploratory artifact verified; Gate B NOT PASSED.

## 1. Downloaded artifact identity

The completed 63-image extraction uploaded `dwbot-imagesF-63-ocrspace-exploratory`.

- Artifact ID: `13482219732`
- Size: 81,886,966 bytes
- GitHub artifact digest: `sha256:ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a`
- Downloaded ZIP SHA-256: `ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a` (matches GitHub)
- ZIP integrity: passed; 63 PDF files, 63 raster PNG files, reports, preflight and progress evidence.

The run report records 63 successful PDF extractions, zero failed images, OCR.Space Engine 2 PDF-first processing and `originalScreenshotFallback=false`. The source archive hash in the run report matches the 63-image candidate archive hash in the preflight report. The original source archive hash is recorded separately in the candidate manifest.

## 2. Independent all-63 file checks

The downloaded archive was checked locally without provider requests:
- 63/63 PDFs exist and match their recorded byte counts, SHA-256 values and `%PDF-` signatures.
- 63/63 raster PNGs exist and match their recorded byte counts, SHA-256 values, PNG signatures and dimensions.
- 63/63 PDFs are one page and produce non-empty searchable text with `pdftotext`.
- The run-report checksum sidecar matches the report file.
- The source run report confirms original-screenshot fallback is false.
- Preflight confirms 63 image members and all per-image source hashes verified.

The original run report had two local-reader interruptions:
- Image 5: one local reader output absent.
- Image 9: both local reader outputs absent.

The subsequent 21-image local-reader recovery processed only those timed-out local-reader rows from verified PDF-derived rasters. It recorded `providerRequests=0`, `networkBlockedAttempts=0`, and an empty local-recovery network log whose SHA-256 is the empty-file digest. No OCR.Space image was resubmitted.

## 3. 19-image Gate B artifact verification

The first 19 complete nine-field reference records are the current Gate B subset. The first artifact-verification attempt is [run #42188778894](https://github.com/pbrau014/braultDwBotVis/actions/runs/42188778894).

- Artifact ID: `13489626607`
- Size: 200,529 bytes
- GitHub digest and downloaded ZIP SHA-256: `88be991f2f0e863cde528f2a5a452af9cdd8937efee24c14522ae565229a00fe`

The report verified:
- Source image hashes: PASS
- PDF integrity: PASS
- Searchable PDF text layer: PASS
- Raster integrity: PASS
- PDF-derived raster provenance (PDF rerender and pixel/hash comparison): PASS
- Local readers: PASS
- Secret leak scan: PASS

Two reporting/verification defects were found and corrected in subsequent commits:
1. The verifier inverted the meaning of `originalScreenshotFallback`: it reported true when the source run explicitly recorded false. The check now records the actual fallback state and fails closed if the source value is missing.
2. The reconciliation JSON was written with a UTF-8 BOM and the verifier used plain `JSON.parse`, so it reported `NOT_PROVIDED`. The parser now strips the BOM safely. The next report will show the reconstructed reconciliation status.

The underlying original network log is still genuinely absent. The source extraction workflow enabled the restricted-egress guard and OCR.Space allowlist but did not configure `OCR_NON_OCR_NETWORK_LOG`. Available source job logs contained zero blocked-egress markers and per-image records contained zero network-block failure rows. The exact historical blocked-attempt count is unknown; no zero-attempt claim is made. A reconstructed text/JSON evidence note is included in the corrected verification workflow, but this is limited evidence and does not satisfy Gate A or Gate B network proof.

The local-reader recovery itself had network restriction PASS, zero blocked attempts, zero provider requests and a matching empty log. That evidence applies only to the later local-only recovery, not the original extraction.

## 4. 19-image post-hoc field evaluation

The first 19-image post-hoc report compares local-reader candidates against the eligible v6 manual reference fields. These are **candidate field exact-match rates**, not accepted-record accuracy and not a Gate B pass.

| Method | Exact fields | Wrong unaccepted candidates | Unresolved fields | Field exact-match rate | Complete nine-field records |
|---|---:|---:|---:|---:|---:|
| Tesseract.js on PDF-derived raster | 110 / 171 | 2 | 59 | 64.33% | 2 / 19 exact (10.53%); 17 unresolved |
| Native Tesseract on PDF-derived raster | 103 / 171 | 2 | 66 | 60.23% | 0 / 19 exact; 19 unresolved |

No wrong candidate was accepted as a mandatory field. The two wrong values per local engine remain unaccepted candidates. The high unresolved counts prevent acceptance of full records.

## 5. Searchable PDF text layer versus multi-reader fusion

The 19-image PDF text-layer report measured these arrangements:

| Arrangement | Eligible field values | Exact | Wrong candidates | Unresolved | Exact-match rate |
|---|---:|---:|---:|---:|---:|
| OCR.Space searchable PDF text layer alone (player excluded by identity policy) | 152 | 73 | 2 | 77 | 48.03% |
| OCR.Space provider parsed text alone | 152 | 79 | 17 | 56 | 51.97% |
| PDF text layer + Tesseract.js for player | 171 | 81 | 2 | 88 | 47.37% |
| PDF text layer + native Tesseract for player | 171 | 81 | 2 | 88 | 47.37% |
| Strict three-source consensus (PDF text + Tesseract.js + native Tesseract; player uses the two local readers) | 171 | 104 | 1 | 66 | 60.82% |

The searchable PDF text layer is useful, but it is not sufficient by itself to extract all nine fields: the identity field is excluded from the PDF-text parser, and the measured text-layer-only field rate is 48.03%. The best tested arrangement so far is strict three-source consensus, but it still has one wrong candidate and 66 unresolved fields; only one of 19 complete records is fully exact under that fusion. It is not safe to auto-accept.

The corrected evaluator now also tests:
- PDF text + OCR.Space parsed-text agreement;
- four-source unique majority across PDF text, provider parsed text, Tesseract.js and native Tesseract;
- strict three-of-four agreement;
- local-reader consensus for player identity;
- tied votes as unresolved, never resolved by input order.

These additional combinations are included in the next 19/21 diagnostic workflow run. They do not use OCR.Space provider requests.

## 6. Runtime and acceptance limitations

The source extraction run used Node 22.16.0, which meets the current authorized Node >=22.16.0 baseline. It remains exploratory rather than a release acceptance run because its original restricted-egress diagnostic log is missing and the mandatory-field outputs remain unresolved.

The 19-image report is also blocked by:
- Gate A remains PENDING.
- Original source-run restricted-egress log is missing; reconstructed evidence cannot claim zero historical attempts.
- The local-reader candidate outputs contain many unresolved mandatory fields.
- The current manual ground truth is a reviewed reference but does not have a recorded blind second reviewer.

The 19-image Gate B holdout count is 19. The separate 21-image analysis is diagnostic only and cannot be used to silently restore the former 21-image Gate B requirement.

## 7. Gate A requirements and source dependency

See `DWBOT-GATEA-REQUIREMENTS-AND-STATUS-2026-11-06.md`.

The 16-image reference file exists, but its source archive `imgs2add.zip` is not accessible in the current Library or repository. The available `imgsHalf1.zip` is a separate 56-image archive and has zero exact source-image SHA-256 matches to the 16-image report. Do not substitute it. The existing native-16 report recorded 5/16 exact full records and 6/16 required-field-complete records; it is not PDF-first Gate A evidence.

## 8. Current recovery and verification code changes

- Restricted-egress guard now requires a writable diagnostic log path when enabled and fails closed on missing/unwritable log or log-write errors.
- Current 63-image extraction workflow sets `OCR_NON_OCR_NETWORK_LOG` before provider requests.
- Artifact verifier now handles BOM-prefixed reconciliation JSON and reports original screenshot fallback correctly.
- Workflow preserves a human-readable reconstructed network evidence note and labels the historical count UNKNOWN.
- The 21-image workflow now produces a separate 21-image post-hoc diagnostic and PDF text-layer/multi-source report without provider requests.
- Four-source consensus strategies and tie rejection are covered by regression tests.
- Exact-head CI for the latest code is pending; no passing result is claimed until the exact run completes.



## 9. Gate A preflight and interrupted partial attempt

The original `imgs2add.zip` archive bytes remain unavailable, but the repository
contains the exact 16 individual fixture files referenced by the existing
ground-truth manifest. The Gate A preflight verified all 16 per-image SHA-256
values, unique membership, valid dimensions and all nine expected fields.
The deterministic corpus fingerprint is
`6c03d85173bb07103cee9a3075ffa708751b36da2ba3bb49d27fedcdb8468efe`; the
manifest SHA-256 is
`9e8ab701428a93e0ceb2306447e29bedd697b1c2ed50520d057414d8224e79bd`.
The preflight matched the candidate source commit
`adaf4f8c3a9573f56d0348a4bba36686fc31c22e` and made zero provider requests.

Gate A run [#42202563673](https://github.com/pbrau014/braultDwBotVis/actions/runs/42202563673)
was interrupted during image 1/16. Its uploaded artifact
`dwbot-gateA-16-pdf-first-42202563673` (ID `13495008195`, ZIP SHA-256
`398f8152847cd3ea58fb9e16ac01886fced0c880869ce6a430d3343e5cb4ecd8`)
contains a searchable one-page PDF and PDF-derived raster for
`Screenshot_16.jpg`, whose source SHA-256 matches the manifest. The PDF is
535,706 bytes (SHA-256
`98532da5058778aeee8a46515a8a6a12a3c20cb865565f974271706777b7ec93`) and
contains 550 characters of searchable text. The raster is 1,033,392 bytes,
1818×2573 (SHA-256
`620fd7395a4736d6c95a3ab89a1cb2924cfb019e7547d534b1ffcde6458bda72`).

The other 15 images were not processed. No local-reader report or complete
sequence report was uploaded. The original run used Node 22.16.0, below the
accepted Node >=24.17.0 runtime. Its restricted-egress log is missing, and
the candidate's old guard silently catches log-write failures. The historical
blocked-attempt count is therefore UNKNOWN; no zero-attempt claim is made.
The second queued run was cancelled before execution, and no duplicate
submission of the first image was made.

The current Gate A workflow definition has been updated to Node 24.17.0 with
an explicit runtime check. These changes cannot repair the interrupted run.
Gate A remains NOT PASSED. Any continuation must verify and reuse the existing
PDF/raster for image 1, process only the 15 remaining source hashes, and retain
the original missing-log/runtime limitations in the report.


## 10. Latest completed no-provider 19/21 verification — run #42202349114

The corrected artifact-verification workflow completed and uploaded artifact
`dwbot-imagesF-19-gateB-artifact-verification-42160979140`:
- Run: [#42202349114](https://github.com/pbrau014/braultDwBotVis/actions/runs/42202349114)
- Artifact ID: `13496000656`
- Size: 233,466 bytes
- GitHub digest and downloaded ZIP SHA-256:
  `282f728280b2bfcae9d58d28e48e469a3dfa6108a31feebcdb9e0fc1ccd06f96`
- The workflow made zero OCR.Space provider requests.

### 19-image artifact checks

All 19 selected source-image hashes, PDFs, searchable text layers, PDF-derived
rasters, PDF-to-raster provenance comparisons, local-reader availability and
secret-leak checks passed. The verifier also confirmed
`originalScreenshotFallback=false`.

The overall artifact report remains `FAILED` for release gating because:
- Gate A evidence is still pending/not passed.
- The original 63-image run's restricted-egress diagnostic log is absent.
- The historical unauthorized-attempt count is `null`/UNKNOWN, not zero.

The reconciliation report is `RECONSTRUCTED_LIMITED_EVIDENCE`. The source
workflow had the restricted-egress guard and OCR.Space allowlist enabled, but
did not configure the log path. Source job logs show zero blocked markers and
per-image records show zero network-block failure rows; those observations
cannot reconstruct the missing log. No zero-attempt claim is made.

The later local-only recovery is separately verified:
- Status: `COMPLETED_LOCAL_ONLY_RECOVERY`
- Provider requests: 0
- Network blocked attempts: 0
- All network destinations blocked
- Empty diagnostic log SHA-256:
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### Final 19-image field evaluation after recovery

| Field | Tesseract.js exact | Native Tesseract exact |
|---|---:|---:|
| result | 19/19 | 19/19 |
| player | 8/19 | 8/19 |
| map | 5/19 | 4/19 |
| mode | 10/19 | 7/19 |
| battleStart | 14/19 | 13/19 |
| credits | 19/19 | 19/19 |
| freeXp | 11/19 (1 wrong, unaccepted) | 11/19 (2 wrong, unaccepted) |
| damage | 8/19 | 7/19 |
| xp | 16/19 (1 wrong, unaccepted) | 15/19 |

Aggregate:
- Tesseract.js: 110/171 exact fields (64.33%), 2 wrong unaccepted
  candidates, 59 unresolved; 2/19 fully exact nine-field records and 17/19
  unresolved records.
- Native Tesseract: 103/171 exact fields (60.23%), 2 wrong unaccepted
  candidates, 66 unresolved; 0/19 fully exact nine-field records and 19/19
  unresolved records.
- Wrongly accepted mandatory values: zero for both engines.
- Source hash mismatches: zero; missing run rows: zero; reader rows: 19/19
  for each engine.

These are field-candidate exact-match measurements, not accepted-record
accuracy and not Gate B PASS. The unresolved fields are the decisive blocker.

### Separate 21-image diagnostic

The same completed run also produced a 21-image diagnostic, not a Gate B
holdout:
- Tesseract.js: 123/189 exact fields (65.08%), 2 wrong unaccepted candidates,
  64 unresolved; 2/21 fully exact records.
- Native Tesseract: 116/189 exact fields (61.38%), 2 wrong unaccepted
  candidates, 71 unresolved; 0/21 fully exact records.
- Gate B status for this diagnostic inventory:
  `NOT_EVALUATED_GATE_B_19_REQUIRES_GATE_B_INVENTORY`.

### PDF text layer and multi-source arrangements

The final 19-image analysis tested these procedures, all without provider
requests:

| Arrangement | Exact / eligible | Wrong | Unresolved | Exact-match rate |
|---|---:|---:|---:|---:|
| PDF text layer alone (player excluded by identity policy) | 73/152 | 2 | 77 | 48.03% |
| OCR.Space parsed text alone (player excluded) | 79/152 | 17 | 56 | 51.97% |
| PDF text + Tesseract.js for player | 81/171 | 2 | 88 | 47.37% |
| PDF text + native Tesseract for player | 81/171 | 2 | 88 | 47.37% |
| Provider parsed text + Tesseract.js for player | 87/171 | 17 | 67 | 50.88% |
| Provider parsed text + native Tesseract for player | 87/171 | 17 | 67 | 50.88% |
| PDF/provider consensus | 80/171 | 0 | 91 | 46.78% |
| Strict three-source consensus | 104/171 | 1 | 66 | 60.82% |
| Four-source unique-majority consensus | 131/171 | 1 | 39 | 76.61% |
| Strict four-source consensus | 59/171 | 0 | 112 | 34.50% |

The four-source unique-majority method has the highest measured field coverage,
but it still has one wrong candidate and 39 unresolved values. Strict
four-source consensus eliminates wrong candidates in this sample but leaves
112 unresolved values. Neither is safe for automatic acceptance. Keep
conflicting/tied candidates unresolved; preserve source-specific evidence and
do not promote a candidate merely because a majority method raises coverage.

### Current gate decision

Gate B remains `NOT_PASSED`. The 19-image artifact-integrity and reader
checks are complete, but Gate A, original network evidence, and fully resolved
nine-field outputs remain blockers. The 21-image output remains diagnostic
only. No additional OCR.Space submissions were made during this verification.


## 11. Latest downloaded artifact and 19-image analysis — run #42210718226

The original 63-image extraction is now confirmed complete:
- Source run: [#42160979140](https://github.com/pbrau014/braultDwBotVis/actions/runs/42160979140), completed successfully.
- Artifact ID: `13482219732`, 81,886,966 bytes.
- GitHub digest and independently downloaded ZIP SHA-256:
  `ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a`.
- 63 searchable PDFs and 63 PDF-derived rasters were present. The run report records 63 successful PDF extractions, zero failed images, Engine 2 and no original-screenshot fallback.

The latest 19-image no-provider verification attempt is [run #42210718226](https://github.com/pbrau014/braultDwBotVis/actions/runs/42210718226):
- Artifact ID: `13502190474`, 267,125 bytes.
- GitHub digest and independently downloaded ZIP SHA-256:
  `a0254e8ec900b8cb695a3bde92640c47e472435cb347d2b5aa928923a8c1f902`.
- Source-image hashes: PASS for 19/19.
- PDF integrity: PASS for 19/19.
- Searchable PDF text layer: PASS for 19/19.
- Raster integrity and PDF-derived raster provenance: PASS for 19/19.
- Secret-leak scan: PASS.
- Local readers: FAIL for 19/19 as an acceptance component because PaddleOCR returned `failed-open` for every image; Tesseract.js and native Tesseract did return rows.
- Original extraction network restriction: `NOT_VERIFIED_MISSING_ORIGINAL_LOG`; the reconciliation status is `RECONSTRUCTED_LIMITED_EVIDENCE`, not a historical zero-attempt result.
- Local-only recovery network restriction: PASS, zero blocked attempts, zero provider requests, empty-log SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Overall artifact report: FAILED, 0/19 fully verified because the local-reader and original-network evidence conditions remain open. The 19 PDF/raster pairs themselves passed all file/provenance checks.

### 19-image per-engine post-hoc results

| Reader | Exact eligible fields | Wrong unaccepted candidates | Unresolved fields | Field exact-match rate | Fully exact nine-field records |
|---|---:|---:|---:|---:|---:|
| Tesseract.js | 110 / 171 | 2 | 59 | 64.33% | 2 / 19 (10.53%) |
| Native Tesseract | 103 / 171 | 2 | 66 | 60.23% | 0 / 19 (0%) |

Wrong candidate values were not accepted as mandatory fields. The full-record counts remain inadequate: 17/19 and 19/19 records respectively have unresolved required outputs.

### 19-image fusion comparison

| Arrangement | Exact | Wrong | Unresolved | Exact-match rate |
|---|---:|---:|---:|---:|
| PDF text layer alone (8 non-identity fields) | 73 / 152 | 2 | 77 | 48.03% |
| OCR.Space provider parsed text alone (8 non-identity fields) | 79 / 152 | 17 | 56 | 51.97% |
| PDF text + provider + Tesseract.js + native unique majority | 131 / 171 | 1 | 39 | 76.61% |
| Strict three-source consensus (PDF + Tesseract.js + native) | 104 / 171 | 1 | 66 | 60.82% |
| Strict four-source consensus (3 of 4) | 59 / 171 | 0 | 112 | 34.50% |

Four-source majority gives the best field-level exact count but has one wrong candidate and 39 unresolved fields. On complete-record grouping it yields 1 fully exact record, 1 record with a wrong candidate, and 17 unresolved records. Strict four-source consensus removes the wrong candidate in this sample but leaves all 19 records unresolved. Neither arrangement is safe for automatic acceptance.

### 21-image diagnostic-only matrix

The 21-image report includes the first 19 Gate B records plus two additional complete-reference records. It is diagnostic only; it does not change the Gate B inventory.

- PDF text layer: 80/168 exact (47.62%), 3 wrong, 85 unresolved.
- OCR.Space parsed text: 91/168 exact (54.17%), 19 wrong, 58 unresolved.
- Four-source majority: 147/189 exact (77.78%), 1 wrong, 41 unresolved; 2 fully exact nine-field records, 1 with a wrong candidate, 18 unresolved.
- Strict four-source consensus: 68/189 exact (35.98%), zero wrong, 121 unresolved; no complete nine-field record.
- Three-local-reader consensus (PaddleOCR unavailable): 112/189 exact (59.26%), 1 wrong, 76 unresolved.

The PDF text layer alone is not sufficient for the nine fields. In these PDFs the text layer reliably exposes result/map/mode/battle time, but the reward line frequently merges or misreads adjacent numeric values; player identity is excluded by policy. Multi-source fusion improves field-level coverage, but even the best majority still produces one wrong candidate and unresolved fields. All candidates remain diagnostic and unaccepted.

### PaddleOCR recovery diagnosis

The local runtime install manifest reports PaddleOCR 3.7.0 / PaddlePaddle 3.3.1, complete PP-OCRv6 medium model files, and a successful offline smoke test with zero network attempts. However, the 21-image recovery report records PaddleOCR `failed-open` on all 21 images. The previous child output discarded the underlying helper error, so the precise runtime cause was not retained. The current code now preserves the fallback error, helper status, requested fields and attempted crops in the child result and recovery report. A new no-provider run is required to diagnose the underlying failure; no provider request is needed.

### Network log reconciliation

The original extraction artifact did not contain `imagesF-63-blocked-network-attempts.log`. The later verifier inspected the source workflow and available completed job logs:
- source workflow had restricted-egress enabled and OCR.Space allowlisting enabled;
- source workflow did not configure `OCR_NON_OCR_NETWORK_LOG`;
- the guard writes events only when a log path is configured;
- available source job logs contained zero blocked-attempt markers;
- per-image run rows contained zero network-block failure rows;
- historical blocked-attempt count remains UNKNOWN and zero attempts are NOT claimed.

A new synthetic empty file cannot reconstruct the historical log. The separately generated reconciliation JSON/text are the correct workaround: they preserve the absence, corroborating observations, and limitation without impersonating original evidence.

### Exact-head verification failure and correction

Exact-head run [#42210718244](https://github.com/pbrau014/braultDwBotVis/actions/runs/42210718244) failed in Linux, Windows and clean-package full-suite steps on one stale assertion in `tests/full-system.test.js`: it expected the old `Total doubloons (G12-equivalent)` wording in `!yolo standings`, while the public command correctly emits `All-player aggregate (50/50 players): ... doubloons`. The `!yolo totals` command retains the former label. The test now asserts the actual public standings contract. The earlier verification steps, including desktop service/bridge and UI tests, passed; the full suite remains unverified until the next exact-head run completes.

The PaddleOCR child/recovery diagnostics are also now preserved in the report rather than collapsed to a generic `failed-open`. New exact-head DWBOT verification and no-provider Gate B runs are queued against commit `a290730c057cd26d3abc7d5e24e8bf17593a99ba`:
- DWBOT verification: [#42236474184](https://github.com/pbrau014/braultDwBotVis/actions/runs/42236474184)
- 19-image no-provider artifact verification: [#42236474159](https://github.com/pbrau014/braultDwBotVis/actions/runs/42236474159)

Gate A and Gate B remain NOT PASSED. Production remains NO-GO.


## 12. Runtime floor correction

A later user-authorized runtime decision recorded in the governing plan and
`package.json` establishes Node.js **>=22.16.0** as acceptable; Node 24+ is
permitted but not mandatory. The source extraction run's Node 22.16.0 runtime
therefore meets the current project floor. Earlier statements in this report
that it was below the accepted Node 24.17.0 minimum are superseded.

The extraction remains exploratory and does not establish Gate A or Gate B:
Gate A still has only one of 16 PDF/raster pairs and lacks its original
network log; Gate B still has incomplete local-reader evidence, unresolved
mandatory values and missing original network-log proof.


## Run #42239832115 — completed artifact and local-recovery findings

- The 63-image source artifact was downloaded and its ZIP SHA-256 verified
  against GitHub: `ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a`.
  It contains 63 searchable one-page PDFs and 63 PDF-derived PNG rasters.
  Independent local inspection found valid PDF signatures/EOF markers,
  exactly one page and non-empty text for all 63 PDFs, and valid PNGs for all
  63 rasters. The 21 selected complete-record pairs also passed the recovery
  workflow's PDF/raster provenance checks.
- The no-provider local recovery completed for all 21 analysis records:
  Tesseract.js recovered 21/21 and native Tesseract recovered 21/21. PaddleOCR
  failed 21/21 because the field-crop helper exceeded its 15,000 ms deadline.
  The recovery report records 0 provider requests and 0 blocked network
  attempts in the *new local-only recovery*. Its empty network log is not the
  missing historical OCR.Space-run log.
- The 19-image post-hoc report was produced, but its artifact-verification
  report was absent. The artifact-verification step failed while parsing the
  BOM-prefixed `gate-a-acceptance-source.json`; the verifier had BOM handling
  for the network reconciliation file but not the Gate A report. This is a
  parser defect, not evidence of a PDF/raster mismatch. The verifier now strips
  a UTF-8 BOM consistently from run, ground-truth, preflight, reconciliation
  and Gate A JSON, with a regression test using an actual BOM byte sequence.
- The diagnostic field results across 171 eligible field values were:
  - PDF text layer alone: 73 exact, 2 wrong, 77 unresolved (48.03% field exact).
  - OCR.Space parsed text alone: 79 exact, 17 wrong, 56 unresolved (51.97%).
  - PDF + provider consensus: 80 exact, 0 wrong, 91 unresolved (46.78%).
  - Four-source consensus: 131 exact, 1 wrong, 39 unresolved (76.61%).
  - Strict four-source consensus: 59 exact, 0 wrong, 112 unresolved (34.50%).
  These are exploratory field-level measurements, not a Gate B accuracy pass.
  The one wrong four-source acceptance is a hard blocker; the strict
  zero-wrong variant leaves too many mandatory fields unresolved.
- The results support a PDF-text-first *reader*, not PDF-text-only acceptance.
  Keep PDF text, OCR.Space parsed text, Tesseract.js, native Tesseract and
  PaddleOCR as separate provenance-labelled candidates. Apply field-specific
  validation and strict consensus; never let one reader or confidence alone
  authorize a mandatory value. Unresolved values remain blank for review.
- Recovery/idempotency was improved after this run: successful local readers
  are now preserved only when their engine/status/record are unambiguous;
  only missing, failed or duplicate/ambiguous engine rows are retried. PDF
  text is re-extracted from the hash-verified PDF. The source pipeline string
  is checked before recovery. The bounded PaddleOCR crop deadline was raised
  from 15 to 60 seconds (still below the 185-second supervised process limit).
- The v6 ground-truth JSON, SHA-256 sidecar and candidate manifest now agree on
  the 19-image Gate B holdout (first 19 corpus-order complete records).
  Records 20–21 remain diagnostic-only. The updated ground-truth SHA-256 is
  `62ea492c9d4a4a05b33d16c67bb4ec31ebdc07b67cbf47d3e4a3062ff8d1dfb3`.
- The original 63-image artifact has no original restricted-egress diagnostic
  log. The source job logs show the restriction/allowlist flags but no
  configured log path and no blocked-request marker. The historical attempt
  count remains UNKNOWN. The network reconciliation explicitly records
  `RECONSTRUCTED_LIMITED_EVIDENCE`, `originalBlockedAttemptCount: null` and
  `zeroAttemptsClaimed: false`. Do not fabricate an empty historical log.
- Run #42239832115 failed only at the artifact-verifier JSON parse step and
  therefore produced no formal `artifact-verification-19.json`. The new
  BOM-safe, 60-second, idempotent recovery workflow is queued as #42249191471;
  it makes no OCR.Space requests.

