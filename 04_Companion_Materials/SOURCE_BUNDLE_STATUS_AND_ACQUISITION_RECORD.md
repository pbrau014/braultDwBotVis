# Source Bundle Status and Acquisition Record

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
**Record version:** 1.0 — 29 October 2026  
**Audience:** Organizer / Technical Maintainer / Security Reviewer  
**Status:** Source-bundle intake is waived as a prerequisite for the v3.22 documentation release; source and runtime validation remain unverified and are not claimed as passed.

## 1. Purpose

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> A polished document is not release approval; keep blockers visible until the required evidence exists.</div>
This record prevents an archived bot package from being mistaken for the current approved source. It records the exact source boundary used for prior documentation and evidence required before a live bot can be certified or distributed. The source-intake gates are waived only for publication of the v3.22 documentation package; runtime certification remains open.

## 2. Current source status

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Preserve the original evidence and distinguish an observed fact from an OCR, bot, or calculator interpretation.</div>
| Item | Current finding | Disposition |
|---|---|---|
| `plan1.txt` / RC3 roadmap | The governing roadmap says targeted RC3 work exists in a separate work copy, focused tests passed, but full Windows Node 24 OCR acceptance remains unrun. | Roadmap is evidence of intent/status, not a substitute for source code or acceptance logs. |
| Exact RC3 source bundle | Not available in the accessible release materials used for this documentation pass. | **RUNTIME CERTIFICATION OPEN / NOT A DOCUMENTATION-RELEASE BLOCKER** — exact source archive and producer/build identity remain unavailable. |
| Archived `discord-image-ocr-bot v1.0.0` | Historical test record: 32/32 unit tests passed under Linux Node v24.22.1; the reported-screenshot Damage field failed exact comparison (expected 87373, actual 87313; difference 60); the four-image pipeline timed out at 120 seconds. | Historical only. Do not use these results to certify RC3. |
| Archived HTML image reader | Prior audit observed a browser-side webhook/posting path. | Do not distribute the unsanitized archived reader. Live credential status is unverified. |
| Live webhook / credential rotation | No evidence of revocation or regeneration by the credential issuer was available. | **RUNTIME SECURITY STATUS NOT VERIFIED / NOT A DOCUMENTATION-RELEASE BLOCKER** — local source edits or a clean text scan do not prove rotation. |
| Final documentation package secret scan | A scan of generated v3.15 document artifacts is recorded separately in the final completion report. | Applies only to the listed documentation artifacts; not to absent RC3 source or any live service. |

## 3. Required acquisition procedure

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Historical material provides context only; do not present it as current validation or approval.</div>
1. Obtain the RC3 source bundle from its maintainer through an approved, access-controlled transfer. Do not rebuild or infer source contents from the older v1 archive.
2. Record exact filename, version/commit or build ID, source owner, receipt date/time and time zone, file size, and SHA-256 hash.
3. Inventory every file and nested archive. Preserve an untouched evidence copy before making any changes.
4. Search code, configuration, documentation, HTML, source maps, logs, and built assets for Discord webhook endpoints, bot tokens, API keys, secrets, and browser-side posting paths. Record tool versions, scan commands, results, and exceptions.
5. Remove client-side secret-bearing or unauthorized posting paths from the release build. Keep secrets server-side or in the approved secret manager; do not place them in HTML, JavaScript, user-facing settings, or distributable files.
6. Ask the authorized credential owner to revoke/regenerate any exposed live credential in the issuing service. Record confirmation and rotation time without copying the secret into the report.
7. Run the documented current Windows Node 24, local OCR/Tesseract comparison, exact-field screenshot, multi-image, and live Discord smoke suites on that exact source build. Attach full logs and fixture/build hashes.
8. A future runtime implementation review should verify source identity, scan output, credential response, acceptance evidence, and final archive manifest. These remain technical follow-up items; their absence does not block publication of the v3.22 documentation package under the user-directed waiver.

## 4. Definition of done

<div style="background-color:#DFF2FF; border:1.5px solid #0070C0; padding:6px 8px; margin:4px 0;"><strong>⚓ Quick hint:</strong> Use only the authorized tool and permissions; retain a manual fallback and never expose credentials.</div>
This record is complete only when the exact RC3 source bundle and identity are attached, all nested files are scanned, no live secret remains in distributable artifacts, the credential owner provides rotation evidence where needed, exact-build Windows/OCR/Discord tests pass, and an independent reviewer signs the evidence record. None of those conditions is inferred from documentation edits alone.


## v3.21 governing match-outcome clarification
The current working policy is that individual-performance metrics (including Damage and Kills) feed the approved scoring method that calculates the verified match outcome; that outcome governs bracket advancement, with published tie-breaks applied where needed. Participant-level outputs and awards remain separately traceable. The canonical workbook and authoritative Score Reporter HTML remain unavailable, so implementation of this policy is not certified.


## Supplemental YOLO / Admiralty / CBStrat source intake — 2026-11-06

A separate supplied Library archive `yoloPaperWork(1).zip` was integrity-checked and extracted for the Admiralty × YOLO narrative documentation work.

- Archive: 22,976,255 bytes
- SHA-256: `b7598ed96d9af8ff1bd564e7aed945621800e2299e2f262d86541c62f34cf7b2`
- ZIP members: 19; ZIP integrity test reported no corrupt member.
- Contents: Admiralty handbook DOCX/PDF, organization chart and two visual concept boards; CBStrat Tier X Clan Battles PDF and infographic; three Discord scoring/summary texts; YOLO rules/Pilot documents, description PDF, historical workbook and formula example image.
- The three Discord texts are now preserved verbatim under `dwbotStuff/discordMsgs/`.
- Detailed SHA-256 fingerprints, source authority and conflict dispositions are recorded in `Admiralty_YOLO_Source_Reconciliation_and_Visual_Provenance_v0.1.md`.

The Admiralty source is fictional worldbuilding and an organizational/design reference. CBStrat is Tier X Clan Battles tactical guidance; only general principles are adapted to YOLO. The supplied `test27xlsm.xlsm` is an archival sample, not the canonical scoring workbook. None of these materials creates a live event approval, participant cap, staff appointment, prize commitment or signed settings record.
