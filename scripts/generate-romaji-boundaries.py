#!/usr/bin/env python3
"""Precompute romaji spacing with the existing Sudachi spelling-tools environment.

Only word boundaries come from the tokenizer; pronunciations remain supplied
furigana. Run with .cache/spelling-tools/bin/python, optionally with --check.
"""
import argparse
import json
import re
from pathlib import Path

from sudachipy import Dictionary, SplitMode

ROOT = Path(__file__).resolve().parents[1]
ANNOTATION = re.compile(r"\{([^{}|]+)\|([^{}|]+)\}")


def reading_offsets(furigana):
    surface, offsets, cursor, reading_offset = "", {0: 0}, 0, 0
    for match in ANNOTATION.finditer(furigana):
        literal = furigana[cursor:match.start()]
        for char in literal:
            surface += char
            reading_offset += len(char.encode("utf-16-le")) // 2
            offsets[len(surface)] = reading_offset
        written, reading = match.groups()
        surface += written
        reading_offset += len(reading.encode("utf-16-le")) // 2
        offsets[len(surface)] = reading_offset
        cursor = match.end()
    for char in furigana[cursor:]:
        surface += char
        reading_offset += len(char.encode("utf-16-le")) // 2
        offsets[len(surface)] = reading_offset
    return surface, offsets


def ambiguous_conjunctions(tokens):
    return [
        {"start": tokens[index - 1].begin(), "end": token.end(),
         "surface": "の" + token.surface()}
        for index, token in enumerate(tokens)
        if index
        and tokens[index - 1].surface() == "の"
        and token.surface() in ("で", "に")
        and tokens[index - 1].part_of_speech()[0] == "助詞"
        and token.part_of_speech()[0] in ("助詞", "助動詞")
    ]


def reviewed_joins(candidate, tokens, review):
    hits = ambiguous_conjunctions(tokens)
    if not hits and review is None:
        return set()
    if (review is None or review.get("japanese") != candidate["japanese"]
            or review.get("english") != candidate["english"]
            or not review.get("reviewer", "").strip()):
        raise ValueError(f"Missing or stale conjunction review: {candidate['id']}")
    decisions = review.get("decisions", [])
    snapshots = [{key: decision.get(key) for key in ("start", "end", "surface")}
                 for decision in decisions]
    if snapshots != hits or any(type(d.get("join")) is not bool or
                               not d.get("reason", "").strip() for d in decisions):
        raise ValueError(f"Invalid conjunction decisions: {candidate['id']}")
    return {decision["start"] + 1 for decision in decisions if decision["join"]}


def word_boundaries(tokenizer, surface, offsets, joins=None):
    tokens = list(tokenizer.tokenize(surface, SplitMode.C))
    boundaries = []
    for index, token in enumerate(tokens):
        if not index or token.begin() not in offsets:
            continue  # Never split a supplied reading annotation.
        previous = tokens[index - 1]
        pos, previous_pos = token.part_of_speech(), previous.part_of_speech()
        # Sudachi separates で/て + も. Keep demo/temo together, but
        # leave standalone も (e.g. 手も, 何も) separate from the noun.
        compound_mo = (
            token.surface() == "も"
            and pos[0] == "助詞"
            and previous.surface() in ("で", "て")
            and previous_pos[0] in ("助詞", "助動詞")
        )
        # Join only honorific prefixes identified by the tokenizer, rather
        # than every literal お/ご that happens to precede another word.
        honorific_prefix = (
            previous_pos[0] == "接頭辞"
            and previous.surface() in ("お", "ご", "御")
            and pos[0] in ("名詞", "動詞", "形容詞", "形状詞")
        )
        if (
            compound_mo
            or honorific_prefix
            or (joins is not None and token.begin() in joins)
            # Treat the compound particle では consistently as deha.
            or (token.surface() == "は" and pos[0] == "助詞"
                and previous.surface() == "で" and previous_pos[0] in ("助詞", "助動詞"))
            or pos[0] == "接尾辞"
            or (pos[0] == "助動詞" and previous_pos[0] in ("動詞", "形容詞", "助動詞"))
            or (token.surface() == "ば" and previous_pos[5].startswith("仮定形"))
            or (token.surface() in ("て", "で") and pos[1] == "接続助詞" and previous_pos[0] in ("動詞", "形容詞", "助動詞"))
            or (previous_pos[1] == "数詞" and pos[2] == "助数詞可能")
        ):
            continue
        boundaries.append(offsets[token.begin()])
    return boundaries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    tokenizer = Dictionary(dict="core").create()
    candidates = json.loads((ROOT / "data/processed/sentence-candidates.json").read_text())
    reviews = json.loads((ROOT / "data/romaji/conjunction-reviews.json").read_text())
    review_by_id = {review["id"]: review for review in reviews}
    if len(review_by_id) != len(reviews) or not set(review_by_id).issubset({c["id"] for c in candidates}):
        raise SystemExit("Duplicate or obsolete conjunction reviews.")
    bank = {}
    for candidate in candidates:
        tokens = list(tokenizer.tokenize(candidate["japanese"], SplitMode.C))
        try:
            joins = reviewed_joins(candidate, tokens, review_by_id.get(candidate["id"]))
        except ValueError as error:
            raise SystemExit(f"{error}. Review the source text and update data/romaji/conjunction-reviews.json.") from error
        for furigana in candidate["furiganaVariants"]:
            surface, offsets = reading_offsets(furigana)
            if surface != candidate["japanese"]:
                continue
            bank[furigana] = word_boundaries(tokenizer, surface, offsets, joins)
    output = ROOT / "data/romaji/word-boundaries.json"
    # Stable, readable output makes individual boundary changes reviewable.
    content = json.dumps(dict(sorted(bank.items())), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not output.exists() or output.read_text() != content:
            raise SystemExit("Romaji boundaries are stale; run romaji:generate.")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content)
    print(f"{len(bank)} supplied readings with word boundaries")


if __name__ == "__main__":
    main()
