#!/usr/bin/env python3
"""Grade each sentence by the vocabulary it uses, with the Sudachi spelling-tools environment.

A sentence's level is the harder of its vocabulary level and its grammar level.
The vocabulary level is the highest JLPT level among its content words, looked
up in the OpenJLPT vocabulary lists plus a small reviewed supplement for common
words the lists lack. An unlisted word written with kanji counts as above every
level; unlisted kana words (mostly loanwords), names, and numerals do not raise
the level. The grammar level is the highest level among reviewed grammar
patterns found in the sentence (scripts/grammar_patterns.py). Run through
`bun run levels:generate` or `levels:check`.
"""
import argparse
import json
import re
from pathlib import Path

from sudachipy import Dictionary, SplitMode

from grammar_patterns import RULES, matched_patterns

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ["N5", "N4", "N3", "N2", "N1"]
CONTENT = {"名詞", "代名詞", "動詞", "形容詞", "形状詞", "副詞", "連体詞", "接続詞", "感動詞"}
# Names and numerals are not vocabulary a learner is expected to know by level.
SKIPPED = {"固有名詞", "数詞"}
KANA_ONLY = re.compile(r"^[\u3041-\u309f\u30a0-\u30ffー]+$")
KANJI = re.compile(r"[\u3400-\u9fff]")
HONORIFIC = ("お", "ご", "御")


def hiragana(text):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


class Vocabulary:
    """Lowest JLPT level index for each way a listed word can appear."""

    def __init__(self, tokenizer, rows):
        self.tokenizer = tokenizer
        self.words = {}       # exact list spellings: 飲む, できる
        self.variants = {}    # Sudachi-normalized spellings and お-less forms: 終る → 終わる, お風呂 → 風呂
        self.readings = {}    # readings, for words a sentence writes in kana
        self.kana_words = {}  # kana-only entries, for kanji spellings: できる ← 出来る
        for index, word, reading in rows:
            self._add(self.words, word, index)
            self._add(self.readings, reading, index)
            if KANA_ONLY.match(word):
                self._add(self.kana_words, hiragana(word), index)
            tokens = list(tokenizer.tokenize(word, SplitMode.C))
            if len(tokens) == 1:
                self._add(self.variants, tokens[0].normalized_form(), index)
            if word.startswith(HONORIFIC) and KANJI.search(word[1:]):
                self._add(self.variants, word[1:], index)

    @staticmethod
    def _add(table, key, index):
        table[key] = min(table.get(key, index), index)

    def reading_of(self, word):
        tokens = list(self.tokenizer.tokenize(word, SplitMode.C))
        return hiragana("".join(token.reading_form() for token in tokens))

    def level(self, morpheme):
        forms = (morpheme.dictionary_form(), morpheme.normalized_form(), morpheme.surface())
        for table in (self.words, self.variants):
            found = [table[form] for form in forms if form in table]
            if found:
                return min(found)
        surface = morpheme.surface()
        # A reading identifies a word only through its spelling class: kana
        # in the sentence matches readings, and a kanji spelling matches only
        # entries the lists themselves write in kana, never a kanji homophone.
        if KANA_ONLY.match(surface):
            found = [self.readings[form] for form in (morpheme.dictionary_form(), surface)
                     if form in self.readings]
            return min(found) if found else None
        reading = self.reading_of(morpheme.dictionary_form())
        return self.kana_words.get(reading)


def list_rows(snapshot):
    for index, level in enumerate(LEVELS):
        for row in json.loads((snapshot / f"data/json/vocab/{level.lower()}.json").read_text()):
            yield index, row["word"], row["reading"]


def supplement_rows(supplement, lists):
    """Reviewed levels for common words absent from the lists. Every entry
    needs a reason and reviewer, and must not override a word the lists
    already reach, by any spelling."""
    if supplement.get("version") != 1:
        raise ValueError("Unsupported sentence-level supplement version.")
    rows = []
    for entry in supplement["entries"]:
        word, reading = entry.get("word", ""), entry.get("reading", "")
        if (not word or not KANA_ONLY.match(reading) or entry.get("level") not in LEVELS
                or not entry.get("reason", "").strip() or not entry.get("reviewer", "").strip()):
            raise ValueError(f"Invalid supplement entry: {word or entry}")
        tokens = list(lists.tokenizer.tokenize(word, SplitMode.C))
        if word in lists.words or (len(tokens) == 1 and lists.level(tokens[0]) is not None):
            raise ValueError(f"Supplement entry is already listed by OpenJLPT: {word}")
        rows.append((LEVELS.index(entry["level"]), word, reading))
    return rows


def vocabulary_levels(tokenizer, snapshot, supplement=None):
    rows = list(list_rows(snapshot))
    if supplement:
        rows += supplement_rows(supplement, Vocabulary(tokenizer, rows))
    return Vocabulary(tokenizer, rows)


def content_words(tokenizer, text):
    previous = None
    for morpheme in tokenizer.tokenize(text, SplitMode.C):
        pos = morpheme.part_of_speech()
        # A counter after a numeral (３時, 二人) belongs to the number, not to
        # the standalone noun it is spelled like (時 "time").
        counter = (pos[2] == "助数詞可能" and previous is not None
                   and previous.part_of_speech()[1] == "数詞")
        if pos[0] in CONTENT and pos[1] not in SKIPPED and not counter:
            yield morpheme
        previous = morpheme


def word_levels(tokenizer, vocabulary, text):
    """Level each content word. An unlisted compound falls back to its listed
    parts, so joining words cannot hide a harder one."""
    words = []
    for morpheme in content_words(tokenizer, text):
        level = vocabulary.level(morpheme)
        if level is None:
            parts = [vocabulary.level(part) for part in morpheme.split(SplitMode.A)]
            listed = [part for part in parts if part is not None]
            level = max(listed) if len(parts) > 1 and listed else None
        words.append({
            "surface": morpheme.surface(),
            "lemma": morpheme.dictionary_form(),
            "level": None if level is None else LEVELS[level],
        })
    return words


def unlisted_kanji(word):
    return word["level"] is None and KANJI.search(word["surface"]) is not None


def sentence_level(words):
    ranks = [LEVELS.index(word["level"]) for word in words if word["level"]]
    # An unknown kanji word is treated as harder than any listed level.
    if any(unlisted_kanji(word) for word in words):
        ranks.append(len(LEVELS) - 1)
    return LEVELS[max(ranks, default=0)]


def limiting_words(words, level):
    """The words that set a sentence's level, so each grade can be explained."""
    if level == "N5":
        return []
    return [word for word in words
            if word["level"] == level or (level == LEVELS[-1] and unlisted_kanji(word))]


def grammar_levels(snapshot, patterns):
    """Pattern id to level index. Every pattern needs a rule, a reviewer, and
    a level matching each OpenJLPT grammar entry it cites."""
    if patterns.get("version") != 1:
        raise ValueError("Unsupported grammar pattern version.")
    openjlpt = {}
    for level in LEVELS:
        for row in json.loads((snapshot / f"data/json/grammar/{level.lower()}.json").read_text()):
            openjlpt[row["id"]] = row["level"]
    levels = {}
    for entry in patterns["patterns"]:
        pattern = entry.get("id", "")
        if pattern not in RULES or pattern in levels:
            raise ValueError(f"Grammar pattern without a unique rule: {pattern or entry}")
        if entry.get("level") not in LEVELS or not entry.get("reviewer", "").strip():
            raise ValueError(f"Invalid grammar pattern entry: {pattern}")
        cited = entry.get("openjlpt") or []
        if not cited or any(openjlpt.get(source) != entry["level"] for source in cited):
            raise ValueError(f"Grammar pattern level does not match OpenJLPT: {pattern}")
        levels[pattern] = LEVELS.index(entry["level"])
    if set(levels) != set(RULES):
        raise ValueError(f"Grammar rules missing from the pattern list: {sorted(set(RULES) - set(levels))}")
    return levels


def found_grammar(patterns, found):
    """Grammar patterns found, with levels, hardest first."""
    return sorted(({"pattern": p, "level": LEVELS[patterns[p]]} for p in found),
                  key=lambda row: -LEVELS.index(row["level"]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    tokenizer = Dictionary(dict="core").create()
    supplement = json.loads((ROOT / "data/sentence-levels/supplement.json").read_text())
    try:
        vocabulary = vocabulary_levels(tokenizer, ROOT / manifest["snapshotPath"], supplement)
    except ValueError as error:
        raise SystemExit(f"{error} Update data/sentence-levels/supplement.json.") from error
    pattern_file = json.loads((ROOT / "data/sentence-levels/grammar-patterns.json").read_text())
    try:
        patterns = grammar_levels(ROOT / manifest["snapshotPath"], pattern_file)
    except ValueError as error:
        raise SystemExit(f"{error} Update data/sentence-levels/grammar-patterns.json.") from error
    candidates = json.loads((ROOT / "data/processed/sentence-candidates.json").read_text())
    entries = {}
    for candidate in candidates:
        words = word_levels(tokenizer, vocabulary, candidate["japanese"])
        grammar = found_grammar(patterns, matched_patterns(tokenizer, candidate["japanese"]))
        vocabulary_level = sentence_level(words)
        level = max([vocabulary_level, *(row["level"] for row in grammar)], key=LEVELS.index)
        entries[candidate["id"]] = {
            "sourceJapanese": candidate["japanese"],
            "level": level,
            "limitingWords": limiting_words(words, level),
            # Grammar patterns that set the level, so each grade can be explained.
            "limitingGrammar": [row for row in grammar if level != "N5" and row["level"] == level],
        }
    bank = {
        "version": 1,
        "sourceRevision": manifest["revision"],
        "method": "Harder of the vocabulary level and the grammar level. Vocabulary: highest level among Sudachi content words, from OpenJLPT and the reviewed supplement; unlisted kanji words count as N1, while unlisted kana words, names, and numerals do not raise the level. Grammar: highest level among the reviewed patterns found.",
        "entries": dict(sorted(entries.items())),
    }
    output = ROOT / "data/sentence-levels/bank.json"
    content = json.dumps(bank, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not output.exists() or output.read_text() != content:
            raise SystemExit("Sentence levels are stale; run levels:generate.")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content)
    counts = {level: 0 for level in LEVELS}
    for entry in entries.values():
        counts[entry["level"]] += 1
    print(", ".join(f"{level} {count}" for level, count in counts.items()))


if __name__ == "__main__":
    main()
