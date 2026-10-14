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


def word_boundaries(tokenizer, surface, offsets):
    tokens = list(tokenizer.tokenize(surface, SplitMode.C))
    boundaries = []
    for index, token in enumerate(tokens):
        if not index or token.begin() not in offsets:
            continue  # Never split a supplied reading annotation.
        previous = tokens[index - 1]
        pos, previous_pos = token.part_of_speech(), previous.part_of_speech()
        if (
            pos[0] == "接尾辞"
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
    bank = {}
    for candidate in candidates:
        for furigana in candidate["furiganaVariants"]:
            surface, offsets = reading_offsets(furigana)
            if surface != candidate["japanese"]:
                continue
            bank[furigana] = word_boundaries(tokenizer, surface, offsets)
    output = ROOT / "data/romaji/word-boundaries.json"
    # Compact, deterministic output keeps this generated lookup small.
    content = json.dumps(dict(sorted(bank.items())), ensure_ascii=False, separators=(",", ":")) + "\n"
    if args.check:
        if not output.exists() or output.read_text() != content:
            raise SystemExit("Romaji boundaries are stale; run romaji:generate.")
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content)
    print(f"{len(bank)} supplied readings with word boundaries")


if __name__ == "__main__":
    main()
