import importlib.util
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "evaluate-ocrspace-imagesF-63-ground-truth.py"
GT_PATH = ROOT / "testdata" / "ground-truth" / "imagesF-63-working-ground-truth-v6.json"
SPEC = importlib.util.spec_from_file_location("dwbot_imagesf21_evaluator", SCRIPT)
EVALUATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EVALUATOR)


class GateB21EvaluatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gt = json.loads(GT_PATH.read_text(encoding="utf-8"))
        cls.selected = EVALUATOR.select_gate_b_records(cls.gt)

    def test_ground_truth_json_checksum_sidecar_matches_exact_bytes(self):
        sidecar = GT_PATH.with_suffix(GT_PATH.suffix + ".sha256")
        expected = sidecar.read_text(encoding="ascii").split()[0]
        actual = hashlib.sha256(GT_PATH.read_bytes()).hexdigest()
        self.assertEqual(actual, expected)

    def test_exact_21_complete_nine_field_selection(self):
        self.assertEqual(len(self.selected), 21)
        self.assertEqual(self.selected, self.gt["records"][:21])
        for row in self.selected:
            self.assertTrue(EVALUATOR.is_complete_reference(row))
            self.assertEqual(len([f for f in EVALUATOR.FIELDS
                                  if row["fieldStatus"][f]["eligible_for_exact_match"]]), 9)

    def test_gate_b_subset_has_no_source_hash_overlap_with_16_image_development_corpus(self):
        dev_path = ROOT / "testdata" / "additional-screenshot-ground-truth.json"
        dev = json.loads(dev_path.read_text(encoding="utf-8"))
        dev_hashes = {row["sha256"] for row in dev["records"]}
        gate_b_hashes = {row["sourceImage"]["sha256"] for row in self.selected}
        self.assertEqual(len(dev_hashes), 16)
        self.assertFalse(gate_b_hashes & dev_hashes)

    def test_gate_b_selection_matches_source_bound_candidate_manifest(self):
        manifest_path = ROOT / "testdata" / "imagesF-holdout-candidate-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        subset = manifest["gateBSubset"]
        self.assertEqual(subset["id"], "complete-ground-truth-21")
        self.assertEqual(subset["imageCount"], 21)
        self.assertEqual(subset["groundTruthSha256"], hashlib.sha256(GT_PATH.read_bytes()).hexdigest())
        expected = [{"filename": row["filename"], "bytes": row["sourceImage"]["bytes"], "sha256": row["sourceImage"]["sha256"]} for row in self.selected]
        self.assertEqual(subset["records"], expected)

    def test_gate_b_subset_has_no_source_hash_overlap_with_four_image_regression_corpus(self):
        regression_dir = ROOT / "fixtures" / "four-screenshots"
        regression_files = [p for p in regression_dir.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]
        self.assertEqual(len(regression_files), 4)
        regression_hashes = {hashlib.sha256(p.read_bytes()).hexdigest() for p in regression_files}
        gate_b_hashes = {row["sourceImage"]["sha256"] for row in self.selected}
        self.assertFalse(gate_b_hashes & regression_hashes)

    def test_partial_or_uncertain_rows_do_not_enter_gate_b(self):
        selected_names = {r["filename"] for r in self.selected}
        for row in self.gt["records"]:
            if row["filename"] not in selected_names:
                self.assertFalse(EVALUATOR.is_complete_reference(row))

    def test_missing_selected_run_rows_are_counted_as_unresolved(self):
        first = self.selected[0]
        run = {"results": [{
            "filename": first["filename"],
            "sourceSha256": first["sourceImage"]["sha256"],
            "status": "pdf-first-complete",
            "providerSubmissionAttempted": True,
            "localReaders": [{
                "engine": "tesseractjs",
                "accepted": False,
                "record": {}
            }]
        }]}
        metrics = EVALUATOR.evaluate_engine(run, "tesseractjs", self.selected)
        self.assertEqual(metrics["missingRunResults"], 20)
        self.assertEqual(metrics["readerRowsAvailable"], 1)
        self.assertEqual(metrics["fieldLevelSummary"]["eligibleExpectedValues"], 189)
        self.assertEqual(metrics["fieldLevelSummary"]["unresolvedOutputs"], 189)
        self.assertEqual(metrics["fieldLevelSummary"]["exactMatches"], 0)

    def test_gate_b_requires_gate_a_pass_and_locked_matching_candidate_fingerprint(self):
        self.assertEqual(EVALUATOR.gate_a_evidence_status({}), "PENDING_GATE_A")
        self.assertEqual(EVALUATOR.gate_a_evidence_status({"gateA": {"status": "FAIL"}}), "FAIL")
        good = {"gateA": {
            "status": "PASS", "reportSha256": "a" * 64,
            "candidateFingerprint": "b" * 64,
            "fingerprintLocked": True, "matchesGateBRunSource": True,
            "completeImages": 16, "exactCompleteRecords": 16,
            "wronglyAcceptedMandatoryFieldValues": 0,
            "unresolvedMandatoryFieldValues": 0, "unauthorizedNetworkAttempts": 0
        }}
        self.assertEqual(EVALUATOR.gate_a_evidence_status(good), "PASS")
        good["gateA"]["matchesGateBRunSource"] = False
        self.assertEqual(EVALUATOR.gate_a_evidence_status(good), "FAIL")
        good["gateA"]["matchesGateBRunSource"] = True
        good["gateA"]["unresolvedMandatoryFieldValues"] = 1
        self.assertEqual(EVALUATOR.gate_a_evidence_status(good), "FAIL")

    def test_no_artifact_report_means_gate_b_pending(self):
        result = EVALUATOR.verify_artifact_report(
            None, Path("run-report.json"), GT_PATH, self.selected, []
        )
        self.assertEqual(result["status"], "PENDING_ARTIFACT_VERIFICATION")


if __name__ == "__main__":
    unittest.main()
