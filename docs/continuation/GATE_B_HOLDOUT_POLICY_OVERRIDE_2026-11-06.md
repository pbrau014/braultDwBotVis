# Gate B holdout policy override — 2026-11-06

**Status:** CURRENT USER-DIRECTED REQUIREMENT  
**Applies to:** Future Gate B design, inventory selection, evaluation, and acceptance decisions  
**Canonical repository:** `pbrau014/braultDwBotVis`  
**Baseline main commit reviewed:** `668335ace6a31121ac8640de09d7bbeea9dbbb85`

## Governing holdout size

The user's current instruction supersedes older project documentation and scripts that define Gate B as a 19-image or 21-image inventory:

- **Minimum:** 50 distinct holdout screenshots with independent ground-truth labels.
- **Preferred:** 100 distinct holdout screenshots with independent ground-truth labels.
- A Gate B set smaller than 50 cannot pass.
- The 19-image and 21-image selections remain historical/diagnostic subsets only. Their existing metrics and reports must not be relabeled as Gate B acceptance.

## Independence and labeling

1. Gate B is an independent holdout. Do not tune OCR engines, image geometry, field rules, thresholds, normalization, or candidate selection against Gate B images or their labels.
2. Every selected image must have independent expected values for all nine mandatory fields, in this exact order: `result`, `player`, `map`, `mode`, `battleStart`, `credits`, `freeXp`, `damage`, `xp`.
3. Preserve label provenance, reviewer identity/role where available, timestamps, source-image hashes, and any uncertainty. Do not infer, fill, or silently repair missing labels. A label is eligible only when its provenance and all nine expected values are adequate for exact comparison.
4. Report both image count and eligible nine-field label count. Partial labels do not count toward the 50-image minimum.
5. Keep Gate A's 16-image development corpus separate from Gate B. Gate A must pass first on the locked candidate fingerprint.

## Acceptance remains fail-closed

Gate B cannot pass with any wrongly accepted mandatory value, any unresolved mandatory output, source/PDF/raster provenance failure, unauthorized network activity, or required security/artifact-verification failure. Report exact-match field accuracy, exact nine-field record accuracy, wrong accepted values, unresolved values, wrong-but-unaccepted candidates, and network diagnostics. Do not weaken criteria to obtain a pass.

The XP regression remains mandatory: accept the exact expected value `6646`; reject the appended-icon-digit value `66465`.

## Provider and evidence preservation

- This policy document does not authorize any OCR.Space request.
- Do not resubmit any image or duplicate an existing provider request.
- Preserve all existing source images, PDFs, rasters, reports, manifests, labels, logs, and checksums byte-for-byte.
- Existing 63-image extraction artifacts may be considered for provenance-preserving, no-provider evaluation only after their internal contents and hashes are inspected. Their existence does not establish that 50 images have eligible independent nine-field labels.
- Any future provider submission requires a separate, explicit, image-manifest-bound authorization and a verified restricted-egress plan.

## Implementation consequences

The current `main` package scripts and Gate B evaluator/workflow still contain 19-image selection assumptions. They are not compliant with this policy and must not be used to claim Gate B acceptance. A future implementation must introduce a source-bound 50+ inventory and corresponding evaluator/verifier contracts, retain 100 as the preferred target, and include tests proving that fewer than 50 eligible images fail closed. Do this only after the existing Gate A/B artifacts have been internally inspected and reconciled, so historical evidence is not altered or misrepresented.

## Cross-source inventory lineage reconciliation — 2026-11-07

A separate Library manifest, `DWBOT_IMAGESF_HOLDOUT_CANDIDATE_MANIFEST.json`, reports that a referenced 56-image review workbook has 46 populated rows, including 36 complete nine-field rows, 10 partial rows, and 10 eligible candidate images without a row. The manifest explicitly says it is only an integrity inventory, not full expected-value ground truth. The exact workbook `dwbot_56_image_ground_truth_review(3).xlsx` is not present in the accessible Library or current conversation. Do not count its 36 reported rows as verified labels.

The accessible `DWBOT_IMAGESF_63_ground_truth_working_v6.xlsx` and repository v6 JSON are a distinct 63-image working inventory with 21 complete eligible nine-field records and 42 partial records. PR #19's current CI audit reproduces 21/63 and a 29-record shortfall. Keep these inventory lineages separate. If the 56-workbook's 36 complete rows are later recovered and reconciled, the possible shortfall would be 14, but that is not the current verified count.

PR #19's audit currently validates source-image SHA-256 syntax, byte count, and dimensions as metadata only; it does not recompute source-image hashes from original image bytes. The separate archive/member reconciliation remains required. A new report field and test now state this limitation explicitly.


- Gate A: NOT PASSED.
- Gate B: NOT PASSED.
- Production: NO-GO.
- Internal inspection of the two newly downloaded Gate A/B artifact ZIPs remains pending; outer ZIP checks do not establish internal file integrity or eligibility counts.
- This document is a policy overlay only. It does not change or upgrade any gate result.
