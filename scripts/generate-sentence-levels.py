#!/usr/bin/env python3
"""Grade each sentence by the vocabulary it uses, with the Sudachi spelling-tools environment.

A sentence's level is the highest JLPT level among its content words that
appear in the OpenJLPT vocabulary lists. Words absent from every list (names,
loanwords, rare compounds) are recorded but do not raise the level; kanji and
grammar are not graded. Run through `bun run levels:generate` or `levels:check`.
"""
import argparse
import json
import re
from pathlib import Path

from sudachipy import Dictionary, SplitMode

ROOT = Path(__file__).resolve().parents[1]
LEVELS = ["N5", "N4", "N3", "N2", "N1"]
CONTENT = {"名詞", "代名詞", "動詞", "形容詞", "形状詞", "副詞", "連体詞", "接続詞", "感動詞"}
# Names and numerals are not vocabulary a learner is expected to know by level.
SKIPPED = {"固有名詞", "数詞"}
KANA_ONLY = re.compile(r"^[\u3041-\u309f\u30a0-\u30ffー]+$")


def vocabulary_levels(snapshot):
    """Map each listed word, and separately each kana reading, to its lowest
    JLPT level index."""
    words, readings = {}, {}
    for index, level in enumerate(LEVELS):
        rows = json.loads((snapshot / f"data/json/vocab/{level.lower()}.json").read_text())
        for row in rows:
            for table, key in ((words, row["word"]), (readings, row["reading"])):
                table[key] = min(table.get(key, index), index)
    return words, readings


def listed_level(levels, morpheme):
    words, readings = levels
    forms = (morpheme.dictionary_form(), morpheme.normalized_form(), morpheme.surface())
    found = [words[form] for form in forms if form in words]
    # A reading identifies a word only when the sentence itself writes it in
    # kana; a kanji spelling must not match an easier homophone's reading.
    if not found and KANA_ONLY.match(morpheme.surface()):
        found = [readings[form] for form in (morpheme.dictionary_form(), morpheme.surface())
                 if form in readings]
    return min(found) if found else None


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


def word_levels(tokenizer, levels, text):
    """Level each content word. An unlisted compound falls back to its listed
    parts, so joining words cannot hide a harder one."""
    words = []
    for morpheme in content_words(tokenizer, text):
        level = listed_level(levels, morpheme)
        if level is None:
            parts = [listed_level(levels, part) for part in morpheme.split(SplitMode.A)]
            listed = [part for part in parts if part is not None]
            level = max(listed) if len(parts) > 1 and listed else None
        words.append({
            "surface": morpheme.surface(),
            "lemma": morpheme.dictionary_form(),
            "level": None if level is None else LEVELS[level],
        })
    return words


def sentence_level(words):
    listed = [LEVELS.index(word["level"]) for word in words if word["level"]]
    return LEVELS[max(listed, default=0)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    levels = vocabulary_levels(ROOT / manifest["snapshotPath"])
    tokenizer = Dictionary(dict="core").create()
    candidates = json.loads((ROOT / "data/processed/sentence-candidates.json").read_text())
    entries = {}
    for candidate in candidates:
        words = word_levels(tokenizer, levels, candidate["japanese"])
        level = sentence_level(words)
        entries[candidate["id"]] = {
            "sourceJapanese": candidate["japanese"],
            "level": level,
            # Only the words that set the level, so the bank stays small and
            # each grade can be explained.
            "limitingWords": [
                word for word in words if level != "N5" and word["level"] == level
            ],
        }
    bank = {
        "version": 1,
        "sourceRevision": manifest["revision"],
        "method": "Highest OpenJLPT vocabulary level among Sudachi content words; unlisted words, names, and numerals do not raise the level.",
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
