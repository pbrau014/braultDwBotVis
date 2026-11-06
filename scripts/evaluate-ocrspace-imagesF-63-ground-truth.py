#!/usr/bin/env python3
"""Post-hoc accuracy evaluation for an existing imagesF-63 OCR.Space run.

This script never calls OCR.Space or repeats provider submissions. It compares
saved PDF-derived local-reader records against the versioned manual reference.
"""
from __future__ import annotations
import argparse, hashlib, json, re
from pathlib import Path

FIELDS = ["result", "player", "map", "mode", "battleStart", "credits", "freeXp", "damage", "xp"]
NUMERIC = {"credits", "freeXp", "damage", "xp"}
MISSING = {"", "not detected", "not_detected", "none", "null", "n/a"}

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

def evaluate_engine(run, gt, engine):
    gt_by_name = {r["filename"]: r for r in gt["records"]}
    field_metrics = {f: {"eligible": 0, "correct": 0, "wrong": 0, "unresolved": 0,
                         "wrongAccepted": 0, "wrongUnaccepted": 0} for f in FIELDS}
    per_image = []
    complete_total = complete_correct = complete_wrong = complete_unresolved = 0
    pdf_count = sum(1 for r in run.get("results", []) if r.get("pdfSha256"))
    raster_count = sum(1 for r in run.get("results", []) if r.get("rasterSha256"))
    attempted_count = sum(1 for r in run.get("results", []) if r.get("providerSubmissionAttempted") is True)
    reader_count = 0
    source_hash_mismatches = 0

    for result in run.get("results", []):
        name = result.get("filename")
        expected_row = gt_by_name.get(name)
        if not expected_row:
            per_image.append({"filename":name,"status":"NOT_IN_GROUND_TRUTH"})
            continue
        expected_source_hash = (expected_row.get("sourceImage") or {}).get("sha256")
        source_hash = result.get("sourceSha256")
        source_ok = bool(expected_source_hash and source_hash == expected_source_hash)
        if not source_ok:
            source_hash_mismatches += 1
        reader = next((x for x in result.get("localReaders", []) if x.get("engine") == engine), None)
        if reader:
            reader_count += 1
        record = (reader or {}).get("record") or {}
        accepted = (reader or {}).get("accepted") is True
        image_fields = {}
        all_exact = source_ok
        any_unresolved = not source_ok
        full_eligible = expected_row.get("recordStatus") == "COMPLETE_9_FIELD_TRANSCRIPTION"

        for field in FIELDS:
            meta = expected_row.get("fieldStatus", {}).get(field, {})
            eligible = meta.get("eligible_for_exact_match") is True
            expected = expected_row.get("expected", {}).get(field)
            actual = record.get(field)
            n_expected = norm(field, expected)
            n_actual = norm(field, actual)
            if not eligible or n_expected is None or not source_ok:
                status = "NOT_SCORED_SOURCE_HASH_MISMATCH" if not source_ok else "NOT_SCORED"
                image_fields[field] = {"status":status, "expected":expected, "actual":actual}
                continue
            metric = field_metrics[field]
            metric["eligible"] += 1
            if n_actual is None:
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
                "status":status, "expected":expected, "actual":actual,
                "eligible":True, "readerAccepted":accepted
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
            "filename":name,
            "sourceImageHashStatus":"PASS" if source_ok else "MISMATCH_OR_MISSING",
            "expectedSourceImageSha256":expected_source_hash,
            "runSourceSha256":source_hash,
            "pdfFirstStatus":result.get("status"),
            "providerSubmissionAttempted":result.get("providerSubmissionAttempted") is True,
            "providerFailure":result.get("failure"),
            "pdfSha256":result.get("pdfSha256"),
            "rasterSha256":result.get("rasterSha256"),
            "readerAvailable":reader is not None,
            "readerAccepted":accepted,
            "fullRecordStatus":full_status,
            "fields":image_fields,
            "localReaderFailures":[x for x in result.get("localReaderFailures", []) if x.get("engine")==engine]
        })

    for metric in field_metrics.values():
        metric["exactMatchRate"] = metric["correct"] / metric["eligible"] if metric["eligible"] else None
    total_eligible = sum(m["eligible"] for m in field_metrics.values())
    total_correct = sum(m["correct"] for m in field_metrics.values())
    return {
        "engine":engine,
        "readerRowsAvailable":reader_count,
        "providerSubmissionAttempts":attempted_count,
        "searchablePdfsWithHashes":pdf_count,
        "pdfDerivedRastersWithHashes":raster_count,
        "sourceImageHashMismatches":source_hash_mismatches,
        "fieldLevelSummary":{
            "eligibleExpectedValues":total_eligible,
            "exactMatches":total_correct,
            "wrongValues":sum(m["wrong"] for m in field_metrics.values()),
            "unresolvedOutputs":sum(m["unresolved"] for m in field_metrics.values()),
            "exactMatchRate":total_correct/total_eligible if total_eligible else None
        },
        "fieldMetrics":field_metrics,
        "completeNineFieldSubset":{
            "eligibleRecords":complete_total,"exactMatches":complete_correct,
            "mismatches":complete_wrong,"unresolved":complete_unresolved,
            "exactMatchRate":(complete_correct/complete_total) if complete_total else None
        },
        "wronglyAcceptedMandatoryFieldValues":sum(m["wrongAccepted"] for m in field_metrics.values()),
        "perImage":per_image
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--run-report", required=True, type=Path)
    ap.add_argument("--ground-truth", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--inventory", choices=("all-63", "complete-ground-truth-21"), default="all-63")
    args=ap.parse_args()
    run=json.loads(args.run_report.read_text(encoding="utf-8"))
    gt=json.loads(args.ground_truth.read_text(encoding="utf-8"))
    if gt.get("schemaVersion") != 2 or len(gt.get("records", [])) != 63:
        raise SystemExit("Ground-truth schema or image count mismatch.")
    if gt.get("requiredFields") != FIELDS:
        raise SystemExit("Ground-truth required-field schema mismatch.")
    if run.get("sourceArchiveSha256") != (gt.get("candidateArchive") or {}).get("sha256"):
        raise SystemExit("OCR run source archive fingerprint does not match the ground-truth candidate archive.")
    names=[r.get("filename") for r in run.get("results", [])]
    if len(names) != len(set(names)):
        raise SystemExit("OCR run report contains duplicate image result rows.")
    unknown=sorted(set(names)-set(r["filename"] for r in gt["records"]))
    if unknown:
        raise SystemExit("OCR run contains filenames absent from ground truth: "+", ".join(unknown))
    source_corpus_count = len(gt["records"])
    selected_records = gt["records"]
    if args.inventory == "complete-ground-truth-21":
        selected_records = [r for r in gt["records"]
            if r.get("recordStatus") == "COMPLETE_9_FIELD_TRANSCRIPTION"
            and all(r.get("fieldStatus", {}).get(field, {}).get("eligible_for_exact_match") is True for field in FIELDS)]
        if len(selected_records) != 21 or selected_records != gt["records"][:21]:
            raise SystemExit("The approved complete nine-field selection must be exactly the first 21 corpus-order records; refusing a changed or ambiguous selection.")
    selected_names = {r["filename"] for r in selected_records}
    selected_run_results = [r for r in run.get("results", []) if r.get("filename") in selected_names]
    missing_selected = [r["filename"] for r in selected_records if r["filename"] not in {x.get("filename") for x in selected_run_results}]
    evaluation_run = dict(run)
    evaluation_run["results"] = selected_run_results
    engines=[evaluate_engine(evaluation_run,gt,e) for e in ("tesseractjs","native")]
    report={
        "schemaVersion":1,
        "status":"POST_HOC_EVALUATION" if not missing_selected else "POST_HOC_EVALUATION_INCOMPLETE_SELECTED_INVENTORY",
        "runReport":str(args.run_report),
        "runReportSha256":sha(args.run_report),
        "groundTruth":str(args.ground_truth),
        "groundTruthSha256":sha(args.ground_truth),
        "runStatus":run.get("status"),
        "inventorySelection":{
            "id":args.inventory,
            "selectedImageCount":len(selected_records),
            "evaluatedResultRows":len(selected_run_results),
            "missingSelectedImages":missing_selected,
            "sourceCorpusImageCount":source_corpus_count,
            "selectionRule":"first 21 corpus-order records with COMPLETE_9_FIELD_TRANSCRIPTION and all nine fieldStatus.eligible_for_exact_match=true" if args.inventory == "complete-ground-truth-21" else "all 63 source-corpus records"
        },
        "imageCount":len(selected_records),
        "sourceCorpusImageCount":source_corpus_count,
        "resultRows":len(selected_run_results),
        "sourceArchiveSha256":run.get("sourceArchiveSha256"),
        "accuracyStatus":{
            "overall":"PARTIALLY_EVALUABLE_AGAINST_SUPPLIED_MANUAL_TRANSCRIPTION",
            "fieldLevel":"EVALUATED_ONLY_FOR_ELIGIBLE_MANUAL_REFERENCE_FIELDS",
            "completeRecordSubset":"EVALUATED_ONLY_FOR_COMPLETE_NINE_FIELD_MANUAL_TRANSCRIPTIONS",
            "all63FullRecord":"NOT_EVALUABLE_INCOMPLETE_9_FIELD_COVERAGE",
            "gateB":"NOT_PASSED"
        },
        "gateB":"NOT_PASSED",
        "engines":engines
    }
    args.output.parent.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(report,ensure_ascii=False,indent=2)+"\n"
    args.output.write_text(payload,encoding="utf-8")
    digest=sha(args.output)
    args.output.with_suffix(args.output.suffix+".sha256").write_text(
        f"{digest}  {args.output.name}\n",encoding="ascii")
    print(json.dumps({
        "output":str(args.output),"sha256":digest,
        "runStatus":run.get("status"),
        "inventorySelection":report["inventorySelection"],
        "resultRows":len(selected_run_results),
        "pdfsWithHashes":sum(1 for x in selected_run_results if x.get("pdfSha256")),
        "accuracyStatus":report["accuracyStatus"],
        "engineSummaries":[{"engine":x["engine"],"fieldLevelSummary":x["fieldLevelSummary"],
                            "completeNineFieldSubset":x["completeNineFieldSubset"],
                            "wronglyAcceptedMandatoryFieldValues":x["wronglyAcceptedMandatoryFieldValues"],
                            "sourceImageHashMismatches":x["sourceImageHashMismatches"]}
                           for x in engines]
    },indent=2))

if __name__ == "__main__":
    main()
