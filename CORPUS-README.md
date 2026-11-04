# Screenshot regression corpus

The corpus manifest includes exactly the three image URLs supplied by the user. The downloaded files are not included because the authoring environment could not resolve/fetch the original image hosts. Do not replace them with lookalikes.

1. Run `npm run corpus:fetch` on a machine that can access those URLs.
2. Visually inspect the downloaded screenshots and manually fill the `expected` values in `reference-corpus.json` for all nine required fields: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, and `xp`. Add optional `ship`, `description`, and ribbon counts only when visibly confirmed.
3. Run `npm run corpus:test`. The runner compares its OCR output to the annotations and writes `regression-results.json`.
4. A record is not counted as passing until all nine required expected values are annotated and match exactly after field-specific normalization.

A `null` expected value means ground truth has not been confirmed. It never counts as a passing extraction.
