import importlib.util
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "gloss_generator",
    Path(__file__).resolve().parents[1] / "scripts/generate-reference-glosses.py",
)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

CODES = {"noun (common) (futsuumeishi)": "n", "pronoun": "pn", "interjection (kandoushi)": "int"}


class ReferenceGlossTests(unittest.TestCase):
    def test_spelling_reading_and_inherited_part_of_speech(self):
        entry = ET.fromstring('''<entry>
          <k_ele><keb>私</keb></k_ele>
          <r_ele><reb>わたし</reb></r_ele><r_ele><reb>わたくし</reb></r_ele>
          <sense><pos>pronoun</pos><gloss>I</gloss><gloss xml:lang="ger">ich</gloss></sense>
          <sense><gloss>me</gloss></sense>
          <sense><stagr>わたくし</stagr><pos>noun (common) (futsuumeishi)</pos><gloss>private affairs</gloss></sense>
        </entry>''')
        self.assertEqual(generator.senses(entry, CODES, "私", "わたし"), (["I", "me"], ["pn"]))
        self.assertEqual(generator.senses(entry, CODES, "私", "あたし"), ([], []))
        # A kana chip never borrows a kanji word's senses.
        self.assertEqual(generator.senses(entry, CODES, "わたし", "わたし"), ([], []))
        # A kanji lemma accepts any reading but keeps spelling restrictions.
        self.assertEqual(generator.senses(entry, CODES, "私")[0], ["I", "me", "private affairs"])

    def test_kana_words_use_only_usually_kana_senses(self):
        entry = ET.fromstring('''<entry>
          <k_ele><keb>宜しく</keb></k_ele><r_ele><reb>よろしく</reb></r_ele>
          <sense><misc>word usually written using kana alone</misc><gloss>best regards</gloss></sense>
          <sense><gloss>suitably</gloss></sense>
        </entry>''')
        self.assertEqual(generator.senses(entry, CODES, "よろしく", "よろしく")[0], ["best regards"])

    def test_only_a_single_matching_entry_is_used(self):
        self.assertEqual(generator.match([("a", ["x"], []), ("b", [], [])]), ("a", ["x"], []))
        self.assertIsNone(generator.match([("a", ["x"], []), ("b", ["y"], [])]))


def entry(xml):
    return ET.fromstring(f"<entry>{xml}</entry>")


CODES.update({"suffix": "suf", "counter": "ctr", "prefix": "pref", "Godan verb with 'u' ending": "v5u"})
INDEX = {
    "料理": [entry("<k_ele><keb>料理</keb></k_ele><r_ele><reb>りょうり</reb></r_ele>"
                   "<sense><pos>noun (common) (futsuumeishi)</pos><gloss>cooking</gloss></sense>")],
    "用": [entry("<k_ele><keb>用</keb></k_ele><r_ele><reb>よう</reb></r_ele>"
                 "<sense><pos>noun (common) (futsuumeishi)</pos><gloss>errand</gloss></sense>"
                 "<sense><pos>suffix</pos><gloss>for the use of</gloss></sense>")],
    "駅": [entry("<k_ele><keb>駅</keb></k_ele><r_ele><reb>えき</reb></r_ele>"
                 "<sense><pos>noun (common) (futsuumeishi)</pos><gloss>station</gloss></sense>"
                 "<sense><pos>counter</pos><gloss>counter for stations</gloss></sense>")],
    "東京": [entry("<k_ele><keb>東京</keb></k_ele><r_ele><reb>とうきょう</reb></r_ele>"
                   "<sense><pos>noun (common) (futsuumeishi)</pos><gloss>Tokyo</gloss></sense>")],
    "ご": [entry("<r_ele><reb>ご</reb></r_ele><sense><pos>prefix</pos><gloss>honorific prefix</gloss></sense>")],
    "救う": [entry("<k_ele><keb>救う</keb></k_ele><r_ele><reb>すくう</reb></r_ele>"
                   "<sense><pos>Godan verb with 'u' ending</pos><gloss>to save</gloss></sense>")],
}


class CompoundTests(unittest.TestCase):
    def meanings(self, word, kana):
        found = generator.compound(INDEX, CODES, word, kana)
        return found and [f"{label}: {', '.join(glosses)}" for _, _, _, glosses, label in found[0]]

    def test_a_final_part_uses_its_suffix_senses(self):
        self.assertEqual(self.meanings("料理用", "りょうりよう"), ["料理: cooking", "用: for the use of"])

    def test_counter_senses_apply_only_after_a_number(self):
        self.assertEqual(self.meanings("東京駅", "とうきょうえき"), ["東京: Tokyo", "駅: station"])
        self.assertEqual(self.meanings("２駅", "２えき"), ["駅: counter for stations"])

    def test_potential_verbs_and_unknown_parts(self):
        self.assertEqual(self.meanings("救える", "すくえる"), ["potential of 救う: to save"])
        self.assertIsNone(self.meanings("ご家族", "ごかぞく"))
        self.assertIsNone(self.meanings("たくさん駅", "たくさんえき"))

    def test_kana_verbs_are_not_split_after_an_honorific_prefix(self):
        index = {**INDEX, "お": [entry("<r_ele><reb>お</reb></r_ele><sense><pos>prefix</pos>"
                                     "<gloss>honorific prefix</gloss></sense>")],
                 "って": [entry("<r_ele><reb>って</reb></r_ele><sense><pos>noun (common) (futsuumeishi)</pos>"
                                        "<gloss>you said</gloss></sense>")]}
        # おって from おる is a verb form, not お + って.
        self.assertIsNone(generator.compound(index, CODES, "おって", "おって", verb=True))
        self.assertEqual(
            generator.compound(index, CODES, "おって", "おって")[0][1][4], "って",
        )


CODES.update({"Kuru verb - special class": "vk", "Ichidan verb": "v1"})
VERBS = {
    "くる": [entry("<k_ele><keb>来る</keb></k_ele><r_ele><reb>くる</reb><re_pri>ichi1</re_pri></r_ele>"
                  "<sense><pos>Kuru verb - special class</pos><gloss>to come</gloss></sense>"),
            entry("<k_ele><keb>繰る</keb></k_ele><r_ele><reb>くる</reb></r_ele>"
                  "<sense><pos>Godan verb with 'u' ending</pos><gloss>to reel</gloss></sense>")],
    "やめる": [entry("<k_ele><keb>止める</keb></k_ele><r_ele><reb>やめる</reb><re_pri>ichi1</re_pri></r_ele>"
                    "<sense><pos>Ichidan verb</pos><gloss>to stop</gloss></sense>"),
              entry("<k_ele><keb>辞める</keb></k_ele><r_ele><reb>やめる</reb><re_pri>ichi1</re_pri></r_ele>"
                    "<sense><pos>Ichidan verb</pos><gloss>to resign</gloss></sense>")],
}


class KanaVerbTests(unittest.TestCase):
    def test_a_kana_verb_uses_its_single_common_verb_of_that_class(self):
        found = generator.kana_verb(VERBS, CODES, "くる", "vk")
        self.assertEqual(found[1:], (["to come"], ["vk"]))
        # 繰る is another class and uncommon.
        self.assertIsNone(generator.kana_verb(VERBS, CODES, "くる", "v5u"))

    def test_several_common_verbs_are_ambiguous(self):
        self.assertIsNone(generator.kana_verb(VERBS, CODES, "やめる", "v1"))


def katakana(gloss, common=True):
    pri = "<re_pri>gai1</re_pri>" if common else ""
    return entry(f"<r_ele><reb>サッカー</reb>{pri}</r_ele><sense><gloss>{gloss}</gloss></sense>")


class KatakanaTests(unittest.TestCase):
    def test_glosses_must_appear_in_the_translation_in_the_same_case(self):
        self.assertTrue(generator.translated(["soccer"], "He plays soccer."))
        self.assertTrue(generator.translated(["email"], "Thanks for your e-mail."))
        self.assertFalse(generator.translated(["frank"], "Tom and Frank are friends."))
        self.assertTrue(generator.translated(["Florida"], "They flew to Florida."))

    def test_a_single_common_entry_needs_every_translation(self):
        index = {"サッカー": [katakana("soccer"), katakana("seersucker", common=False)]}
        found = generator.confirmed_katakana(index, CODES, "サッカー", ["I like soccer.", "Soccer is fun."])
        self.assertEqual(found[1], ["soccer"])
        self.assertIsNone(generator.confirmed_katakana(index, CODES, "サッカー", ["I like soccer.", "Paul came."]))
        two = {"サッカー": [katakana("soccer"), katakana("sucker")]}
        self.assertIsNone(generator.confirmed_katakana(two, CODES, "サッカー", ["I like soccer."]))


if __name__ == "__main__":
    unittest.main()
