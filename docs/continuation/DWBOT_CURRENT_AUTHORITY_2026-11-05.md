# Current DWBOT authority — updated 2026-11-05

## Controlling OCR architecture override
OCR.Space Engine 2 must process the original World of Warships screenshot first and produce a searchable PDF. The PDF is downloaded and rendered locally; Tesseract.js, native Tesseract, PaddleOCR (when enabled), OpenCV geometry and all subsequent local image readers process only the PDF-derived raster. A successful OCR.Space stage must never be followed by local OCR of the original screenshot. Failure to produce/download/rasterize the PDF fails that image closed; no silent original-image fallback.

The current provider comparison marks Engine 2 searchable-PDF generation supported and Engine 3 unsupported. Engine 2 is therefore the first-pass engine. The user's explicit authorization in this chat covers OCR.Space processing of the 4-, 16-, and 64-image World of Warships screenshot inventories, including visible player names, and no unrelated images or private credentials/data.

Production requires OCRSPACE_API_KEY. OCRSPACE_ENABLED=0 is an explicit local-only development/test mode. Live OCR.Space and exact-inventory acceptance remain unverified until the current Windows run and provider reports are inspected.

## Canonical source
- Repository: pbrau014/braultDwBotVis
- Active branch: main only
- Living plan: docs/continuation/DWBOT_LIVING_RUNNING_PLAN_CURRENT.txt
- OCR.Space architecture: docs/OCRSPACE_ADAPTER_IMPLEMENTATION.md
- Nine mandatory fields: result, player, map, mode, battleStart, credits, freeXp, damage, xp. XP is ninth and mandatory.
- No wrong accepted mandatory values; no unresolved required values at Gate A/B.
- Production remains NO-GO until every mandatory gate has current verified evidence.

Older source/head statements below are historical and superseded by the dated living-plan override. Preserve provenance; do not treat historical run results as current-head acceptance.
