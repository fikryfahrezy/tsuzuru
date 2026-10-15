import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path

from sudachipy import Dictionary

ROOT = Path(__file__).resolve().parents[1]
# The generator imports its grammar rules as a sibling module.
sys.path.insert(0, str(ROOT / "scripts"))
from grammar_patterns import RULES, matched_patterns  # noqa: E402

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
        self.assertEqual(self.lemmas("父は医者です。")["父"], "N5")
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


# Approved draft: every pattern with sentences it must and must not match.
GRAMMAR_CASES = {
    "passive-potential": (
        ["その犬は車にひかれた。", "この本は易しい英語で書かれている。", "ここではおいしい食べ物が出されます。",
         "8冊まで借りられる。", "先生に褒められた。"],
        ["どんぐりからオークが生まれる。", "鍵を忘れた。", "箱にりんごを入れる。", "明日は晴れるでしょう。"],
    ),
    "o-ni-naru": (
        ["こちらはあなたがお話しになるお方です。", "先生はもうお帰りになりました。", "社長がお見えになる。",
         "社長がご出席になる。", "どうぞお休みになってください。"],
        ["お茶になります。", "お酒になる。", "大人になる。", "お金がない。"],
    ),
    "o-kudasai": (
        ["少々お待ちください。", "どうぞお入りください。"],
        ["水をください。", "見てください。", "お茶をください。"],
    ),
    "honorific-verbs": (
        ["この辺はよくごぞんじですか。", "先生がいらっしゃいました。", "社長はそうおっしゃった。",
         "どうぞ召し上がってください。"],
        ["勉強しなさい。", "存在する。", "母が言った。"],
    ),
    "te-itadaku-kudasaru": (
        ["親切にしていただきました。", "先生が教えてくださいました。", "九時に来ていただきたい。"],
        ["見てください。", "お菓子をいただきました。", "本を下さい。"],
    ),
    "te-miru": (
        ["パーカーさんは箸で食べてみました。", "一度行ってみたい。", "着てみてもいいですか。"],
        ["映画を見てから帰った。", "テレビを見ます。", "見てください。"],
    ),
    "hodo-nai": (
        ["この本はあの本ほどやさしくない。", "今年は去年ほど寒くありません。", "彼は私ほど背が高くない。",
         "私たちは思っているほど安全ではない。"],
        ["３キロほど歩いた。", "１時間ほど待った。", "これほど美しい花はない。", "高ければ高いほど登りにくい。"],
    ),
    "hodo-wa-nai": (
        ["これほど美しい花はない。", "健康ほど大切なものはない。"],
        ["この本はあの本ほどやさしくない。", "３キロほど歩いた。", "私たちは思っているほど安全ではない。"],
    ),
    "ba-hodo": (
        ["木は高ければ高いほど登りにくい。", "練習すればするほど上手になる。"],
        ["雨が降れば行かない。", "この本はあの本ほどやさしくない。"],
    ),
    "dake-de-naku": (
        ["天気は寒いだけでなく雨であった。", "英語だけじゃなく日本語も話せる。", "肉ばかりでなく野菜も食べなさい。"],
        ["水だけです。", "少しだけでいい。", "これだけではない。"],
    ),
    "beki": (
        ["寒いからコートを着るべきだ。", "君は予習をするべきだ。", "行くべきではない。"],
        ["勉強します。", "すぐ行きなさい。"],
    ),
    "ni-tsuite": (
        ["日本について話した。", "その問題について考えています。"],
        ["駅に着いて電話した。", "火がついている。", "トレーラーがその車についている。", "日本に行った。"],
    ),
    "ni-yotte": (
        ["人によって考え方が違う。", "台風による被害。", "この絵はピカソによって描かれた。"],
        ["友達の家に寄って帰った。", "夜になった。", "学校に行く。"],
    ),
    "uchi-ni": (
        ["若いうちに勉強しなさい。", "暗くならないうちに帰ろう。", "寝ているうちに雨が降った。",
         "近いうちに連絡します。"],
        ["うちに帰ります。", "私のうちに来てください。", "うちには犬がいる。"],
    ),
    "wake": (
        ["嘘をつくわけがない。", "嫌いなわけではない。", "だから遅れたわけだ。"],
        ["わけを話してください。", "わけがわからない。", "訳もなく泣いた。"],
    ),
    "dokoro": (
        ["忙しくてそれどころじゃないよ。", "休むどころか、もっと働いた。"],
        ["ところで、元気ですか。", "いいところですね。"],
    ),
}


class GrammarPatternTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tokenizer = Dictionary(dict="core").create()
        manifest = json.loads((ROOT / "data/manifest.json").read_text())
        cls.snapshot = ROOT / manifest["snapshotPath"]
        cls.patterns = json.loads(
            (ROOT / "data/sentence-levels/grammar-patterns.json").read_text())

    def test_every_rule_has_test_sentences(self):
        self.assertEqual(set(GRAMMAR_CASES), set(RULES))

    def test_patterns_match_and_reject_their_sentences(self):
        for pattern, (matches, rejects) in GRAMMAR_CASES.items():
            for text in matches:
                with self.subTest(pattern=pattern, text=text, expected="match"):
                    self.assertIn(pattern, matched_patterns(self.tokenizer, text))
            for text in rejects:
                with self.subTest(pattern=pattern, text=text, expected="no match"):
                    self.assertNotIn(pattern, matched_patterns(self.tokenizer, text))

    def test_pattern_levels_follow_openjlpt(self):
        levels = generator.grammar_levels(self.snapshot, self.patterns)
        self.assertEqual(generator.LEVELS[levels["passive-potential"]], "N4")
        self.assertEqual(generator.LEVELS[levels["dokoro"]], "N2")
        wrong = copy.deepcopy(self.patterns)
        wrong["patterns"][0]["level"] = "N5"
        with self.assertRaises(ValueError):
            generator.grammar_levels(self.snapshot, wrong)

    def test_every_rule_needs_a_reviewed_entry(self):
        missing = copy.deepcopy(self.patterns)
        missing["patterns"] = missing["patterns"][1:]
        with self.assertRaises(ValueError):
            generator.grammar_levels(self.snapshot, missing)
        unreviewed = copy.deepcopy(self.patterns)
        unreviewed["patterns"][0]["reviewer"] = ""
        with self.assertRaises(ValueError):
            generator.grammar_levels(self.snapshot, unreviewed)

    def test_grammar_raises_a_sentence_with_easy_words(self):
        levels = generator.grammar_levels(self.snapshot, self.patterns)
        found = generator.found_grammar(
            levels, matched_patterns(self.tokenizer, "その犬は車にひかれた。"))
        self.assertEqual(found, [{"pattern": "passive-potential", "level": "N4"}])


if __name__ == "__main__":
    unittest.main()
