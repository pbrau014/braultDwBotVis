import importlib.util
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

    def test_exact_21_complete_nine_field_selection(self):
        self.assertEqual(len(self.selected), 21)
        self.assertEqual(self.selected, self.gt["records"][:21])
        for row in self.selected:
            self.assertTrue(EVALUATOR.is_complete_reference(row))
            self.assertEqual(len([f for f in EVALUATOR.FIELDS
                                  if row["fieldStatus"][f]["eligible_for_exact_match"]]), 9)

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

    def test_no_artifact_report_means_gate_b_pending(self):
        result = EVALUATOR.verify_artifact_report(
            None, Path("run-report.json"), GT_PATH, self.selected, []
        )
        self.assertEqual(result["status"], "PENDING_ARTIFACT_VERIFICATION")


if __name__ == "__main__":
    unittest.main()
