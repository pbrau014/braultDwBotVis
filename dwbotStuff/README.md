# Retained DWBOT source-review assets

This folder contains both application-facing HTML assets and source-review material. The three HTML assets are required by the tournament UI/test suite and are included in release packages. The workbook, inventory JSON files, and original DOCX documents are review/provenance sources; they remain in the repository but are excluded from release packages.

- `DWBOT_56_IMAGE_GROUND_TRUTH_REVIEW.xlsx` — retained user-reviewed screenshot/ground-truth review workbook. Its internal sheets were not re-authored during this cleanup.
- `DWBOT_64_IMAGE_INVENTORY_REVIEWED.json` — reviewed source image inventory.
- `DWBOT_CONSOLIDATED_IMAGE_INVENTORY.json` — consolidated derivative inventory; retain alongside the source inventory to preserve provenance.
- `yolo_event.docx`, `yolo_rules_xmpl.docx`, `yolo_tournament_complete_instruction_set.docx` — original editable tournament source documents.
- `backupWkbkBrowser.html` — application-facing HTML workbook-browser source; duplicate exports were removed.
- `scoreReport_dark_clipboard (1).html` — application-facing score-report presentation source.
- `yolo_tournament_scoreCalculator.html` — application-facing tournament score-calculator source.

These assets are not automatically treated as current requirements. The active application field contract and OCR architecture are defined by `DWBOT_BRANCH_CHARTER.md`, `README.md`, and `docs/architecture/`. The current nine-field contract supersedes historical eight-field references.
