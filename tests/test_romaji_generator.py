import importlib.util
import copy
import unittest
from pathlib import Path

from sudachipy import Dictionary, SplitMode

spec = importlib.util.spec_from_file_location(
    "romaji_generator",
    Path(__file__).resolve().parents[1] / "scripts/generate-romaji-boundaries.py",
)
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class RomajiGeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer = Dictionary(dict="core").create()

    def words(self, furigana, joins=None):
        surface, offsets = generator.reading_offsets(furigana)
        boundaries = generator.word_boundaries(self.tokenizer, surface, offsets, joins)
        kana = generator.ANNOTATION.sub(lambda match: match[2], furigana)
        encoded = kana.encode("utf-16-le")
        ends = [0, *boundaries, len(encoded) // 2]
        return [encoded[start * 2:end * 2].decode("utf-16-le")
                for start, end in zip(ends, ends[1:])]

    def test_demo_after_nouns_and_particles(self):
        self.assertEqual(
            self.words("カメレオンはどんな{色|いろ}にでもなれる。"),
            ["カメレオン", "は", "どんな", "いろ", "に", "でも", "なれる", "。"],
        )
        self.assertEqual(self.words("{誰|だれ}でもできます。"),
                         ["だれ", "でも", "できます", "。"])

    def test_temo_and_demo_keep_conjugated_stems(self):
        self.assertEqual(self.words("{食|た}べてもいいです。"),
                         ["たべても", "いいです", "。"])
        self.assertEqual(self.words("{読|よ}んでもいいです。"),
                         ["よんでも", "いいです", "。"])

    def test_standalone_mo_does_not_join_nouns(self):
        self.assertEqual(self.words("{手|て}も{何|なに}も。"),
                         ["て", "も", "なに", "も", "。"])

    def test_morau_is_not_mo_particle(self):
        self.assertEqual(self.words("{見|み}てもらう。"),
                         ["みて", "もらう", "。"])

    def test_honorific_prefixes_join_their_words(self):
        self.assertEqual(self.words("お{皿|さら}があります。"),
                         ["おさら", "が", "あります", "。"])
        self.assertEqual(self.words("ご{両親|りょうしん}が{来|き}ます。"),
                         ["ごりょうしん", "が", "きます", "。"])
        self.assertEqual(self.words("お{待|ま}ちください。"),
                         ["おまち", "ください", "。"])
        self.assertEqual(self.words("お{忙|いそが}しいです。"),
                         ["おいそがしいです", "。"])

    def test_interjections_are_not_honorific_prefixes(self):
        self.assertEqual(self.words("お、{皿|さら}があります。"),
                         ["お", "、", "さら", "が", "あります", "。"])

    def test_ambiguous_no_de_and_no_ni_remain_separate(self):
        self.assertEqual(self.words("{彼女|かのじょ}のではない。"),
                         ["かのじょ", "の", "では", "ない", "。"])
        self.assertEqual(self.words("{治|なお}るのに{時間|じかん}がかかります。"),
                         ["なおる", "の", "に", "じかん", "が", "かかります", "。"])

    def test_reviewed_conjunctions_join_without_changing_other_boundaries(self):
        candidate = {"id": "fixture", "japanese": "雨なので帰ります。", "english": "I will go home because it is raining."}
        tokens = list(self.tokenizer.tokenize(candidate["japanese"], SplitMode.C))
        hits = generator.ambiguous_conjunctions(tokens)
        review = {**candidate, "reviewer": "test", "decisions": [
            {**hit, "join": True, "reason": "Causal conjunction."} for hit in hits
        ]}
        joins = generator.reviewed_joins(candidate, tokens, review)
        self.assertEqual(self.words("{雨|あめ}なので{帰|かえ}ります。", joins),
                         ["あめ", "な", "ので", "かえります", "。"])
        review["decisions"][0]["join"] = False
        self.assertEqual(generator.reviewed_joins(candidate, tokens, review), set())

    def test_missing_stale_and_invalid_reviews_fail(self):
        candidate = {"id": "fixture", "japanese": "雨なのに。", "english": "Although it is raining."}
        tokens = list(self.tokenizer.tokenize(candidate["japanese"], SplitMode.C))
        review = {**candidate, "reviewer": "test", "decisions": [
            {**hit, "join": True, "reason": "Concessive conjunction."}
            for hit in generator.ambiguous_conjunctions(tokens)
        ]}
        invalid = [None, {**review, "english": "Changed meaning."},
                   {**review, "japanese": "Changed text."}, {**review, "reviewer": ""},
                   {**review, "decisions": []}]
        for key, value in [("start", 0), ("surface", "ので"), ("join", "false"), ("reason", "")]:
            changed = copy.deepcopy(review)
            changed["decisions"][0][key] = value
            invalid.append(changed)
        for changed in invalid:
            with self.subTest(review=changed), self.assertRaises(ValueError):
                generator.reviewed_joins(candidate, tokens, changed)

    def test_spacing_conventions_are_consistent(self):
        self.assertEqual(self.words("{学校|がっこう}では{勉強|べんきょう}する。"),
                         ["がっこう", "では", "べんきょう", "する", "。"])
        self.assertEqual(self.words("はめていた。"), ["はめて", "いた", "。"])

    def lexemes(self, furigana):
        surface, offsets = generator.reading_offsets(furigana)
        tokens = list(self.tokenizer.tokenize(surface, SplitMode.C))
        boundaries = generator.word_boundaries(self.tokenizer, surface, offsets)
        return generator.reference_lexemes(tokens, surface, offsets, furigana, boundaries)

    def test_inflected_forms_retain_supplied_readings_and_endings(self):
        self.assertEqual(self.lexemes("{水|みず}を{飲|の}みました。"),
                         [{"lemma": "飲む", "japanese": "飲みました", "reading": "のみました"}])
        self.assertEqual(self.lexemes("{高|たか}くても{買|か}います。"),
                         [{"lemma": "高い", "japanese": "高くても", "reading": "たかくても"},
                          {"lemma": "買う", "japanese": "買います", "reading": "かいます"}])

    def test_lexemes_never_split_or_guess_annotated_pronunciations(self):
        self.assertEqual(self.lexemes("{飲み|のみ}ました。"),
                         [{"lemma": "飲む", "japanese": "飲みました", "reading": "のみました"}])
        self.assertEqual(self.lexemes("{飲みます|のみます}。"),
                         [{"lemma": "飲む", "japanese": "飲みます", "reading": "のみます"}])
        self.assertEqual(self.lexemes("{水を飲みます|みずをのみます}。"), [])
        self.assertEqual(self.lexemes("{飲んでいる|のんでいる}。"), [])
        self.assertEqual(self.lexemes("{相次|あいつ}いで。"), [])
        self.assertEqual(self.lexemes("{読|よ}んではいけない。")[0],
                         {"lemma": "読む", "japanese": "読んでは", "reading": "よんでは"})

    def test_honorific_prefix_is_part_of_inflected_hint(self):
        self.assertEqual(self.lexemes("お{待|ま}ちください。"),
                         [{"lemma": "待つ", "japanese": "お待ち", "reading": "おまち"},
                          {"lemma": "くださる", "japanese": "ください", "reading": "ください"}])

    def test_complete_kana_nouns_use_lexical_normalization(self):
        self.assertEqual(self.lexemes("{川|かわ}のむこう。"),
                         [{"lemma": "向こう", "japanese": "むこう", "reading": "むこう"}])
        self.assertEqual(self.lexemes("むこうずね。"),
                         [{"lemma": "向こう脛", "japanese": "むこうずね", "reading": "むこうずね"}])
        self.assertEqual(self.lexemes("{むこう|べつ}。"), [])
        self.assertEqual(self.lexemes("{川のむこう|かわのむこう}。"), [])

    def test_complete_kana_pronouns_use_lexical_normalization(self):
        self.assertEqual(self.lexemes("わたしを。"),
                         [{"lemma": "私", "japanese": "わたし", "reading": "わたし"}])
        self.assertEqual(self.lexemes("かれを。"),
                         [{"lemma": "彼", "japanese": "かれ", "reading": "かれ"}])
        self.assertEqual(self.lexemes("{わたし|べつ}。"), [])


if __name__ == "__main__":
    unittest.main()
