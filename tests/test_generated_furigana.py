import importlib.util
import json
import unittest
from pathlib import Path

from sudachipy import Dictionary

ROOT = Path(__file__).resolve().parents[1]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generator = load("generate_furigana", "scripts/generate-furigana.py")
importer = load("fetch_learning_data", "scripts/fetch_learning_data.py")


class AlignTests(unittest.TestCase):
    def test_kana_endings_stay_outside_the_annotation(self):
        self.assertEqual(generator.align("読む", "よむ"), [("読", "よ"), ("む", None)])
        self.assertEqual(generator.align("今し方", "いましがた"),
                         [("今", "いま"), ("し", None), ("方", "がた")])

    def test_an_ambiguous_split_is_rejected(self):
        # 子か子 read かかかか could give the first 子 か or かか.
        self.assertIsNone(generator.align("子か子", "かかかか"))

    def test_a_reading_that_does_not_fit_is_rejected(self):
        self.assertIsNone(generator.align("読む", "よみ"))


class AnnotateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer = Dictionary(dict="core").create()

    def annotate(self, text, readings):
        return generator.annotate(text, readings, self.tokenizer)[0]

    def test_kanji_free_sentences_need_no_annotation(self):
        self.assertEqual(self.annotate("パーティーはたのしかったですか。", {}), "パーティーはたのしかったですか。")

    def test_words_with_one_reading_are_annotated(self):
        readings = {"学校": {"がっこう"}, "行く": {"いく"}}
        self.assertEqual(self.annotate("学校に行く。", readings), "{学校|がっこう}に{行|い}く。")

    def test_inflected_words_keep_the_dictionary_reading_of_their_kanji(self):
        self.assertEqual(self.annotate("本を読んだ。", {"本": {"ほん"}, "読む": {"よむ"}}),
                         "{本|ほん}を{読|よ}んだ。")

    def test_several_readings_leave_the_sentence_unannotated(self):
        readings = {"学校": {"がっこう"}, "行く": {"いく", "ゆく"}}
        self.assertIsNone(self.annotate("学校に行く。", readings))

    def test_unknown_words_leave_the_sentence_unannotated(self):
        self.assertIsNone(self.annotate("学校に行く。", {"学校": {"がっこう"}}))


class DataTests(unittest.TestCase):
    def test_generated_furigana_only_fills_unannotated_upstream_sentences(self):
        manifest = json.loads((ROOT / "data/manifest.json").read_text())
        _, upstream = importer.build_candidates(
            ROOT / manifest["snapshotPath"], manifest["revision"], generated={})
        by_id = {row["id"]: row for row in upstream}
        entries = importer.load_generated_furigana()
        self.assertGreater(len(entries), 700)
        for sentence_id, entry in entries.items():
            row = by_id[sentence_id]
            self.assertEqual(row["furiganaVariants"], [])
            self.assertEqual(row["japanese"], entry["sourceJapanese"])

    def test_processed_candidates_include_the_generated_furigana(self):
        rows = {row["id"]: row for row in json.loads(
            (ROOT / "data/processed/sentence-candidates.json").read_text())}
        for sentence_id, entry in importer.load_generated_furigana().items():
            self.assertEqual(rows[sentence_id]["furiganaVariants"], [entry["furigana"]])


if __name__ == "__main__":
    unittest.main()
