import gzip
import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("spelling_generator", Path(__file__).resolve().parents[1] / "scripts/generate-spelling-variants.py")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class SpellingGeneratorTests(unittest.TestCase):
    def test_dictionary_reading_restrictions_and_unusual_spellings(self):
        xml = b'''<?xml version="1.0"?><JMdict><entry><ent_seq>1</ent_seq>
        <k_ele><keb>A</keb></k_ele><k_ele><keb>B</keb></k_ele>
        <k_ele><keb>C</keb><ke_inf>irregular kanji usage</ke_inf></k_ele>
        <r_ele><reb>one</reb><re_restr>A</re_restr></r_ele>
        <r_ele><reb>two</reb><re_restr>B</re_restr></r_ele>
        <r_ele><reb>kana</reb><re_nokanji/></r_ele>
        <sense><pos>noun</pos><stagk>A</stagk></sense></entry></JMdict>'''
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "fixture.xml.gz"
            path.write_bytes(gzip.compress(xml))
            _, readings = generator.load_dictionary(path)
        self.assertEqual(readings["one"][0]["spellings"], ["A"])
        self.assertEqual(readings["two"][0]["spellings"], ["B"])
        self.assertNotIn("kana", readings)
        self.assertIsNone(generator.unambiguous_entry(readings["one"]))

    def test_same_reading_does_not_approve_homophones_or_restricted_senses(self):
        bridge = {"id": "1", "restricted": False}
        chopsticks = {"id": "2", "restricted": False}
        self.assertIsNone(generator.unambiguous_entry([bridge, chopsticks]))
        self.assertIsNone(generator.unambiguous_entry([]))
        self.assertIsNone(generator.unambiguous_entry([{**bridge, "restricted": True}]))
        self.assertEqual(generator.unambiguous_entry([bridge]), bridge)

    def test_part_of_speech_does_not_confuse_adverbs_with_verbs(self):
        self.assertTrue(generator.compatible("Godan verb with 'su' ending", "動詞"))
        self.assertFalse(generator.compatible("adverb (fukushi)", "動詞"))
        self.assertFalse(generator.compatible("auxiliary verb", "動詞"))
        self.assertFalse(generator.compatible("pronoun", "名詞"))
        self.assertTrue(generator.compatible("pronoun", "代名詞"))
        self.assertFalse(generator.compatible("noun (common) suffix", "代名詞"))

    def test_inflection_is_retained_including_sound_changes(self):
        self.assertEqual(generator.inflected_spelling("外す", "はずす", "はずさ"), "外さ")
        self.assertEqual(generator.inflected_spelling("飲む", "のむ", "のん"), "飲ん")
        self.assertEqual(generator.inflected_spelling("食べる", "たべる", "たべ"), "食べ")
        self.assertIsNone(generator.inflected_spelling("外す", "はずす", "はし"))
        self.assertIsNone(generator.inflected_spelling("はずす", "はずす", "はずさ"))

    def test_readings_use_supplied_annotations_without_splitting_kanji(self):
        parts = generator.annotated_parts("{名前|なまえ}ははずされた。")
        self.assertEqual(generator.slice_reading(parts, 0, 2), "なまえ")
        self.assertIsNone(generator.slice_reading(parts, 0, 1))
        self.assertEqual(generator.slice_reading(parts, 3, 6), "はずさ")
        self.assertEqual(generator.utf16_offset("😀名前", 1), 2)


if __name__ == "__main__":
    unittest.main()
