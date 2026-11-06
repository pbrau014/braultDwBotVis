# DWBOT update — imagesF-63 working ground truth and image review

Date: 2026-11-06
Repository: `pbrau014/braultDwBotVis`
Branch: `main`

## Provenance and integrity

- Original source archive: `imagesF.zip`, 30,540,663 bytes, SHA-256 `5e247c841701ee68a5c8179f8ee28dccbf6bc4cd3706d5c831a7e04473ce5e8a`.
- Derived 63-image candidate archive: 25,862,132 bytes, SHA-256 `6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3`.
- All 63 retained candidate image files were independently rehashed from the original archive and matched their candidate manifest byte lengths and SHA-256 values: 63/63 PASS.
- The working workbook preserves all 8,199 original lines from the four supplied text files. The machine-readable JSON carries each expected record, field eligibility, and source image hash.

## Ground-truth reconciliation

- The manual transcription in `world_of_warships_battle_results.md` is the primary expected-value source; `img64.md` and `extracted-text.txt` are OCR corroboration, not authorities over the screenshot.
- Ten previously flagged OCR/transcription discrepancies were reviewed against the original images and resolved in favor of the visible screenshot values.
- `pics-page6-image35.jpg` remains unresolved for credits, XP, Free XP, and damage because the source image is too blurred to distinguish the digits.
- The two console-style reward screens preserve both base and WITH PREMIUM values. The canonical scalar reward uses the explicitly labeled WITH PREMIUM/final-received value; base values remain in the workbook notes.
- No missing player, map, mode, or battle-start value was inferred. The source images do not make all such values readable.

## Reviewer provenance qualification

The manual transcription is independent of the OCR run outputs, and selected disputed values were checked against the original screenshots. The supplied archive does not record the transcriber identity/date or document a separate blind second reviewer. Treat this as a working manual reference, not certified double-blind ground truth.

## Coverage and accuracy status

- 63 candidate images total.
- 21 complete nine-field manual-transcription records are included in the `Gate B Complete Subset` worksheet.
- 42 records remain partial and can contribute only eligible field-level comparisons.
- Eligible expected values by field: result 63; player 24; map 24; mode 26; battleStart 22; credits 62; freeXp 59; damage 62; xp 62.
- Accuracy status: `PARTIALLY_EVALUABLE`. Field-level metrics can be calculated for eligible expected values; nine-field full-record accuracy can be calculated for the 21 complete records only.
- Accuracy across all 63 complete records remains not evaluable. Gate B remains `NOT_PASSED`: 21 complete records are below the 50-image minimum.

## Post-hoc evaluation

`scripts/evaluate-ocrspace-imagesF-63-ground-truth.py` compares the saved OCR.Space run report's Tesseract.js and native-reader records against the versioned ground-truth JSON. It does not call OCR.Space and does not repeat provider submissions. It reports per-field matches, unresolved outputs, wrong accepted values, and exact nine-field matches for the complete subset.

## Active exploratory run

- Run: https://github.com/pbrau014/braultDwBotVis/actions/runs/42160979140
- Triggering commit: `adaf4f8c3a9573f56d0348a4bba36686fc31c22e`.
- Archive download and 63-image preflight passed. At the time of this update, the PDF-first provider extraction step was still running; no provider/PDF/raster counts or accuracy results are claimed until the run completes and its artifact is inspected.

The workflow now ignores ground-truth, evaluation, and continuation-documentation-only commits so these bookkeeping changes cannot accidentally trigger another billable 63-image provider submission run. Manual `workflow_dispatch` remains available.
