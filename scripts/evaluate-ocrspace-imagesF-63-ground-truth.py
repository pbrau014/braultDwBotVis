#!/usr/bin/env python3
"""Post-hoc accuracy evaluation for an existing imagesF-63 OCR.Space run.

This script does not call OCR.Space and never re-runs provider submissions.
It compares saved local-reader records from the run report against the
versioned working ground-truth JSON.
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
    text = text.replace("—", "-").replace("–", "-")
    return text.casefold()

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

    for result in run.get("results", []):
        name = result.get("filename")
        expected_row = gt_by_name.get(name)
        if not expected_row:
            continue
        reader = next((x for x in result.get("localReaders", []) if x.get("engine") == engine), None)
        if reader:
            reader_count += 1
        record = (reader or {}).get("record") or {}
        accepted = (reader or {}).get("accepted") is True
        image_fields = {}
        all_exact = True
        any_unresolved = False
        full_eligible = expected_row.get("recordStatus") == "COMPLETE_9_FIELD_TRANSCRIPTION"

        for field in FIELDS:
            meta = expected_row.get("fieldStatus", {}).get(field, {})
            eligible = meta.get("eligible_for_exact_match") is True
            expected = expected_row.get("expected", {}).get(field)
            actual = record.get(field)
            n_expected = norm(field, expected)
            n_actual = norm(field, actual)
            if not eligible or n_expected is None:
                image_fields[field] = {"status":"NOT_SCORED", "expected":expected, "actual":actual}
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
                full_status = "INCOMPLETE_LOCAL_READER_OUTPUT"
            else:
                complete_wrong += 1
                full_status = "NINE_FIELD_MISMATCH"
        else:
            full_status = "NOT_IN_COMPLETE_SUBSET"

        per_image.append({
            "filename":name,
            "pdfFirstStatus":result.get("status"),
            "providerSubmissionAttempted":result.get("providerSubmissionAttempted") is True,
            "pdfSha256":result.get("pdfSha256"),
            "rasterSha256":result.get("rasterSha256"),
            "readerAvailable":reader is not None,
            "readerAccepted":accepted,
            "fullRecordStatus":full_status,
            "fields":image_fields,
            "readerFailures":[x for x in result.get("localReaderFailures", []) if x.get("engine")==engine]
        })

    return {
        "engine":engine,
        "readerRowsAvailable":reader_count,
        "providerSubmissionAttempts":attempted_count,
        "searchablePdfsWithHashes":pdf_count,
        "pdfDerivedRastersWithHashes":raster_count,
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
    args=ap.parse_args()
    run=json.loads(args.run_report.read_text(encoding="utf-8"))
    gt=json.loads(args.ground_truth.read_text(encoding="utf-8"))
    if gt.get("schemaVersion") != 2 or len(gt.get("records", [])) != 63:
        raise SystemExit("Ground-truth schema or image count mismatch.")
    engines=[evaluate_engine(run,gt,e) for e in ("tesseractjs","native")]
    report={
        "schemaVersion":1,
        "status":"POST_HOC_EVALUATION",
        "runReport":str(args.run_report),
        "runReportSha256":sha(args.run_report),
        "groundTruth":str(args.ground_truth),
        "groundTruthSha256":sha(args.ground_truth),
        "runStatus":run.get("status"),
        "imageCount":run.get("imageCount"),
        "sourceArchiveSha256":run.get("sourceArchiveSha256"),
        "accuracyStatus":{
            "overall":"PARTIALLY_EVALUABLE",
            "fieldLevel":"EVALUATED_ONLY_FOR_ELIGIBLE_EXPECTED_FIELDS",
            "completeRecordSubset":"EVALUATED_ONLY_FOR_COMPLETE_NINE_FIELD_RECORDS",
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
        "pdfsWithHashes":sum(1 for x in run.get("results",[]) if x.get("pdfSha256")),
        "images":len(run.get("results",[])),
        "accuracyStatus":report["accuracyStatus"],
        "engineSummaries":[{"engine":x["engine"],"completeNineFieldSubset":x["completeNineFieldSubset"],
                            "wronglyAcceptedMandatoryFieldValues":x["wronglyAcceptedMandatoryFieldValues"]}
                           for x in engines]
    },indent=2))

if __name__ == "__main__":
    main()
