#!/usr/bin/env python3
"""Generate conservative kana/kanji variants; never infer equivalence from sounds alone."""
import argparse
import gzip
import hashlib
import importlib.metadata
import json
import re
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
URL = "https://www.edrdg.org/pub/Nihongo/JMdict_e.gz"
OUTPUT = ROOT / "data/spelling-variants"
HAN = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")
ANNOTATION = re.compile(r"\{([^{}|]+)\|([^{}|]+)\}")


def hira(text):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


def annotated_parts(furigana):
    result, cursor, offset = [], 0, 0
    for match in ANNOTATION.finditer(furigana):
        literal = furigana[cursor:match.start()]
        if literal:
            result.append((offset, offset + len(literal), literal, literal))
            offset += len(literal)
        surface, reading = match.groups()
        result.append((offset, offset + len(surface), surface, reading))
        offset += len(surface)
        cursor = match.end()
    literal = furigana[cursor:]
    if literal:
        result.append((offset, offset + len(literal), literal, literal))
    return result


def slice_reading(segments, start, end):
    result = ""
    for left, right, surface, reading in segments:
        lo, hi = max(left, start), min(right, end)
        if lo >= hi:
            continue
        if surface == reading:
            result += reading[lo-left:hi-left]
        elif lo == left and hi == right:
            result += reading
        else:
            return None  # Never split a supplied kanji annotation.
    return hira(result)


def utf16_offset(text, position):
    return len(text[:position].encode("utf-16-le")) // 2


def load_dictionary(path):
    entries, by_reading = {}, defaultdict(list)
    with gzip.open(path, "rb") as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != "entry":
                continue
            sid = element.findtext("ent_seq")
            spellings = [k.findtext("keb") for k in element.findall("k_ele") if not k.findall("ke_inf")]
            senses = element.findall("sense")
            restricted = any(s.findall("stagk") or s.findall("stagr") for s in senses)
            pos = " ".join(p.text or "" for s in senses for p in s.findall("pos"))
            record = {"id": sid, "spellings": spellings, "restricted": restricted, "pos": pos}
            entries[sid] = record
            for reading in element.findall("r_ele"):
                if reading.find("re_nokanji") is not None or reading.findall("re_inf"):
                    continue
                kana = hira(reading.findtext("reb", ""))
                allowed = [r.text for r in reading.findall("re_restr")]
                pairs = [word for word in spellings if not allowed or word in allowed]
                by_reading[kana].append({**record, "spellings": pairs})
            element.clear()
    return entries, by_reading


def compatible(pos, token_pos):
    if token_pos == "副詞":
        return re.search(r"\badverb\b", pos) is not None
    if token_pos == "代名詞":
        return re.search(r"\bpronoun\b", pos) is not None
    if token_pos == "動詞":
        return re.search(r"\bverb\b", pos) is not None and "auxiliary" not in pos
    if token_pos == "形容詞":
        return re.search(r"\badjective\b", pos) is not None
    return re.search(r"\bnoun\b", pos) is not None and "pronoun" not in pos


def unambiguous_entry(matches):
    if len({entry["id"] for entry in matches}) != 1 or any(entry["restricted"] for entry in matches):
        return None
    return matches[0]


def inflected_spelling(word, lemma_reading, surface_reading):
    # Retain all kana after the dictionary headword's kanji prefix. This changes
    # spelling, not conjugation: はずさ → 外さ, のん → 飲ん, たべ → 食べ.
    common = 0
    while common < min(len(word), len(lemma_reading)) and hira(word[-common-1]) == lemma_reading[-common-1]:
        common += 1
    root = lemma_reading[:-common] if common else lemma_reading
    kanji = word[:-common] if common else word
    if not root or not HAN.search(kanji) or not surface_reading.startswith(root):
        return None
    return kanji + surface_reading[len(root):]


def generate(args):
    from sudachipy import Dictionary, SplitMode

    versions = {name: importlib.metadata.version(name) for name in ("SudachiPy", "SudachiDict-core")}
    requirements = dict(line.strip().split("==") for line in (ROOT / "scripts/spelling-requirements.txt").read_text().splitlines() if line.strip())
    if versions != requirements:
        raise ValueError("Install the exact versions in scripts/spelling-requirements.txt")
    path = args.jmdict
    if args.download:
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(Request(URL, headers={"User-Agent": "tsuzuru-spelling-import/1.0"}), timeout=45) as response:
            content = response.read()
        # Validate before replacing the cache.
        if not gzip.decompress(content).startswith(b"<?xml"):
            raise ValueError("Download is not JMdict XML")
        path.write_bytes(content)
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    output = OUTPUT / "bank.json"
    if output.exists() and not args.refresh:
        previous = json.loads(output.read_text())
        if previous["sources"]["jmdict"]["sha256"] != checksum:
            raise ValueError("JMdict snapshot changed; use --refresh to intentionally regenerate and review")
    _, by_reading = load_dictionary(path)
    tokenizer = Dictionary(dict="core").create()
    candidates = json.loads((ROOT / "data/processed/sentence-candidates.json").read_text())
    alternatives = json.loads((ROOT / "data/alternatives/answers.json").read_text())
    manifest = json.loads((ROOT / "data/manifest.json").read_text())
    entries, pending = {}, []
    reviews = json.loads((OUTPUT / "reviews.json").read_text())["entries"]
    used_reviews = set()
    for candidate in candidates:
        references = [(candidate["japanese"], candidate["furiganaVariants"])]
        alternative_entry = alternatives["entries"].get(candidate["id"])
        if alternatives["sourceRevision"] == manifest["revision"] and alternative_entry and alternative_entry["sourceEnglish"] == candidate["english"] and alternative_entry["sourceJapanese"] == candidate["japanese"]:
            references += [(a["japanese"], a["furiganaVariants"]) for a in alternative_entry["alternatives"]]
        approved = []
        for japanese, readings in references:
            tokens = list(tokenizer.tokenize(japanese, SplitMode.A))
            for furigana in readings:
                segments = annotated_parts(furigana)
                if "".join(p[2] for p in segments) != japanese or HAN.search("".join(p[3] for p in segments)):
                    continue
                spans = []
                for index, token in enumerate(tokens):
                    pos = token.part_of_speech()
                    if token.is_oov() or pos[0] not in ("動詞", "形容詞", "名詞", "代名詞", "副詞") or pos[1] == "固有名詞":
                        continue
                    reading = slice_reading(segments, token.begin(), token.end())
                    if reading != hira(token.reading_form()):
                        continue
                    lemma_tokens = list(tokenizer.tokenize(token.dictionary_form(), SplitMode.A))
                    if len(lemma_tokens) != 1 or lemma_tokens[0].is_oov():
                        continue
                    lemma_reading = hira(lemma_tokens[0].reading_form())
                    matches = [entry for entry in by_reading.get(lemma_reading, []) if compatible(entry["pos"], pos[0])]
                    if HAN.search(token.surface()):
                        matches = [entry for entry in matches if token.dictionary_form() in entry["spellings"]]
                    ids = {entry["id"] for entry in matches}
                    review_key = (candidate["id"], japanese, furigana, utf16_offset(japanese, token.begin()), utf16_offset(japanese, token.end()))
                    selected_reviews = [(i, review) for i, review in enumerate(reviews) if (review["sentenceId"], review["sourceJapanese"], review["furigana"], review["start"], review["end"]) == review_key]
                    review = None
                    if selected_reviews:
                        if len(selected_reviews) != 1:
                            raise ValueError("Duplicate spelling review")
                        review_index, review = selected_reviews[0]
                        if not review["reviewer"].strip() or not review["note"].strip() or review["sourceEnglish"] != candidate["english"] or review["surface"] != token.surface() or review["reading"] != reading:
                            raise ValueError(f"Invalid or stale review: {review_key}")
                        matches = [entry for entry in matches if entry["id"] == review["dictionaryEntryId"]]
                        if len(matches) != 1:
                            raise ValueError(f"Reviewed lexeme is not dictionary-backed: {review_key}")
                        used_reviews.add(review_index)
                    if not review and unambiguous_entry(matches) is None:
                        if any(inflected_spelling(word, lemma_reading, reading) not in (None, token.surface()) for entry in matches for word in entry["spellings"]):
                            pending.append({"sentenceId": candidate["id"], "sourceEnglish": candidate["english"], "sourceJapanese": japanese, "furigana": furigana, "surface": token.surface(), "start": utf16_offset(japanese, token.begin()), "end": utf16_offset(japanese, token.end()), "reading": reading, "dictionaryEntryIds": sorted(ids), "reason": "ambiguous lexeme or sense-specific spelling"})
                        continue
                    entry = matches[0]
                    spellings = []
                    for word in entry["spellings"]:
                        variant = inflected_spelling(word, lemma_reading, reading)
                        if review and variant not in review["spellings"]:
                            continue
                        if not variant or variant == token.surface():
                            continue
                        changed = japanese[:token.begin()] + variant + japanese[token.end():]
                        changed_tokens = list(tokenizer.tokenize(changed, SplitMode.A))
                        # A whole-sentence round trip must preserve lexical identity,
                        # pronunciation, POS, and conjugation of every token.
                        # A pronoun's written form may have another default
                        # tokenizer reading (私 -> ワタクシ). JMdict's permitted
                        # spelling/reading pair above still verifies the supplied
                        # pronunciation. Other tokens must keep their readings.
                        if len(changed_tokens) != len(tokens) or any((a.normalized_form() != b.normalized_form() and not (review and position == index)) or (a.reading_form() != b.reading_form() and not (position == index and pos[0] == "代名詞")) or a.part_of_speech() != b.part_of_speech() for position, (a, b) in enumerate(zip(tokens, changed_tokens))):
                            continue
                        spellings.append(variant)
                    if spellings:
                        span = {"start": utf16_offset(japanese, token.begin()), "end": utf16_offset(japanese, token.end()), "surface": token.surface(), "reading": reading, "spellings": sorted(set(spellings)), "dictionaryEntryId": entry["id"], "lemma": token.normalized_form(), "method": "reviewed-context" if review else "unambiguous-dictionary"}
                        if review:
                            if sorted(set(review["spellings"])) != span["spellings"]:
                                raise ValueError(f"Reviewed spelling failed dictionary/inflection validation: {review_key}")
                            span["reviewer"], span["note"] = review["reviewer"], review["note"]
                        spans.append(span)
                    elif review:
                        raise ValueError(f"Reviewed spelling has no validated variants: {review_key}")
                if spans:
                    approved.append({"japanese": japanese, "furigana": furigana, "spans": spans})
        if approved:
            entries[candidate["id"]] = {"sourceEnglish": candidate["english"], "sourceJapanese": candidate["japanese"], "references": approved}
    if used_reviews != set(range(len(reviews))):
        raise ValueError("Some spelling reviews no longer match the source or dictionary; update reviews before regenerating")
    bank = {"version": 1, "license": "CC-BY-SA-4.0", "sourceRevision": manifest["revision"], "attribution": "Spelling data derived from JMdict (EDRDG), SudachiDict (Works Applications, UniDic, NEologd), and the retained OpenJLPT/Tatoeba references. See data/spelling-variants/README.md.", "sources": {"jmdict": {"url": URL, "sha256": checksum, "license": "https://www.edrdg.org/edrdg/licence.html"}, "tools": versions}, "entries": entries}
    # Deduplicate reports caused by multiple reference readings.
    pending = list({json.dumps(item, ensure_ascii=False, sort_keys=True): item for item in pending}.values())
    report = {"sourceRevision": manifest["revision"], "jmdictSha256": checksum, "cases": pending}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for destination, value in ((output, bank), (ROOT / ".cache/spelling-review.json", report)):
        text = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not destination.exists() or destination.read_text() != text:
                raise ValueError(f"Generated {destination.name} is stale")
        else:
            destination.write_text(text)
    count = sum(len(r["spans"]) for e in entries.values() for r in e["references"])
    print(f"{len(entries)} sentences; {count} approved spelling spans; {len(pending)} cases awaiting review")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jmdict", type=Path, default=ROOT / ".cache/spelling-jmdict_e.gz")
    parser.add_argument("--download", action="store_true", help="Download the current official JMdict snapshot")
    parser.add_argument("--refresh", action="store_true", help="Allow an intentional dictionary snapshot update")
    parser.add_argument("--check", action="store_true", help="Verify reproducibility without writing generated data")
    generate(parser.parse_args())
