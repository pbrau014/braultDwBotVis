# DWBOT ground-truth gap register — preserved source review

Source files supplied inside `imagesF.zip`:
- `DWBOT_56_IMAGE_GROUND_TRUTH_REVIEW.xlsx`
- `DWBOT_56_IMAGE_GROUND_TRUTH_REVIEW.json`

These are source review materials, not a complete nine-field ground-truth manifest. They remain unchanged.

## Workbook review counts

- Eligible images described by the source review: 56.
- Populated workbook image rows: 46.
- Rows with all nine mandatory fields populated: 36.
- Rows with one or more missing mandatory values: 10.
- Missing cell counts across those rows: `damage` 8, `xp` 2, `map` 1. These counts may overlap on the same row.
- The companion JSON has 64 image-integrity records (56 eligible, 8 excluded) and explicitly does not contain full expected-value transcriptions.

## Eligible images without a populated workbook row

- `237227_01_Los_Andes.jpg`
- `237228_01_Massachusetts.png`
- `237261_01_Iowa.jpg`
- `237262_01_Lepanto.jpg`
- `237281_01_Lyon.png`
- `237284_01_Amagi.png`
- `237287_01_BA_Tirpitz.jpg`
- `237292_01_Montana.jpg`
- `237297_01_BA_Binah.png`
- `237319_01_Kong.jpg`

## Handling rule

Per the user's explicit instruction, these omissions and missing cells do not prevent continuing corpus preparation and exploratory extraction. Keep them visible in reports; do not fabricate, infer, or silently fill expected values. The 36 fully populated rows may support retrospective comparisons only where exact source-image identity and label provenance are verified. The 10 partial rows support field-level comparison only for fields that are actually populated. No missing value counts as a correct OCR result.

This register does not convert the 56-image review set or the new 63-image candidate set into an independent Gate B accuracy holdout. Gate B accuracy remains not accepted until each evaluated image has frozen, independently verified expected values for all nine required fields.
