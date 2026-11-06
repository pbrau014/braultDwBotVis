# DWBOT PDF Raster Geometry Audit — 2026-11-06

**Audit ID:** `PDFRASTER-GEOMETRY-2026-11-06-01`  
**Status:** PASS for geometry and embedded-PDF-image comparison, with scope limitations.

## Executive result

- Existing 63-image PDF corpus: **63/63 passed**; 0 failed.
- Existing Gate A corpus: **1/16 PDFs available**; the first image passed geometry/pixel comparison. The other 15 were not submitted and were not tested as PDF-derived artifacts.
- 63-image MAE: median 0.867, max 1.763; RMSE: median 2.356, max 5.763.
- No OCR.Space requests were made.

## What was verified

- Source hashes in the recovered run report match the v6 ground-truth source hashes for all 63 records.
- Every PDF and full-page raster byte hash matches the recovered run report.
- Every PDF contains exactly one embedded image, top-aligned at the page origin and spanning the full page width.
- Embedded image aspect ratio matches the original source dimensions in v6 ground truth.
- Cropping the full-page raster by source aspect ratio yields a crop whose pixels closely match the embedded PDF image resized to that crop (MAE<=3, RMSE<=8).
- The Gate A first PDF uses the same top-aligned full-width placement; its crop is 1818×1023 and comparison MAE/RMSE are 0.311/1.547.

## Gate A first-image caveat

- The existing Gate A first-image Tesseract result remains `FIRST_IMAGE_NOT_EXACT`: map was unresolved (`Not detected` vs expected `Aegis`).
- The searchable PDF text layer does contain `Aegis - Operations`. This is a provider-derived text-layer candidate, not a local OCR result.
- The Gate A 16-image acceptance report remains `FAIL`: the parallel reader matrix was missing, verified PDF count was 0 in that report, and original network evidence was missing/reconstructed-limited.

## Historical Gate B status

- The prior 19-image artifact-verification report is `FAILED`: PDF integrity, searchable text layer, raster integrity, and PDF-derived raster provenance passed; local readers failed; original network restriction remains `NOT_VERIFIED_MISSING_ORIGINAL_LOG`.
- The prior 19-image post-hoc evaluation: Tesseract.js 110/171 exact, 2 wrong candidates, 59 unresolved, 0 wrongly accepted; 2/19 complete records exact. Native Tesseract 103/171 exact, 2 wrong candidates, 66 unresolved, 0 wrongly accepted; 0/19 complete records exact.
- Strict four-source consensus had 0 wrong but 112/171 unresolved; permissive four-source consensus had 1 wrong and 39 unresolved. Neither passes Gate B.
- The local PaddleOCR failures in the recovery report were caused by Windows `UnicodeEncodeError` during JSON serialization. PR #12 is correcting all helper output paths with a single ASCII-safe serializer; its new CI run is pending.

## Scope and limitations

- The original 63 screenshot byte files are not present in the supplied PDF/raster artifact ZIP; source-image hashes and dimensions are taken from the v6 ground-truth/manifest and prior artifact verification. This audit compares the PDF crop to the image embedded in the PDF, not directly to the original screenshot bytes.
- Only one of the 16 Gate A screenshots has an existing searchable PDF in the supplied recovery artifact. The other 15 were not submitted; no new OCR.Space submissions were made or authorized.
- The Gate A first-image crop geometry passes, but its previous Tesseract-only record remains FIRST_IMAGE_NOT_EXACT because map was unresolved. The searchable PDF text layer contains “Aegis - Operations”; that is a separate provider-derived text candidate, not a local OCR result.
- This audit does not execute the PR #13 JavaScript/ImageMagick implementation on the Windows target. It is an independent geometry/pixel audit using PyMuPDF and Pillow against archived PDF/page-raster artifacts. PR #13 offline CI passed, while the corrected Gate B Windows recovery workflow is still pending.
- The historical Gate B artifact verification remains FAILED due to localReaders failure and missing original network diagnostic log. The 0-byte local-recovery network log only supports the local recovery run; it cannot reconstruct historical network attempts.

## Per-image 63-PDF audit

| # | Image | Source | Embedded | Crop | MAE | RMSE | Status |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | `PHX-1.jpg` | 1334×627 | 1334×627 | 1818×854 | 1.608 | 5.763 | PASS |
| 2 | `Screen55shot_376.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.433 | 2.054 | PASS |
| 3 | `Screens4hot_377.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.362 | 1.886 | PASS |
| 4 | `Screens666hot_373.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.400 | 2.049 | PASS |
| 5 | `Screenshot_20 526-10-18_135815.png` | 2880×1800 | 2600×1625 | 1818×1136 | 0.358 | 1.614 | PASS |
| 6 | `Screenshot_2026-08-05_094321.png` | 1920×1200 | 1920×1200 | 1818×1136 | 0.445 | 1.960 | PASS |
| 7 | `Screenshot_2026-08-05_175543.png` | 2376×1403 | 2376×1403 | 1818×1074 | 0.240 | 1.351 | PASS |
| 8 | `Screenshot_2026-09-02_182610.png` | 1837×1348 | 1837×1348 | 1818×1334 | 0.314 | 1.849 | PASS |
| 9 | `Screenshot_2026-09-23_100658.png` | 1919×1079 | 1919×1079 | 1818×1022 | 0.867 | 2.227 | PASS |
| 10 | `Screenshot_2026-10-02_154846.png` | 1919×1079 | 1919×1079 | 1818×1022 | 0.846 | 2.312 | PASS |
| 11 | `Screenshot_2026-10-13_221318.png` | 1919×1079 | 1919×1079 | 1818×1022 | 0.399 | 2.168 | PASS |
| 12 | `Screenshot_2026-10-16_224234.png` | 2403×1318 | 2403×1318 | 1818×997 | 0.258 | 1.463 | PASS |
| 13 | `Screenshot_2026-10-19_183512.png` | 1692×1174 | 1692×1174 | 1818×1261 | 0.345 | 1.704 | PASS |
| 14 | `Screenshot_2026-10-24_200118.png` | 1571×1055 | 1571×1055 | 1818×1221 | 0.495 | 2.096 | PASS |
| 15 | `Screenshot_2026-120-25_170028.png` | 1919×1079 | 1919×1079 | 1818×1022 | 0.744 | 2.052 | PASS |
| 16 | `Screenshot_366672.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.393 | 1.987 | PASS |
| 17 | `Screenshot_3771.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.442 | 2.080 | PASS |
| 18 | `Screenshot_3778.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.389 | 1.917 | PASS |
| 19 | `Screenshot_379.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.334 | 1.859 | PASS |
| 20 | `Screenshot_55374.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.313 | 1.831 | PASS |
| 21 | `lllfrfgfgff.png` | 1920×1080 | 1920×1080 | 1818×1023 | 0.582 | 2.220 | PASS |
| 22 | `pics-page1-image1.jpg` | 520×293 | 520×293 | 1818×1024 | 0.769 | 1.884 | PASS |
| 23 | `pics-page1-image10.jpg` | 520×293 | 520×293 | 1818×1024 | 1.095 | 2.356 | PASS |
| 24 | `pics-page1-image17.jpg` | 519×291 | 519×291 | 1818×1019 | 0.849 | 2.286 | PASS |
| 25 | `pics-page1-image25.jpg` | 535×334 | 535×334 | 1818×1135 | 1.494 | 3.067 | PASS |
| 26 | `pics-page1-image28.jpg` | 521×293 | 521×293 | 1818×1022 | 0.876 | 2.523 | PASS |
| 27 | `pics-page1-image29.jpg` | 520×292 | 520×292 | 1818×1021 | 0.511 | 1.584 | PASS |
| 28 | `pics-page10-image29.jpg` | 520×293 | 520×293 | 1818×1024 | 1.122 | 2.534 | PASS |
| 29 | `pics-page10-image53.jpg` | 520×293 | 520×293 | 1818×1024 | 1.388 | 3.341 | PASS |
| 30 | `pics-page11-image53.jpg` | 537×230 | 537×230 | 1818×779 | 1.118 | 3.111 | PASS |
| 31 | `pics-page11-image71.jpg` | 520×293 | 520×293 | 1818×1024 | 1.626 | 2.982 | PASS |
| 32 | `pics-page12-image15.jpg` | 528×378 | 528×378 | 1818×1302 | 1.746 | 4.053 | PASS |
| 33 | `pics-page12-image43.jpg` | 520×293 | 520×293 | 1818×1024 | 1.110 | 2.936 | PASS |
| 34 | `pics-page2-image21.jpg` | 521×293 | 521×293 | 1818×1022 | 1.050 | 2.821 | PASS |
| 35 | `pics-page2-image35.jpg` | 521×293 | 521×293 | 1818×1022 | 0.706 | 2.339 | PASS |
| 36 | `pics-page2-image6.jpg` | 520×293 | 520×293 | 1818×1024 | 1.348 | 2.933 | PASS |
| 37 | `pics-page2-image9.jpg` | 533×283 | 533×283 | 1818×965 | 0.913 | 2.619 | PASS |
| 38 | `pics-page3-image1.jpg` | 521×293 | 521×293 | 1818×1022 | 0.875 | 2.462 | PASS |
| 39 | `pics-page3-image22.jpg` | 520×293 | 520×293 | 1818×1024 | 0.722 | 2.377 | PASS |
| 40 | `pics-page3-image28.jpg` | 529×399 | 529×399 | 1818×1371 | 1.476 | 2.748 | PASS |
| 41 | `pics-page3-image31.jpg` | 533×282 | 533×282 | 1818×962 | 0.936 | 2.462 | PASS |
| 42 | `pics-page3-image5.jpg` | 529×314 | 529×314 | 1818×1079 | 1.575 | 3.261 | PASS |
| 43 | `pics-page3-image8.jpg` | 537×334 | 537×334 | 1818×1131 | 0.750 | 2.218 | PASS |
| 44 | `pics-page5-image24.jpg` | 520×293 | 520×293 | 1818×1024 | 1.150 | 2.477 | PASS |
| 45 | `pics-page5-image47.jpg` | 520×271 | 520×271 | 1818×947 | 0.735 | 2.254 | PASS |
| 46 | `pics-page6-image10.jpg` | 525×324 | 525×324 | 1818×1122 | 1.112 | 2.645 | PASS |
| 47 | `pics-page6-image23.jpg` | 518×324 | 518×324 | 1818×1137 | 0.603 | 1.956 | PASS |
| 48 | `pics-page6-image26.jpg` | 524×272 | 524×272 | 1818×944 | 1.731 | 3.203 | PASS |
| 49 | `pics-page6-image33.jpg` | 518×293 | 518×293 | 1818×1028 | 0.584 | 1.879 | PASS |
| 50 | `pics-page6-image35.jpg` | 520×293 | 520×293 | 1818×1024 | 0.714 | 2.068 | PASS |
| 51 | `pics-page7-image2.jpg` | 537×293 | 537×293 | 1818×992 | 0.904 | 2.612 | PASS |
| 52 | `pics-page7-image22.jpg` | 518×290 | 518×290 | 1818×1018 | 0.594 | 1.633 | PASS |
| 53 | `pics-page7-image33.jpg` | 520×272 | 520×272 | 1818×951 | 0.998 | 2.637 | PASS |
| 54 | `pics-page7-image64.jpg` | 529×399 | 529×399 | 1818×1371 | 1.235 | 3.300 | PASS |
| 55 | `pics-page7-image66.jpg` | 520×292 | 520×292 | 1818×1021 | 1.566 | 2.722 | PASS |
| 56 | `pics-page7-image70.jpg` | 520×292 | 520×292 | 1818×1021 | 0.918 | 2.505 | PASS |
| 57 | `pics-page7-image9.jpg` | 529×399 | 529×399 | 1818×1371 | 1.763 | 3.361 | PASS |
| 58 | `pics-page8-image12.jpg` | 520×293 | 520×293 | 1818×1024 | 0.757 | 2.477 | PASS |
| 59 | `pics-page8-image15.jpg` | 520×293 | 520×293 | 1818×1024 | 1.497 | 2.888 | PASS |
| 60 | `pics-page8-image5.jpg` | 520×293 | 520×293 | 1818×1024 | 1.156 | 3.266 | PASS |
| 61 | `pics-page8-image78.jpg` | 290×217 | 290×217 | 1818×1360 | 0.886 | 2.293 | PASS |
| 62 | `pics-page9-image6.jpg` | 520×293 | 520×293 | 1818×1024 | 1.447 | 3.024 | PASS |
| 63 | `pics-page9-image8.jpg` | 529×283 | 529×283 | 1818×973 | 1.172 | 2.609 | PASS |

## Provenance fingerprints

- 63 PDF/raster ZIP SHA-256: `ac4ae071ee4737c2fe044b64456a8dab1cddf7073a02f8f427ec7b35af28629a`
- Gate B report ZIP SHA-256: `7883e48d7f206d2e2ba65d55d9b22a61c89b230454394825950a0328f8521cb1`
- Gate A recovery ZIP SHA-256: `d9774e950309a91396e61ae3232b8e5cd966cc8d1a39475cac08529592030ffa`
- v6 ground-truth JSON SHA-256: `9db97e8fbb4f74eac423040cb0f99ce5da98e75758cb0b36b3f4cdac15ab340d`
- Candidate manifest SHA-256: `c84f590e61ef835c9b53cf6baceb3f1937cf88b06cb9aafaf0472c65f796ffc6`