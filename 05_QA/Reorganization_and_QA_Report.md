# Reorganization, Visual Redesign, and QA Report — v3.18

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Check the stated authority, required evidence, and completion criteria before acting; do not infer an approval that is not recorded.</div>
## Scope
- Source baseline: v3.17 reorganized release package, with v3.15 policy-resolved source retained in the package for traceability.
- Outputs: Participant Guide, Event Operations Manual, Technical Reference, eight companion documents, and associated PDF/Markdown/Word materials.
- Status: **WORKING DRAFT / NOT APPROVED** for event publication, score certification, or live bot deployment.

## Design decisions applied
- Decision A: Option A2 selected. Chapter dividers use a line of repeated anchor icons, explicitly excepted from the ordinary one-icon-per-line rule.
- Decision B: Word uses coordinated shading, thick dark outer borders, darker inner borders, and a shadow-like lower/right edge; PDFs are rendered from the styled Word files; Markdown preserves semantic structures and icons.
- Decision C: appendix text reduced by 2 pt relative to the v3.17 effective style where applicable. Table text is not shrunk more than 3 pt below the pre-redesign smallest text baseline; wider columns/wrapping are preferred over unreadable single-line entries.
- Decision D: top-level contents entries are sized one point below corresponding chapter/appendix titles; lower-level entries remain subordinate; Contents heading is 1 pt below the document title.
- Decision E: spacing is style-based; black separators are applied to subsection headings; repeated empty paragraphs are not used as the primary layout mechanism.

## Structural and content checks
- Top-level source sections assigned across the three publications: 25 / 25.
- Missing top-level sections: 0.
- Duplicate top-level section assignments: 0.
- Main publication text-token comparisons against the post-icon-normalization v3.17 source: pass for all three publications; icon substitutions were normalized for the comparison.
- Word internal anchor links: participant 7, operations 8, technical 10; broken links: 0.
- Markdown internal links: participant 7, operations 8, technical 10; broken links: 0.
- PDF internal destinations: participant 14, operations 14, technical 19; broken destinations: 0.
- Icon audit in main publications: no ordinary paragraph icon violations; no multi-icon table rows detected. Chapter-divider repeated anchors are the selected explicit exception.
- Consecutive blank paragraphs: maximum 1 in each main publication and each companion DOCX checked.
- Title-run shadow check: pass for all title-like runs included by the QA script.

## Typography and table findings
- Document title style: 28 pt; chapter title: 25 pt; appendix title: 24 pt; Contents heading: 27 pt; top-level chapter index entry: 24 pt; appendix index entry: 23 pt.
- Numbered subsection style target is 12.5 pt, producing the requested 2:1 chapter-to-subsection relationship. QA script did not reliably infer this value from every direct-formatted run, so manual/style-definition review is still recommended.
- “Done when” style is 6.5 pt (9.5 pt v3.17 baseline minus the requested 3 pt). This is small for print; it follows the explicit size reduction and should be reconsidered only with user approval.
- Minimum table text observed in main publications: 7.5 pt. It remains subject to the user-approved three-point reduction rule measured from the pre-redesign baseline; cells wrap where needed.

## Fresh rendering and visual review
- 11 Word documents freshly rendered; 100 PDF pages total across the three main publications and eight companions.
- All pages are inventoried and included in numbered contact sheets; no text-empty PDF pages were detected.
- See `Fresh_Visual_Inspection_Report_v3.18.md` for method and limitation: contact-sheet sweep of all 100 pages plus selected full-page detailed checks; not a line-by-line editorial proofread of every sentence. The previously isolated Participant Guide source-baseline note was moved into front matter, reducing that PDF from 16 to 15 pages.

## Standard score reporter and workbook assets
- The authoritative score reporter HTML and canonical Excel workbook were not present in the active package/filesystem.
- No unrelated HTML artifact was substituted and no workbook was fabricated.
- Secret removal, asset styling, and functional/scoring regression testing of the exact assets remain **BLOCKED / NOT TESTED**. See `07_Score_Reporter_Assets/ASSET_INTAKE_REQUIRED.md`.

## Security, runtime, and event approvals
- Scope-waived or unavailable runtime/security/game-client/Discord checks are not represented as passed.
- No event settings, organizer names, signatures, or approvals were invented.
- The package is not approved for event publication, score certification, or live deployment.

## Package checks
- Internal links checked in Word, Markdown, and PDF for the three main publications; no broken destinations found.
- Final ZIP integrity and manifest hashes are verified after packaging (see package verification report and `v3.18_QA_Audit.json`).
