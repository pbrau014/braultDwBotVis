#!/usr/bin/env python3
"""Post-hoc accuracy and Gate B evaluation for an existing imagesF-63 run.

This script never calls OCR.Space or repeats provider submissions. It compares
saved PDF-derived local-reader records against the versioned manual reference.
Gate B is the approved 21-image complete nine-field subset; a pass additionally
requires a separately verified artifact/network report.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

FIELDS = ["result", "player", "map", "mode", "battleStart", "credits", "freeXp", "damage", "xp"]
NUMERIC = {"credits", "freeXp", "damage", "xp"}
MISSING = {"", "not detected", "not_detected", "none", "null", "n/a"}
MIN_GATE_B_IMAGES = 21
GATE_B_INVENTORY = "complete-ground-truth-21"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def norm(field: str, value):
    if value is None:
        return None
    text = str(value).strip()
    if text.casefold() in MISSING:
        return None
    if field in NUMERIC:
        digits = re.sub(r"\D", "", text)
        return digits or None
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("—", "-").replace("–", "-").casefold()


def is_complete_reference(row):
    if row.get("recordStatus") != "COMPLETE_9_FIELD_TRANSCRIPTION":
        return False
    expected = row.get("expected") or {}
    status = row.get("fieldStatus") or {}
    return all(status.get(field, {}).get("eligible_for_exact_match") is True
               and norm(field, expected.get(field)) is not None for field in FIELDS)


def select_gate_b_records(gt):
    records = gt.get("records", [])
    selected = [r for r in records if is_complete_reference(r)]
    if len(selected) != MIN_GATE_B_IMAGES or selected != records[:MIN_GATE_B_IMAGES]:
        raise SystemExit("Gate B requires exactly the first 21 corpus-order records with complete, eligible, non-empty values for all nine fields.")
    for row in selected:
        source = row.get("sourceImage") or {}
        if not re.fullmatch(r"[0-9a-f]{64}", str(source.get("sha256", ""))) or int(source.get("bytes") or 0) <= 0:
            raise SystemExit("Gate B source-image fingerprint is incomplete: " + str(row.get("filename")))
    return selected


def evaluate_engine(run, engine, selected_records):
    result_by_name = {r.get("filename"): r for r in run.get("results", [])}
    field_metrics = {f: {"eligible": 0, "correct": 0, "wrong": 0, "unresolved": 0,
                         "wrongAccepted": 0, "wrongUnaccepted": 0} for f in FIELDS}
    per_image = []
    complete_total = complete_correct = complete_wrong = complete_unresolved = 0
    pdf_count = raster_count = attempted_count = reader_count = 0
    source_hash_mismatches = missing_run_results = 0

    for expected_row in selected_records:
        name = expected_row["filename"]
        result = result_by_name.get(name)
        if result is None:
            missing_run_results += 1
        else:
            pdf_count += bool(result.get("pdfSha256"))
            raster_count += bool(result.get("rasterSha256"))
            attempted_count += result.get("providerSubmissionAttempted") is True

        expected_source_hash = (expected_row.get("sourceImage") or {}).get("sha256")
        source_hash = (result or {}).get("sourceSha256")
        source_ok = bool(result is not None and expected_source_hash and source_hash == expected_source_hash)
        if result is not None and not source_ok:
            source_hash_mismatches += 1

        reader = next((x for x in (result or {}).get("localReaders", []) if x.get("engine") == engine), None)
        if reader:
            reader_count += 1
        record = (reader or {}).get("record") or {}
        accepted = (reader or {}).get("accepted") is True
        image_fields = {}
        all_exact = source_ok
        any_unresolved = not source_ok
        full_eligible = is_complete_reference(expected_row)

        for field in FIELDS:
            meta = expected_row.get("fieldStatus", {}).get(field, {})
            eligible = meta.get("eligible_for_exact_match") is True
            expected = expected_row.get("expected", {}).get(field)
            actual = record.get(field)
            n_expected = norm(field, expected)
            n_actual = norm(field, actual)
            if not eligible or n_expected is None:
                image_fields[field] = {"status": "NOT_SCORED_REFERENCE_NOT_ELIGIBLE",
                                        "expected": expected, "actual": actual}
                continue

            metric = field_metrics[field]
            metric["eligible"] += 1
            if not source_ok:
                metric["unresolved"] += 1
                status = "MISSING_RUN_RESULT" if result is None else "SOURCE_HASH_MISMATCH"
                all_exact = False
                any_unresolved = True
            elif n_actual is None:
                metric["unresolved"] += 1
                status = "UNRESOLVED_OUTPUT"
                all_exact = False
                any_unresolved = True
            elif n_actual == n_expected:
                metric["correct"] += 1
                status = "EXACT_MATCH"
            else:
                metric["wrong"] += 1
                if accepted:
                    metric["wrongAccepted"] += 1
                else:
                    metric["wrongUnaccepted"] += 1
                status = "WRONG_ACCEPTED_VALUE" if accepted else "WRONG_UNACCEPTED_CANDIDATE"
                all_exact = False

            image_fields[field] = {
                "status": status, "expected": expected, "actual": actual,
                "eligible": True, "readerAccepted": accepted
            }

        if full_eligible:
            complete_total += 1
            if all_exact:
                complete_correct += 1
                full_status = "EXACT_9_FIELD_MATCH"
            elif any_unresolved:
                complete_unresolved += 1
                full_status = "INCOMPLETE_OR_SOURCE_HASH_MISMATCH"
            else:
                complete_wrong += 1
                full_status = "NINE_FIELD_MISMATCH"
        else:
            full_status = "NOT_IN_COMPLETE_SUBSET"

        per_image.append({
            "filename": name,
            "runResultStatus": "MISSING_RUN_RESULT" if result is None else result.get("status"),
            "sourceImageHashStatus": "PASS" if source_ok else ("MISSING_RUN_RESULT" if result is None else "MISMATCH_OR_MISSING"),
            "expectedSourceImageSha256": expected_source_hash,
            "runSourceSha256": source_hash,
            "pdfFirstStatus": (result or {}).get("status"),
            "providerSubmissionAttempted": (result or {}).get("providerSubmissionAttempted") is True,
            "providerFailure": (result or {}).get("failure"),
            "pdfSha256": (result or {}).get("pdfSha256"),
            "rasterSha256": (result or {}).get("rasterSha256"),
            "readerAvailable": reader is not None,
            "readerAccepted": accepted,
            "fullRecordStatus": full_status,
            "fields": image_fields,
            "localReaderFailures": [x for x in (result or {}).get("localReaderFailures", []) if x.get("engine") == engine]
        })

    for metric in field_metrics.values():
        metric["exactMatchRate"] = metric["correct"] / metric["eligible"] if metric["eligible"] else None
    total_eligible = sum(m["eligible"] for m in field_metrics.values())
    total_correct = sum(m["correct"] for m in field_metrics.values())
    return {
        "engine": engine,
        "readerRowsAvailable": reader_count,
        "missingRunResults": missing_run_results,
        "providerSubmissionAttempts": attempted_count,
        "searchablePdfsWithHashes": pdf_count,
        "pdfDerivedRastersWithHashes": raster_count,
        "sourceImageHashMismatches": source_hash_mismatches,
        "fieldLevelSummary": {
            "eligibleExpectedValues": total_eligible,
            "exactMatches": total_correct,
            "wrongValues": sum(m["wrong"] for m in field_metrics.values()),
            "unresolvedOutputs": sum(m["unresolved"] for m in field_metrics.values()),
            "exactMatchRate": total_correct / total_eligible if total_eligible else None
        },
        "fieldMetrics": field_metrics,
        "completeNineFieldSubset": {
            "eligibleRecords": complete_total, "exactMatches": complete_correct,
            "mismatches": complete_wrong, "unresolved": complete_unresolved,
            "exactMatchRate": complete_correct / complete_total if complete_total else None
        },
        "wronglyAcceptedMandatoryFieldValues": sum(m["wrongAccepted"] for m in field_metrics.values()),
        "perImage": per_image
    }


def gate_a_evidence_status(artifact):
    evidence = (artifact or {}).get("gateA") or {}
    if evidence.get("status") != "PASS":
        return "PENDING_GATE_A"
    if not re.fullmatch(r"[0-9a-f]{64}", str(evidence.get("reportSha256", ""))):
        return "FAIL"
    if not re.fullmatch(r"[0-9a-f]{64}", str(evidence.get("candidateFingerprint", ""))):
        return "FAIL"
    if evidence.get("fingerprintLocked") is not True or evidence.get("matchesGateBRunSource") is not True:
        return "FAIL"
    return "PASS"


def verify_artifact_report(artifact, run_path, gt_path, selected_records, selected_run_results):
    if not artifact:
        return {"status": "PENDING_ARTIFACT_VERIFICATION", "reasons": ["Artifact verification report is not present."]}
    reasons = []
    gate_a_status = gate_a_evidence_status(artifact)
    if gate_a_status != "PASS":
        reasons.append("Gate A PASS and locked candidate-fingerprint evidence is missing or invalid.")
    selection = artifact.get("inventorySelection") or {}
    checks = artifact.get("checks") or {}
    if artifact.get("status") != "VERIFIED":
        reasons.append("Artifact report status is not VERIFIED.")
    if artifact.get("runReportSha256") != sha(run_path):
        reasons.append("Artifact report is not bound to this run-report SHA-256.")
    if artifact.get("groundTruthSha256") != sha(gt_path):
        reasons.append("Artifact report is not bound to this ground-truth SHA-256.")
    if selection.get("id") != GATE_B_INVENTORY or selection.get("selectedImageCount") != MIN_GATE_B_IMAGES:
        reasons.append("Artifact report inventory selection is not the approved 21-image Gate B set.")
    if selection.get("verifiedImageCount") != MIN_GATE_B_IMAGES or selection.get("allSelectedImagesVerified") is not True:
        reasons.append("Artifact report does not verify all 21 selected images.")
    for key in ("sourceImageHashes", "pdfIntegrity", "searchablePdfTextLayer",
                "rasterIntegrity", "pdfDerivedRasterProvenance",
                "networkRestriction", "secretLeakScan"):
        if checks.get(key) != "PASS":
            reasons.append("Artifact check did not pass: " + key)
    if checks.get("originalScreenshotFallback") is not False:
        reasons.append("Artifact report does not affirm that original-screenshot fallback was absent.")
    if checks.get("unauthorizedNetworkAttempts") != 0:
        reasons.append("Artifact report records unauthorized network attempts or lacks a zero count.")

    image_rows = artifact.get("images") or []
    image_by_name = {r.get("filename"): r for r in image_rows}
    selected_names = {r["filename"] for r in selected_records}
    if len(image_rows) != MIN_GATE_B_IMAGES or set(image_by_name) != selected_names:
        reasons.append("Artifact report image list is not an exact 21-image selection.")
    run_by_name = {r.get("filename"): r for r in selected_run_results}
    gt_by_name = {r["filename"]: r for r in selected_records}
    for name in selected_names:
        evidence = image_by_name.get(name)
        run_row = run_by_name.get(name)
        gt_row = gt_by_name[name]
        if not evidence or not run_row:
            reasons.append("Missing artifact/run row: " + name)
            continue
        if evidence.get("status") != "VERIFIED":
            reasons.append("Per-image artifact verification failed: " + name)
        if evidence.get("sourceSha256") != gt_row["sourceImage"]["sha256"] or evidence.get("sourceSha256") != run_row.get("sourceSha256"):
            reasons.append("Source-image hash does not reconcile: " + name)
        if evidence.get("pdfSha256") != run_row.get("pdfSha256") or not evidence.get("pdfSha256"):
            reasons.append("PDF hash does not reconcile: " + name)
        if evidence.get("rasterSha256") != run_row.get("rasterSha256") or not evidence.get("rasterSha256"):
            reasons.append("PDF-derived raster hash does not reconcile: " + name)
    result_status = "PASS" if not reasons else ("PENDING_GATE_A" if gate_a_status == "PENDING_GATE_A" and len(reasons) == 1 else "FAIL")
    return {"status": result_status, "reasons": reasons,
            "verifiedImageCount": len(image_rows), "checks": checks, "gateAEvidenceStatus": gate_a_status}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-report", required=True, type=Path)
    ap.add_argument("--ground-truth", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--inventory", choices=("all-63", GATE_B_INVENTORY), default=GATE_B_INVENTORY)
    ap.add_argument("--artifact-verification-report", type=Path, default=None)
    args = ap.parse_args()

    run = json.loads(args.run_report.read_text(encoding="utf-8"))
    gt = json.loads(args.ground_truth.read_text(encoding="utf-8"))
    if gt.get("schemaVersion") != 2 or len(gt.get("records", [])) != 63:
        raise SystemExit("Ground-truth schema or image count mismatch.")
    if gt.get("requiredFields") != FIELDS:
        raise SystemExit("Ground-truth required-field schema mismatch.")
    if run.get("sourceArchiveSha256") != (gt.get("candidateArchive") or {}).get("sha256"):
        raise SystemExit("OCR run source archive fingerprint does not match the ground-truth candidate archive.")
    names = [r.get("filename") for r in run.get("results", [])]
    if len(names) != len(set(names)):
        raise SystemExit("OCR run report contains duplicate image result rows.")
    unknown = sorted(set(names) - set(r["filename"] for r in gt["records"]))
    if unknown:
        raise SystemExit("OCR run contains filenames absent from ground truth: " + ", ".join(unknown))

    selected_records = select_gate_b_records(gt) if args.inventory == GATE_B_INVENTORY else gt["records"]
    selected_names = [r["filename"] for r in selected_records]
    selected_name_set = set(selected_names)
    selected_run_results = [r for r in run.get("results", []) if r.get("filename") in selected_name_set]
    missing_selected = [name for name in selected_names if name not in {r.get("filename") for r in selected_run_results}]
    engines = [evaluate_engine(run, engine, selected_records) for engine in ("tesseractjs", "native")]

    artifact_path = args.artifact_verification_report or (args.run_report.parent / "artifact-verification-report.json")
    artifact = json.loads(artifact_path.read_text(encoding="utf-8")) if artifact_path.is_file() else None
    artifact_verification = verify_artifact_report(
        artifact, args.run_report, args.ground_truth, selected_records, selected_run_results
    ) if args.inventory == GATE_B_INVENTORY else {"status": "NOT_APPLICABLE"}
    wrong_accepted = sum(e["wronglyAcceptedMandatoryFieldValues"] for e in engines)
    source_mismatches = sum(e["sourceImageHashMismatches"] for e in engines)
    readers_complete = all(e["readerRowsAvailable"] == MIN_GATE_B_IMAGES for e in engines)
    rows_complete = not missing_selected and all(
        r.get("status") == "pdf-first-complete" and r.get("providerSubmissionAttempted") is True
        and r.get("pdfSha256") and r.get("rasterSha256") for r in selected_run_results
    )
    network_pass = artifact_verification.get("checks", {}).get("networkRestriction") == "PASS" and artifact_verification.get("checks", {}).get("unauthorizedNetworkAttempts") == 0
    if args.inventory != GATE_B_INVENTORY:
        gate_b = "NOT_APPLICABLE_WRONG_INVENTORY"
    elif artifact_verification["status"] == "PENDING_ARTIFACT_VERIFICATION":
        gate_b = "PENDING_ARTIFACT_VERIFICATION"
    elif artifact_verification["status"] == "PENDING_GATE_A":
        gate_b = "PENDING_GATE_A"
    elif artifact_verification["status"] != "PASS" or not rows_complete or not readers_complete or source_mismatches or wrong_accepted or not network_pass:
        gate_b = "NOT_PASSED"
    else:
        gate_b = "PASS"

    report = {
        "schemaVersion": 2,
        "status": "POST_HOC_EVALUATION" if not missing_selected else "POST_HOC_EVALUATION_INCOMPLETE_SELECTED_INVENTORY",
        "runReport": str(args.run_report),
        "runReportSha256": sha(args.run_report),
        "groundTruth": str(args.ground_truth),
        "groundTruthSha256": sha(args.ground_truth),
        "artifactVerificationReport": str(artifact_path) if artifact else None,
        "artifactVerification": artifact_verification,
        "runStatus": run.get("status"),
        "inventorySelection": {
            "id": args.inventory,
            "selectedImageCount": len(selected_records),
            "evaluatedResultRows": len(selected_run_results),
            "missingSelectedImages": missing_selected,
            "sourceCorpusImageCount": len(gt["records"]),
            "selectedFilenames": selected_names,
            "selectionRule": "exactly the first 21 corpus-order records with COMPLETE_9_FIELD_TRANSCRIPTION and all nine non-empty expected values eligible_for_exact_match=true" if args.inventory == GATE_B_INVENTORY else "all 63 source-corpus records"
        },
        "imageCount": len(selected_records),
        "sourceCorpusImageCount": len(gt["records"]),
        "resultRows": len(selected_run_results),
        "sourceArchiveSha256": run.get("sourceArchiveSha256"),
        "accuracyStatus": {
            "overall": "PARTIALLY_EVALUABLE_AGAINST_SUPPLIED_MANUAL_TRANSCRIPTION",
            "fieldLevel": "EVALUATED_ONLY_FOR_ELIGIBLE_MANUAL_REFERENCE_FIELDS",
            "completeRecordSubset": "EVALUATED_ONLY_FOR_COMPLETE_NINE_FIELD_MANUAL_TRANSCRIPTIONS",
            "all63FullRecord": "NOT_EVALUABLE_INCOMPLETE_9_FIELD_COVERAGE",
            "gateB": gate_b
        },
        "gateBCriteria": {
            "minimumCompleteGroundTruthImages": MIN_GATE_B_IMAGES,
            "gateAPassAndLockedCandidateFingerprintRequired": True,
            "minimumExactMatchRate": None,
            "accuracyThresholdPolicy": "No numeric exact-match floor is defined in the governing plan; report measured rates. Zero wrongly accepted mandatory values remains a hard blocker.",
            "completeNineFieldLabelsRequired": True,
            "allSelectedPdfAndRasterArtifactsVerified": True,
            "zeroWronglyAcceptedMandatoryFieldValues": True,
            "zeroUnauthorizedNetworkAttempts": True,
            "unresolvedOutputs": "Reported as accuracy/review metrics; do not convert unresolved values into matches."
        },
        "gateB": gate_b,
        "engines": engines
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(payload, encoding="utf-8")
    digest = sha(args.output)
    args.output.with_suffix(args.output.suffix + ".sha256").write_text(
        f"{digest}  {args.output.name}\n", encoding="ascii")
    print(json.dumps({
        "output": str(args.output), "sha256": digest, "runStatus": run.get("status"),
        "inventorySelection": report["inventorySelection"],
        "artifactVerification": artifact_verification,
        "resultRows": len(selected_run_results), "gateB": gate_b,
        "engineSummaries": [{
            "engine": x["engine"], "fieldLevelSummary": x["fieldLevelSummary"],
            "completeNineFieldSubset": x["completeNineFieldSubset"],
            "wronglyAcceptedMandatoryFieldValues": x["wronglyAcceptedMandatoryFieldValues"],
            "sourceImageHashMismatches": x["sourceImageHashMismatches"],
            "missingRunResults": x["missingRunResults"]
        } for x in engines]
    }, indent=2))


if __name__ == "__main__":
    main()
