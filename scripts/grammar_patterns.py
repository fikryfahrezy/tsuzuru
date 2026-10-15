"""Detect reviewed JLPT grammar patterns in a sentence from Sudachi's words.

Rules work on words and grammatical labels rather than text, so 〜って does not
match every て-form (入って) and 〜まい does not match かまいません. Each rule's
id must appear in data/sentence-levels/grammar-patterns.json, which gives its
level and OpenJLPT entries.
"""
from sudachipy import SplitMode

PREFIXES = ("お", "ご", "御")
PREDICATE = ("動詞", "形容詞", "助動詞")
# Causatives that became ordinary verbs: 知らせる means "inform".
LEXICAL_CAUSATIVES = {"知る"}
HONORIFIC_VERBS = {"いらっしゃる", "おっしゃる", "召し上がる", "召しあがる", "ご覧", "御覧"}


class Word:
    def __init__(self, morpheme):
        pos = morpheme.part_of_speech()
        self.surface = morpheme.surface()
        self.lemma = morpheme.dictionary_form()
        self.pos, self.pos_detail, self.pos_type, self.form = pos[0], pos[1], pos[2], pos[5]


class Sentence:
    def __init__(self, tokenizer, text):
        self.tokenizer = tokenizer
        self.words = [Word(m) for m in tokenizer.tokenize(text, SplitMode.C)]

    def at(self, index):
        return self.words[index] if 0 <= index < len(self.words) else None

    def is_te(self, index):
        word = self.at(index)
        return (word is not None and word.pos == "助詞" and word.pos_detail == "接続助詞"
                and word.surface in ("て", "で"))

    def after_te(self, lemmas):
        return any(self.is_te(i - 1) and w.lemma in lemmas for i, w in enumerate(self.words))

    def explanatory_no(self, index):
        """の / ん after a predicate (行くの, 静かなの); possessive 私の is a case particle."""
        word, previous = self.at(index), self.at(index - 1)
        return (word is not None and word.surface in ("の", "ん") and word.pos_detail == "準体助詞"
                and previous is not None and previous.pos in PREDICATE)

    def conditional_ba(self):
        """Indexes of conditional ば, excluding N5 〜なければならない / いけない."""
        for i, w in enumerate(self.words):
            if w.surface == "ば" and w.pos_detail == "接続助詞":
                previous, following = self.at(i - 1), self.at(i + 1)
                if previous and previous.lemma == "ない" and following and following.lemma in ("なる", "いける"):
                    continue
                yield i

    def ba_ii_at(self, index):
        following = self.at(index + 1)
        return following is not None and following.lemma in ("いい", "よい", "良い")

    def verb_stem(self, word):
        """A verb's ます-stem, which Sudachi may label a noun (帰り, 休み)."""
        if word.pos == "動詞":
            return True
        polite = [Word(m) for m in self.tokenizer.tokenize(word.surface + "ます", SplitMode.C)]
        return len(polite) == 2 and polite[0].pos == "動詞" and polite[1].lemma == "ます"

    def negative_in_clause(self, start):
        for word in self.words[start:]:
            if word.pos == "補助記号":
                return False
            if word.lemma in ("ない", "ぬ") or (word.pos == "助動詞" and word.surface in ("ん", "ず")):
                return True
        return False

    def topic_wa_nai(self, start):
        """A topic は followed by ない before the clause ends, excluding the
        copula's では / じゃ, which is plain negation."""
        for index in range(start, len(self.words)):
            word = self.words[index]
            if word.pos == "補助記号":
                return False
            previous, following = self.at(index - 1), self.at(index + 1)
            if (word.surface == "は" and word.pos == "助詞" and following is not None
                    and following.lemma == "ない" and not (previous and previous.lemma == "だ")):
                return True
        return False


def passive_potential(s):
    # Passive, potential, and respectful れる / られる are all N4.
    return any(w.pos == "助動詞" and w.lemma in ("れる", "られる") for w in s.words)


def o_ni_naru(s):
    for i, w in enumerate(s.words):
        stem, ni, naru = s.at(i + 1), s.at(i + 2), s.at(i + 3)
        # A verb stem (お話し, お帰り) or a する-noun (ご出席); お茶になる is
        # just "become tea".
        if (w.pos == "接頭辞" and w.surface in PREFIXES and stem is not None
                and (s.verb_stem(stem) or (stem.pos == "名詞" and stem.pos_type == "サ変可能"))
                and ni and ni.surface == "に" and naru and naru.lemma == "なる"):
            return True
    return False


def o_kudasai(s):
    for i, w in enumerate(s.words):
        stem, kudasai = s.at(i + 1), s.at(i + 2)
        if (w.pos == "接頭辞" and w.surface in PREFIXES and stem is not None and s.verb_stem(stem)
                and kudasai and kudasai.lemma in ("くださる", "下さる")):
            return True
    return False


def honorific_verbs(s):
    for i, w in enumerate(s.words):
        if w.lemma in HONORIFIC_VERBS:
            return True
        following = s.at(i + 1)
        # ご存じ is split as ご + ぞんじ / 存じ.
        if (w.pos == "接頭辞" and w.surface in ("ご", "御") and following
                and following.surface in ("ぞんじ", "存じ", "存知")):
            return True
    return False


def te_itadaku_kudasaru(s):
    # Not the plain request ください (見てください), which is N5.
    return any(s.is_te(i - 1) and w.lemma in ("いただく", "頂く", "くださる", "下さる")
               and w.form != "命令形" for i, w in enumerate(s.words))


def te_miru(s):
    return any(s.is_te(i - 1) and w.lemma in ("みる", "見る") for i, w in enumerate(s.words))


def hodo(s):
    """Indexes of comparative ほど: not after a quantity (３キロほど)."""
    for i, w in enumerate(s.words):
        if w.surface == "ほど" and w.pos_detail == "副助詞":
            if not any(p and p.pos_detail == "数詞" for p in (s.at(i - 1), s.at(i - 2))):
                yield i


def hodo_nai(s):
    for i in hodo(s):
        previous = s.at(i - 1)
        if (previous and previous.pos in ("名詞", "代名詞", "動詞", "助動詞")
                and s.negative_in_clause(i + 1) and not s.topic_wa_nai(i + 1)):
            return True
    return False


def hodo_wa_nai(s):
    return any(s.topic_wa_nai(i + 1) for i in hodo(s))


def ba_hodo(s):
    return any(w.surface == "ば" and w.pos_detail == "接続助詞"
               and any(u.surface == "ほど" for u in s.words[i + 1:i + 4])
               for i, w in enumerate(s.words))


def dake_de_naku(s):
    for i, w in enumerate(s.words):
        copula, naku = s.at(i + 1), s.at(i + 2)
        if (w.surface in ("だけ", "ばかり") and w.pos_detail == "副助詞"
                and copula and copula.lemma == "だ" and copula.surface in ("で", "じゃ")
                and naku and naku.lemma == "ない" and naku.form.startswith("連用形")):
            return True
    return False


def beki(s):
    return any(w.pos == "助動詞" and w.lemma == "べし" for w in s.words)


def ni_tsuite(s):
    for i, w in enumerate(s.words):
        tsui, after = s.at(i + 1), s.at(i + 3)
        # 車についている is "attached to"; について is never followed by いる.
        if (w.surface == "に" and w.pos == "助詞" and tsui and tsui.surface == "つい"
                and tsui.lemma == "つく" and s.is_te(i + 2)
                and not (after and after.lemma in ("いる", "ある", "おる"))):
            return True
    return False


def ni_yotte(s):
    # 寄る ("stop by") has its own lemma.
    return any(w.surface == "に" and w.pos == "助詞" and s.at(i + 1)
               and s.at(i + 1).lemma in ("よる", "因る", "依る", "拠る")
               for i, w in enumerate(s.words))


def uchi_ni(s):
    for i, w in enumerate(s.words):
        previous, following = s.at(i - 1), s.at(i + 1)
        # After a verb or adjective; うちに after の is usually "at home".
        if (w.surface == "うち" and following and following.surface == "に" and previous
                and (previous.pos in ("動詞", "形容詞")
                     or (previous.pos == "助動詞" and previous.lemma in ("ない", "た")))
                and previous.form.startswith("連体形")):
            return True
    return False


def wake(s):
    for i, w in enumerate(s.words):
        previous, following = s.at(i - 1), s.at(i + 1)
        # わけを話す and わけがわからない use わけ as "reason" after no predicate.
        if (w.surface in ("わけ", "訳") and w.pos == "名詞" and following
                and following.surface in ("だ", "です", "で", "が", "に", "じゃ", "では")
                and previous and previous.pos in ("動詞", "形容詞", "助動詞", "形状詞")):
            return True
    return False


def dokoro(s):
    return any((w.surface == "どころ" and w.pos_detail == "副助詞") or w.surface == "どころか"
               for w in s.words)


def n_desu(s):
    # の + で is 〜ので.
    return any(s.explanatory_no(i) and s.at(i + 1) and s.at(i + 1).lemma in ("です", "だ")
               and s.at(i + 1).surface != "で" for i in range(len(s.words)))


def node(s):
    for i in range(len(s.words)):
        de, after = s.at(i + 1), s.at(i + 2)
        # のではない / のでしょう / のでございます are not ので.
        if (s.explanatory_no(i) and de and de.lemma == "だ" and de.surface == "で"
                and not (after and (after.surface in ("は", "も") or after.lemma in ("ある", "ござる")))):
            return True
    return any(w.surface == "ので" for w in s.words)


def noni(s):
    return (any(s.explanatory_no(i) and s.at(i + 1) and s.at(i + 1).surface == "に"
                for i in range(len(s.words)))
            or any(w.surface == "のに" for w in s.words))


def tara(s):
    # After 読ん / 泳い the conditional is だら, which Sudachi files under だ.
    return any(w.form.startswith("仮定形") and (w.lemma == "た" or (w.lemma == "だ" and w.surface == "だら"))
               for w in s.words)


def ba(s):
    return any(not s.ba_ii_at(i) for i in s.conditional_ba())


def ba_ii(s):
    return any(s.ba_ii_at(i) for i in s.conditional_ba())


def nara(s):
    # The copula's conditional; さようなら and ならない are other words.
    return any(w.lemma == "だ" and w.surface == "なら" for w in s.words)


def kedo(s):
    return any(w.surface in ("けど", "けれど", "けれども") and w.pos_detail == "接続助詞" for w in s.words)


def volitional(s):
    # Verbs only: ましょう is the volitional of ます and stays N5.
    return any(w.pos == "動詞" and w.form == "意志推量形" for w in s.words)


def darou(s):
    # でしょう comes from です and stays N5.
    return any(w.lemma == "だ" and w.form == "意志推量形" for w in s.words)


def kamo_shirenai(s):
    return any(w.surface == "か" and s.at(i + 1) and s.at(i + 1).surface == "も"
               and s.at(i + 2) and s.at(i + 2).lemma in ("しれる", "知れる")
               for i, w in enumerate(s.words))


def te_shimau(s):
    return s.after_te(("しまう", "仕舞う")) or any(w.lemma in ("ちゃう", "じゃう") for w in s.words)


def te_oku(s):
    return s.after_te(("おく", "置く"))


def te_ageru_kureru_morau(s):
    return s.after_te(("あげる", "くれる", "もらう", "貰う"))


def causative(s):
    return any(w.pos == "助動詞" and w.lemma in ("せる", "させる")
               and not (s.at(i - 1) and s.at(i - 1).lemma in LEXICAL_CAUSATIVES)
               for i, w in enumerate(s.words))


def made_ni(s):
    return any(w.surface == "まで" and s.at(i + 1) and s.at(i + 1).surface == "に"
               for i, w in enumerate(s.words))


def hou_ga_ii(s):
    for i, w in enumerate(s.words):
        previous = s.at(i - 1)
        # After a verb (寝たほうがいい); のほうがいい is an N5 comparison.
        if (w.surface in ("ほう", "方") and previous and previous.pos in ("動詞", "助動詞")
                and s.at(i + 1) and s.at(i + 1).surface == "が"
                and s.at(i + 2) and s.at(i + 2).lemma in ("いい", "よい", "良い")):
            return True
    return False


def naide(s):
    for i, w in enumerate(s.words):
        following, after = s.at(i + 1), s.at(i + 2)
        # 〜ないでください is N5.
        if (w.lemma == "ない" and w.pos == "助動詞" and following and following.surface == "で"
                and following.pos_detail == "接続助詞"
                and not (after and after.lemma in ("くださる", "下さる"))):
            return True
    return False


def rashii(s):
    # The auxiliary only; かわいらしい is an adjective.
    return any(w.lemma == "らしい" and w.pos == "助動詞" for w in s.words)


def mitai(s):
    return any(w.surface == "みたい" and w.pos_detail == "助動詞語幹" for w in s.words)


def kana(s):
    return any((w.surface == "か" and w.pos_detail == "終助詞" and s.at(i + 1)
                and s.at(i + 1).surface in ("な", "なあ")) or w.surface == "かしら"
               for i, w in enumerate(s.words))


RULES = {
    "passive-potential": passive_potential,
    "o-ni-naru": o_ni_naru,
    "o-kudasai": o_kudasai,
    "honorific-verbs": honorific_verbs,
    "te-itadaku-kudasaru": te_itadaku_kudasaru,
    "te-miru": te_miru,
    "hodo-nai": hodo_nai,
    "hodo-wa-nai": hodo_wa_nai,
    "ba-hodo": ba_hodo,
    "dake-de-naku": dake_de_naku,
    "beki": beki,
    "ni-tsuite": ni_tsuite,
    "ni-yotte": ni_yotte,
    "uchi-ni": uchi_ni,
    "wake": wake,
    "dokoro": dokoro,
    "n-desu": n_desu,
    "node": node,
    "noni": noni,
    "tara": tara,
    "ba": ba,
    "ba-ii": ba_ii,
    "nara": nara,
    "kedo": kedo,
    "volitional": volitional,
    "darou": darou,
    "kamo-shirenai": kamo_shirenai,
    "te-shimau": te_shimau,
    "te-oku": te_oku,
    "te-ageru-kureru-morau": te_ageru_kureru_morau,
    "causative": causative,
    "made-ni": made_ni,
    "hou-ga-ii": hou_ga_ii,
    "naide": naide,
    "rashii": rashii,
    "mitai": mitai,
    "kana": kana,
}


def matched_patterns(tokenizer, text):
    sentence = Sentence(tokenizer, text)
    return [pattern for pattern, rule in RULES.items() if rule(sentence)]
