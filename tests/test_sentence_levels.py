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
        cls.snapshot = ROOT / manifest["snapshotPath"]
        cls.supplement = json.loads(
            (ROOT / "data/sentence-levels/supplement.json").read_text())
        cls.levels = generator.vocabulary_levels(
            cls.tokenizer, cls.snapshot, cls.supplement)

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

    def test_unlisted_kana_words_do_not_raise_the_level(self):
        words = generator.word_levels(self.tokenizer, self.levels, "スマホを使います。")
        self.assertIn(None, [word["level"] for word in words])
        self.assertEqual(generator.sentence_level(words), "N5")

    def test_unlisted_kanji_words_count_as_above_every_level(self):
        words = generator.word_levels(self.tokenizer, self.levels, "彼は卒倒した。")
        self.assertEqual(generator.sentence_level(words), "N1")
        self.assertIn("卒倒", [word["lemma"] for word in
                               generator.limiting_words(words, "N1")])

    def test_kanji_spellings_of_kana_listed_words(self):
        # OpenJLPT writes these in kana: できる, ほんとう, ねだん.
        self.assertEqual(self.lemmas("それは出来る。")["出来る"], "N5")
        self.assertEqual(self.lemmas("本当です。")["本当"], "N5")
        self.assertEqual(self.lemmas("値段は高い。")["値段"], "N4")

    def test_okurigana_and_honorific_variants(self):
        self.assertEqual(self.lemmas("授業が終わる。")["終わる"], "N5")  # listed as 終る
        self.assertEqual(self.lemmas("風呂に入る。")["風呂"], "N5")  # listed as お風呂
        self.assertEqual(self.lemmas("主人は留守です。")["主人"], "N4")  # listed as 御主人

    def test_supplement_levels_common_words_missing_from_the_lists(self):
        self.assertEqual(self.lemmas("父は医者です。")["父"], "N4")
        plain = generator.vocabulary_levels(self.tokenizer, self.snapshot)
        self.assertIsNone(
            generator.word_levels(self.tokenizer, plain, "父は医者です。")[0]["level"])

    def test_supplement_entries_need_a_reason_and_reviewer(self):
        entry = {"word": "父", "reading": "ちち", "level": "N4", "reason": "x", "reviewer": ""}
        with self.assertRaises(ValueError):
            generator.vocabulary_levels(self.tokenizer, self.snapshot,
                                        {"version": 1, "entries": [entry]})

    def test_supplement_cannot_override_a_listed_word(self):
        # 多く already resolves through the kana entry おおく.
        entry = {"word": "多く", "reading": "おおく", "level": "N4",
                 "reason": "x", "reviewer": "test"}
        with self.assertRaises(ValueError):
            generator.vocabulary_levels(self.tokenizer, self.snapshot,
                                        {"version": 1, "entries": [entry]})

    def test_sentences_without_listed_words_are_n5(self):
        self.assertEqual(generator.sentence_level([]), "N5")


if __name__ == "__main__":
    unittest.main()
