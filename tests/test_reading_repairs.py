import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


repairs_generator = load("reading_repairs", "scripts/generate-reading-repairs.py")
importer = load("fetch_learning_data", "scripts/fetch_learning_data.py")


def entry(spellings, readings, gloss="x"):
    return {"spellings": spellings, "gloss": gloss,
            "readings": [{"reading": r, "restrictedTo": restr, "kanaOnly": kana_only}
                         for r, restr, kana_only in readings]}


class ResolveTests(unittest.TestCase):
    def test_single_reading_repairs_the_annotation(self):
        repairs = repairs_generator.resolve(
            {("前", "1392580")}, {"1392580": entry(["前"], [("まえ", [], False)])})
        self.assertEqual(repairs, [{"entry": "1392580", "spelling": "前", "reading": "まえ", "gloss": "x"}])

    def test_kana_only_readings_are_ignored(self):
        # 腰 also lists コシ, which JMdict marks as not a reading of the kanji.
        repairs = repairs_generator.resolve(
            {("腰", "1288340")}, {"1288340": entry(["腰"], [("こし", [], False), ("コシ", [], True)])})
        self.assertEqual(repairs[0]["reading"], "こし")

    def test_restricted_readings_apply_only_to_their_spelling(self):
        entries = {"1": entry(["甲", "乙"], [("こう", ["甲"], False), ("おつ", ["乙"], False)])}
        self.assertEqual(repairs_generator.resolve({("乙", "1")}, entries)[0]["reading"], "おつ")

    def test_several_readings_are_never_guessed(self):
        entries = {"1": entry(["何"], [("なに", [], False), ("なん", [], False)])}
        with self.assertRaises(ValueError):
            repairs_generator.resolve({("何", "1")}, entries)

    def test_entry_must_list_the_annotated_spelling(self):
        with self.assertRaises(ValueError):
            repairs_generator.resolve({("後", "1392580")}, {"1392580": entry(["前"], [("まえ", [], False)])})
        with self.assertRaises(ValueError):
            repairs_generator.resolve({("前", "999")}, {})


class ImportTests(unittest.TestCase):
    def test_import_replaces_entry_annotations(self):
        repairs = {("前", "1392580"): "まえ"}
        self.assertEqual(
            importer.repair_furigana("{人|ひと}の{前|#1392580}で", repairs), "{人|ひと}の{前|まえ}で")

    def test_unrepaired_entry_annotation_stops_the_import(self):
        with self.assertRaises(ValueError):
            importer.repair_furigana("{妻|#1294330}", {})

    def test_every_snapshot_annotation_has_a_repair(self):
        manifest = json.loads((ROOT / "data/manifest.json").read_text())
        annotations = repairs_generator.entry_annotations(ROOT / manifest["snapshotPath"])
        repairs = importer.load_repairs()
        self.assertTrue(annotations)
        self.assertEqual({(spelling, entry_id) for spelling, entry_id in annotations}, set(repairs))

    def test_processed_candidates_contain_no_entry_annotations(self):
        text = (ROOT / "data/processed/sentence-candidates.json").read_text(encoding="utf-8")
        self.assertIsNone(importer.ENTRY_ANNOTATION.search(text))


if __name__ == "__main__":
    unittest.main()
