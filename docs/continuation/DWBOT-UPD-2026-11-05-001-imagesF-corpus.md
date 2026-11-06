# DWBOT update — imagesF corpus preparation

Date: 2026-11-05 (UTC archive timestamps may show 2026-11-06)
Repository: `pbrau014/braultDwBotVis`
Branch: `main`

## Source and derived artifacts

- Uploaded source: `imagesF.zip`
- Source bytes: 30,540,663
- Source SHA-256: `5e247c841701ee68a5c8179f8ee28dccbf6bc4cd3706d5c831a7e04473ce5e8a`
- Source image members: 69
- Derived candidate archive: `DWBOT_IMAGESF_HOLDOUT_CANDIDATE_63.zip`
- Derived archive bytes: 25,862,132
- Derived archive SHA-256: `6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3`
- Full per-image inventory manifest SHA-256: `c84f590e61ef835c9b53cf6baceb3f1937cf88b06cb9aafaf0472c65f796ffc6`
- The derived archive contains 63 image files and its own full manifest. Original uploaded archive and supplied ground-truth files were not modified.

## Disposition

Three previously used 16-image development-corpus screenshots were kept separate and excluded:
- `Screenshot_16.jpg`
- `Screenshot_2023-02-21_20-54-39.png`
- `Screenshot_2024-11-14_133326.png`

Three duplicate representatives were removed:
- Exact byte duplicate: removed `Scree7nshot_379.png`; retained `Screenshot_379.png` (same bytes and SHA-256).
- Visually confirmed same battle/result: removed `pics-page1-image26.jpg`; retained `pics-page1-image25.jpg` (different crop/framing).
- Visually confirmed same battle/result: removed `pics-page2-image7.jpg`; retained `pics-page2-image6.jpg` (different crop/framing).

Thus 69 source images - 3 development overlaps - 3 duplicate copies = 63 candidate images. The two visually confirmed pairs are recorded as near-duplicates, not byte-identical files.

## Ground-truth qualifications retained

The supplied 56-image review workbook remains an incomplete annotation source:
- 46 populated image rows.
- 36 rows with all nine required fields populated.
- 10 rows with at least one missing required field.
- 10 eligible images have no populated row.
- The companion JSON is an integrity inventory and does not contain complete expected-value transcriptions.

No missing image row or field value was invented, inferred, or silently repaired. The new 63-image per-image manifest marks ground truth as not independently transcribed. The 56-image review source is preserved unchanged.

## Gate and execution status

This is corpus preparation and provenance recording, not OCR accuracy acceptance. The 63-image archive is suitable for an exploratory OCR.Space Engine 2 PDF-first extraction/diagnostic run with per-image source/PDF/raster hashes and explicit `NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH` metrics. It cannot establish Gate B exact-field or complete-record accuracy while its labels are absent.

No new images from `imagesF.zip` have been submitted to OCR.Space as part of this update. The existing run #428 is a separate old-corpus workflow and its in-progress screenshot acceptance step is named Tesseract.js/native Tesseract, not evidence of OCR.Space live submissions. Preserve that distinction when recording its eventual result.

Production remains NO-GO. No production data, Discord actions, or deployment were used.
