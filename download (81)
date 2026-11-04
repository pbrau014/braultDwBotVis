# Phase 0 baseline diagnostics

These files preserve fresh diagnostics captured during Phase 0 without overwriting the original reports in `testdata/`.

- `tesseractjs-reported-screenshot-baseline.json`: actual Tesseract.js 6.0.1 run on the reported screenshot. Exact-match acceptance fails because damage is 87313 instead of the expected 87373; all nine fields are present, so required-field completeness alone is not adequate.
- `tesseractjs-four-image-baseline.json`: actual Tesseract.js 6.0.1 batch result for the four current fixtures; all four jobs complete but none matches every expected field.
- `native-tesseract-direct-psm3.txt`: direct native Tesseract CLI output for the reported screenshot. This simple CLI comparison reads damage as 87373. It does not prove the bot's complete native OCR pipeline passed.
- `native-tesseract-direct-psm3-stderr.txt`: direct CLI diagnostics.

Build environment for these captured runs: Node.js v22.16.0, npm 10.9.2, actual dependency packages bundled in the ZIP. This is below the package's declared Node.js >=24.17.0 requirement. Windows target-machine acceptance remains required.
