import importlib.util
import json
import unittest
from pathlib import Path

from sudachipy import Dictionary

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "sentence_levels", ROOT / "scripts/generate-sentence-levels.py",
)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class SentenceLevelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer = Dictionary(dict="core").create()
        manifest = json.loads((ROOT / "data/manifest.json").read_text())
        cls.levels = generator.vocabulary_levels(ROOT / manifest["snapshotPath"])

    def level(self, text):
        return generator.sentence_level(
            generator.word_levels(self.tokenizer, self.levels, text))

    def lemmas(self, text):
        return {word["lemma"]: word["level"]
                for word in generator.word_levels(self.tokenizer, self.levels, text)}

    def test_level_is_the_hardest_listed_word(self):
        self.assertEqual(self.level("水を飲みます。"), "N5")
        self.assertEqual(self.level("彼は工作がうまい。"), "N1")

    def test_conjugated_verbs_use_their_dictionary_form(self):
        self.assertEqual(self.lemmas("水を飲みました。")["飲む"], "N5")

    def test_particles_and_auxiliaries_are_not_graded(self):
        lemmas = self.lemmas("水を飲みます。")
        self.assertNotIn("を", lemmas)
        self.assertNotIn("ます", lemmas)

    def test_names_and_numerals_do_not_raise_the_level(self):
        self.assertEqual(self.level("田中さんは３時に来ます。"), "N5")

    def test_counters_after_numerals_belong_to_the_number(self):
        # 時 alone is listed as とき ("time"); ３時 is a clock time.
        self.assertNotIn("時", self.lemmas("３時に起きます。"))
        self.assertIn("時", self.lemmas("時が経つ。"))

    def test_unlisted_words_are_recorded_without_raising_the_level(self):
        words = generator.word_levels(self.tokenizer, self.levels, "スマホを使います。")
        self.assertIn(None, [word["level"] for word in words])
        self.assertEqual(generator.sentence_level(words), "N5")

    def test_sentences_without_listed_words_are_n5(self):
        self.assertEqual(generator.sentence_level([]), "N5")


if __name__ == "__main__":
    unittest.main()
