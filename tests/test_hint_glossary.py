import importlib.util
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "hint_generator",
    Path(__file__).resolve().parents[1] / "scripts/generate-hint-glossary.py",
)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class HintGlossaryTests(unittest.TestCase):
    def test_reading_spelling_and_sense_restrictions(self):
        entry = ET.fromstring('''<entry>
          <k_ele><keb>開く</keb></k_ele><k_ele><keb>空く</keb></k_ele>
          <r_ele><reb>あく</reb></r_ele>
          <r_ele><reb>ひらく</reb><re_restr>開く</re_restr></r_ele>
          <sense><gloss>open</gloss><gloss xml:lang="ger">öffnen</gloss></sense>
          <sense><stagk>空く</stagk><gloss>become vacant</gloss></sense>
          <sense><stagr>ひらく</stagr><gloss>unfold</gloss></sense>
        </entry>''')
        self.assertEqual(generator.meanings(entry, "開く", "あく"), ["open"])
        self.assertEqual(generator.meanings(entry, "空く", "あく"), ["open", "become vacant"])
        self.assertEqual(generator.meanings(entry, "開く", "ひらく"), ["open", "unfold"])
        self.assertEqual(generator.meanings(entry, "空く", "ひらく"), [])
        self.assertEqual(generator.meanings(entry, "別", "あく"), [])


if __name__ == "__main__":
    unittest.main()
