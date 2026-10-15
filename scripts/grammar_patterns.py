"""Detect reviewed JLPT grammar patterns in a sentence from Sudachi's words.

Rules work on words and grammatical labels rather than text, so 〜って does not
match every て-form (入って) and 〜まい does not match かまいません. Each rule's
id must appear in data/sentence-levels/grammar-patterns.json, which gives its
level and OpenJLPT entries.
"""
from sudachipy import SplitMode

PREFIXES = ("お", "ご", "御")
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
}


def matched_patterns(tokenizer, text):
    sentence = Sentence(tokenizer, text)
    return [pattern for pattern, rule in RULES.items() if rule(sentence)]
