#!/usr/bin/env python3
"""Supply furigana for upstream sentences that have none, without guessing.

A sentence is annotated only when every word written with kanji has exactly one
reading in JMdict for its spelling, Sudachi reads it the same way, and the
reading splits unambiguously across the word's kanji and kana. Compounds absent
from JMdict may be annotated part by part under the same rule. Anything else
stays without furigana and out of practice. Kanji-free sentences need no
annotation. Run through `bun run furigana:generate` or `furigana:check`.
"""
import argparse
import collections
import gzip
import hashlib
import importlib.metadata
import importlib.util
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from sudachipy import Dictionary, SplitMode

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/generated-furigana/furigana.json"
KANJI = re.compile(r"[㐀-鿿豈-﫿々]")
KANA = re.compile(r"[ぁ-ゟァ-ヿ]")


def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def hiragana(text):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


def jmdict_readings(path):
    """Every reading JMdict allows for each kanji spelling."""
    readings = collections.defaultdict(set)
    for _, element in ET.iterparse(gzip.open(path), events=("end",)):
        if element.tag != "entry":
            continue
        spellings = [k.findtext("keb") for k in element.findall("k_ele")]
        for r in element.findall("r_ele"):
            if r.find("re_nokanji") is not None:
                continue
            restricted = [x.text for x in r.findall("re_restr")]
            for spelling in restricted or spellings:
                readings[spelling].add(hiragana(r.findtext("reb")))
        element.clear()
    return readings


def runs(text):
    """Split text into runs: kanji, kana, or other characters."""
    result = []
    for char in text:
        kind = "kanji" if KANJI.match(char) else "kana" if KANA.match(char) else "other"
        if result and result[-1][0] == kind:
            result[-1][1] += char
        else:
            result.append([kind, char])
    return result


def align(surface, reading):
    """Readings for each kanji run, or None when the split is ambiguous: lazy
    and greedy matching must agree (振り仮名 must not shift kana between runs)."""
    parts = runs(surface)
    results = []
    for quantifier in ("+?", "+"):
        pattern = "".join(f"(.{quantifier})" if kind == "kanji" else re.escape(hiragana(text))
                          for kind, text in parts)
        match = re.fullmatch(pattern, reading)
        if not match:
            return None
        results.append(match.groups())
    if results[0] != results[1]:
        return None
    readings = iter(results[0])
    return [(text, next(readings)) if kind == "kanji" else (text, None) for kind, text in parts]


def annotate_word(morpheme, readings, tokenizer):
    """Furigana for one kanji word, or None when its reading is not certain."""
    surface, lemma = morpheme.surface(), morpheme.dictionary_form()
    spoken = hiragana(morpheme.reading_form())
    if surface in readings:
        options = readings[surface]
        if options != {spoken}:
            return None
    else:
        # An inflected word: the dictionary form must have one reading, and it
        # must give each kanji run the same reading as the inflected form.
        options = readings.get(lemma, set())
        if len(options) != 1:
            return None
        (lemma_reading,) = options
        lemma_spoken = hiragana("".join(m.reading_form() for m in tokenizer.tokenize(lemma, SplitMode.C)))
        if lemma_spoken != lemma_reading:
            return None
        lemma_parts, surface_parts = align(lemma, lemma_reading), align(surface, spoken)
        if lemma_parts is None or surface_parts is None:
            return None
        lemma_kanji = [r for _, r in lemma_parts if r is not None]
        surface_kanji = [r for _, r in surface_parts if r is not None]
        if lemma_kanji[:len(surface_kanji)] != surface_kanji:
            return None
    parts = align(surface, spoken)
    if parts is None:
        return None
    return "".join(f"{{{text}|{reading}}}" if reading else text for text, reading in parts)


def annotate(text, readings, tokenizer):
    """Furigana for a sentence, or (None, reason)."""
    if not KANJI.search(text):
        return text, None
    pieces = []
    for morpheme in tokenizer.tokenize(text, SplitMode.C):
        if not KANJI.search(morpheme.surface()):
            pieces.append(morpheme.surface())
            continue
        annotated = annotate_word(morpheme, readings, tokenizer)
        if annotated is None:
            parts = list(morpheme.split(SplitMode.A))
            if len(parts) > 1:
                sub = [annotate_word(p, readings, tokenizer) if KANJI.search(p.surface()) else p.surface()
                       for p in parts]
                if all(piece is not None for piece in sub):
                    annotated = "".join(sub)
        if annotated is None:
            return None, morpheme.surface()
        pieces.append(annotated)
    return "".join(pieces), None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jmdict", type=Path, default=ROOT / ".cache/spelling-jmdict_e.gz")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    importer = load_script("fetch_learning_data", "scripts/fetch_learning_data.py")
    romaji = load_script("romaji_boundaries", "scripts/generate-romaji-boundaries.py")
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    recorded = json.loads((ROOT / "data/spelling-variants/bank.json").read_text())["sources"]
    checksum = hashlib.sha256(args.jmdict.read_bytes()).hexdigest()
    if checksum != recorded["jmdict"]["sha256"]:
        raise SystemExit("Cached JMdict differs from the snapshot recorded by the spelling bank.")
    versions = {name: importlib.metadata.version(name) for name in ("SudachiPy", "SudachiDict-core")}
    readings = jmdict_readings(args.jmdict)
    tokenizer = Dictionary(dict="core").create()
    # Upstream candidates, before any generated furigana is applied.
    _, candidates = importer.build_candidates(
        ROOT / manifest["snapshotPath"], manifest["revision"], generated={})
    entries, skipped = {}, collections.Counter()
    for candidate in candidates:
        if candidate["furiganaVariants"]:
            continue
        furigana, blocker = annotate(candidate["japanese"], readings, tokenizer)
        if furigana is None:
            skipped["uncertain reading"] += 1
            continue
        tokens = list(tokenizer.tokenize(candidate["japanese"], SplitMode.C))
        # Spacing for の + で / に needs a reviewed decision (romaji generator).
        if romaji.ambiguous_conjunctions(tokens):
            skipped["needs conjunction review"] += 1
            continue
        entries[candidate["id"]] = {"sourceJapanese": candidate["japanese"], "furigana": furigana}
    data = {
        "version": 1,
        "sourceRevision": manifest["revision"],
        "jmdict": {"url": recorded["jmdict"]["url"], "sha256": checksum},
        "tools": versions,
        "method": "Furigana for upstream sentences without any: each word written with kanji has exactly one JMdict reading for its spelling, matching Sudachi, and an unambiguous split across its kanji and kana. Applied when sentence candidates are built.",
        "entries": dict(sorted(entries.items())),
    }
    content = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != content:
            raise SystemExit("Generated furigana is stale; run furigana:generate.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(content)
    missing = sum(1 for c in candidates if not c["furiganaVariants"])
    print(f"{len(entries)} of {missing} sentences without furigana annotated; skipped: {dict(skipped)}")


if __name__ == "__main__":
    main()
