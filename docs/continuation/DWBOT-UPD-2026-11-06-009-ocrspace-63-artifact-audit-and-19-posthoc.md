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

The source extraction run used Node 22.16.0. The accepted Windows OCR baseline is Node >=24.17.0 (the established Windows environment is Node 26.13.0 / npm 11.20.0). Therefore, this 63-image provider run is exploratory, not a valid release acceptance run.

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
