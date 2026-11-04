# Additional screenshot regression corpus

This corpus contains all 16 images supplied in `imgs2add.zip`. The original filenames are preserved under `fixtures/additional-screenshots/`. SHA-256 values and field-by-field annotations are stored in `additional-screenshot-ground-truth.json`.

Run `npm run test:additional-images` to exercise all 16 images sequentially through the production OCR extraction and supervised child-process path, using local Tesseract.js assets with the network guard enabled. The test requires all nine mandatory fields to match exactly on every image, all required fields to be present, all children to close successfully, and no network attempt to be recorded. XP is the ninth and final mandatory field; an XP mismatch or unresolved XP blocks acceptance.

The existing five approved acceptance fixtures and their expected values were not modified. The manifest lists all nine fields in `requiredComparedFields`; `optionalComparedFields` is empty, and `comparedFields` follows the same nine-field contract. These 16 annotations were transcribed from the screenshots supplied with this change; do not change an expected value merely to obtain a passing run. If an annotation is suspected to be wrong, review the original screenshot and record an explicit correction rationale before modifying it.
